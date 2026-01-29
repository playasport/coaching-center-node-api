import { AcademyPayoutAccountModel, AcademyPayoutAccount, PayoutAccountActivationStatus, BusinessType } from '../../models/academyPayoutAccount.model';
import { razorpayRouteService } from '../common/payment/razorpayRoute.service';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { createAuditTrail } from '../common/auditTrail.service';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import { createAndSendNotification } from '../common/notification.service';
import { queueSms, queueEmail, queueWhatsApp } from '../common/notificationQueue.service';
import {
  getPayoutAccountCreatedAcademySms,
  getPayoutAccountCreatedAcademyWhatsApp,
  getPayoutAccountActivatedAcademySms,
  getPayoutAccountActivatedAcademyWhatsApp,
  getPayoutAccountNeedsClarificationAcademySms,
  getPayoutAccountNeedsClarificationAcademyWhatsApp,
  getPayoutAccountRejectedAcademySms,
  getPayoutAccountRejectedAcademyWhatsApp,
  getBankDetailsUpdatedAcademySms,
  getBankDetailsUpdatedAcademyWhatsApp,
  EmailTemplates,
  EmailSubjects,
  getPayoutAccountCreatedAcademyEmailText,
  getBankDetailsUpdatedAcademyEmailText,
  getPayoutAccountActivatedAcademyEmailText,
  getPayoutAccountActionRequiredAcademyEmailText,
  getPayoutAccountRejectedAcademyEmailText,
  getPayoutAccountCreatedAcademyPush,
  getBankDetailsUpdatedAcademyPush,
  getPayoutAccountActivatedAcademyPush,
  getPayoutAccountActionRequiredAcademyPush,
  getPayoutAccountRejectedAcademyPush,
} from '../common/notificationMessages';
import { UserModel } from '../../models/user.model';

export interface CreatePayoutAccountInput {
  kyc_details: {
    legal_business_name: string;
    business_type: BusinessType;
    contact_name: string;
    email: string;
    phone: string;
    pan: string;
    gst?: string | null;
    address: {
      street1: string;
      street2?: string | null;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  bank_information?: {
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    bank_name?: string | null;
  } | null;
  stakeholder?: {
    name: string;
    email: string;
    phone: string;
    relationship: 'director' | 'proprietor' | 'partner' | 'authorised_signatory';
    kyc: {
      pan?: string | null;
      aadhaar?: string | null;
    };
  } | null;
}

export interface UpdateBankDetailsInput {
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  bank_name?: string | null;
}

/**
 * Sanitize payout account response - remove internal fields
 * Removes: _id, razorpay_account_id, user, stakeholder_id, metadata, __v
 * Maps: product_configuration_status -> ready_for_payout (with value mapping)
 */
const sanitizePayoutAccountResponse = (account: any): any => {
  if (!account) return null;
  
  // Convert to plain object if it's a Mongoose document
  const accountObj = account.toObject ? account.toObject() : account;
  
  // Remove unwanted fields
  const { _id, razorpay_account_id, user, stakeholder_id, metadata, __v, product_configuration_status, product_configuration_id, ...sanitized } = accountObj;
  
  // Map old field name to new field name and convert values
  if (product_configuration_status !== undefined) {
    // Map 'configured' -> 'ready', keep 'pending' as is
    sanitized.ready_for_payout = product_configuration_status === 'configured' ? 'ready' : product_configuration_status;
  }
  
  // Also remove if nested in any way
  if (sanitized.kyc_details && sanitized.kyc_details.metadata) {
    delete sanitized.kyc_details.metadata;
  }
  if (sanitized.bank_information && sanitized.bank_information.metadata) {
    delete sanitized.bank_information.metadata;
  }
  
  return sanitized;
};

/**
 * Get payout account for an academy user
 */
export const getPayoutAccount = async (userId: string, options?: { syncStatus?: boolean }): Promise<AcademyPayoutAccount | null> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    const account = await AcademyPayoutAccountModel.findOne({
      user: userObjectId,
      is_active: true,
    })
      .exec();

    if (!account) {
      return null;
    }

    // Auto-sync status from Razorpay if enabled (default: true)
    if (options?.syncStatus !== false) {
      try {
        await syncAccountStatus(account.id);
        // Reload account after sync
        await account.populate('user');
        const updatedAccount = await AcademyPayoutAccountModel.findOne({
          id: account.id,
          is_active: true,
        })
          .lean()
          .exec();
        return updatedAccount ? sanitizePayoutAccountResponse(updatedAccount) : null;
      } catch (syncError: any) {
        // Log sync error but don't fail the request
        logger.warn('Failed to sync account status, returning cached status:', {
          error: syncError.message || syncError,
          accountId: account.id,
        });
        // Return account with current status
        return sanitizePayoutAccountResponse(account);
      }
    }

    return sanitizePayoutAccountResponse(account);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error fetching payout account:', {
      error: error.message || error,
      userId,
    });
    throw new ApiError(500, 'Failed to fetch payout account');
  }
};

/**
 * Create payout account for an academy user
 */
export const createPayoutAccount = async (
  userId: string,
  data: CreatePayoutAccountInput,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<AcademyPayoutAccount> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Check if account already exists
    const existingAccount = await AcademyPayoutAccountModel.findOne({
      user: userObjectId,
      is_active: true,
    });

    if (existingAccount) {
      throw new ApiError(400, 'Payout account already exists. Each academy user can have only one payout account.');
    }

    // Get user details for notifications
    const user = await UserModel.findById(userObjectId).lean().exec();
    if (!user) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Prepare KYC data for Razorpay
    // Note: For individual business type, PAN should NOT be in legal_info during account creation
    // PAN will be added via stakeholder creation instead
    const razorpayKycData = {
      email: data.kyc_details.email,
      phone: data.kyc_details.phone,
      type: 'route' as const,
      legal_business_name: data.kyc_details.legal_business_name,
      business_type: data.kyc_details.business_type,
      contact_name: data.kyc_details.contact_name,
      profile: {
        category: 'education', // Default category for coaching centers
        subcategory: 'coaching', // Valid subcategory for education category
        addresses: {
          registered: {
            street1: data.kyc_details.address.street1,
            street2: data.kyc_details.address.street2 || undefined,
            city: data.kyc_details.address.city,
            state: data.kyc_details.address.state,
            postal_code: data.kyc_details.address.postal_code,
            country: data.kyc_details.address.country || 'IN',
          },
        },
      },
      legal_info: {
        // PAN is now mandatory for all business types (including individual)
        // However, for individual type, Razorpay doesn't require PAN in legal_info during account creation
        // PAN will be used for stakeholder creation instead
        // For other types, PAN is included in legal_info
        ...(data.kyc_details.business_type !== BusinessType.INDIVIDUAL && {
          pan: data.kyc_details.pan, // PAN is guaranteed to exist (validation enforces it)
          ...(data.kyc_details.gst && { gst: data.kyc_details.gst }),
        }),
      },
    };

    // Create Linked Account in Razorpay
    let razorpayAccount;
    try {
      razorpayAccount = await razorpayRouteService.createLinkedAccount(razorpayKycData);
    } catch (error: any) {
      logger.error('Failed to create Razorpay Linked Account:', {
        error: error.message || error,
        userId,
      });
      throw new ApiError(500, `Failed to create Razorpay account: ${error.message || 'Unknown error'}`);
    }

    // Prepare stakeholder data for queue (will be processed in background after account is saved)
    // PAN is now mandatory for all business types, so stakeholder can always be created
    let stakeholderId: string | null = null; // Will be updated by worker after creation
    
        // Prepare stakeholder data (will be enqueued after account is saved)
        let stakeholderDataToEnqueue: {
          name: string;
          email: string;
          phone: string;
          relationship: 'director' | 'proprietor' | 'partner' | 'authorised_signatory';
          kyc: {
            pan: string;
            aadhaar?: string;
          };
          address?: {
            street?: string;
            city?: string;
            state?: string;
            postal_code?: string;
            country?: string;
          };
        } | null = null;
    
    let autoCreated = false;
    
    // Determine if we should create stakeholder
    const shouldCreateStakeholder = 
      data.stakeholder || // Explicitly provided
      data.kyc_details.pan; // PAN is mandatory, so stakeholder can be auto-created
    
    if (shouldCreateStakeholder) {
      if (data.stakeholder) {
        // Use provided stakeholder data
        // PAN is required for stakeholder, check if provided
        if (data.stakeholder.kyc.pan) {
          stakeholderDataToEnqueue = {
            name: data.stakeholder.name, // Must match PAN card name exactly
            email: data.stakeholder.email,
            phone: data.stakeholder.phone,
            relationship: data.stakeholder.relationship,
            kyc: {
              pan: data.stakeholder.kyc.pan,
              ...(data.stakeholder.kyc.aadhaar && { aadhaar: data.stakeholder.kyc.aadhaar }),
            },
            // Note: Address not included for explicitly provided stakeholder
            // If needed, can be added to validation schema
          };
          autoCreated = false;
        } else {
          logger.warn('Stakeholder provided but PAN is missing, skipping stakeholder creation:', {
            accountId: razorpayAccount.id,
          });
        }
      } else {
        // Auto-create stakeholder using account owner's details
        // PAN is now mandatory for all business types (enforced by validation)
        // For individual: use 'proprietor' relationship
        // For others: use 'authorised_signatory' as default
        const relationship = data.kyc_details.business_type === BusinessType.INDIVIDUAL 
          ? 'proprietor' 
          : 'authorised_signatory';
        
        // PAN is guaranteed to exist (validation enforces it)
        if (data.kyc_details.pan) {
          stakeholderDataToEnqueue = {
            name: data.kyc_details.contact_name, // Must match PAN card name exactly
            email: data.kyc_details.email,
            phone: data.kyc_details.phone,
            relationship: relationship as 'director' | 'proprietor' | 'partner' | 'authorised_signatory',
            kyc: {
              pan: data.kyc_details.pan,
            },
            // Include address for better KYC verification
            address: {
              street: data.kyc_details.address.street1,
              city: data.kyc_details.address.city,
              state: data.kyc_details.address.state,
              postal_code: data.kyc_details.address.postal_code,
              country: data.kyc_details.address.country || 'IN',
            },
          };
          autoCreated = true;
        } else {
          // This should never happen due to validation, but keeping for safety
          logger.error('PAN is missing despite validation (this should not happen)', {
            accountId: razorpayAccount.id,
            businessType: data.kyc_details.business_type,
          });
        }
      }
    }

    // Request product configuration for Route
    let productConfigId: string | null = null;
    try {
      const productConfig = await razorpayRouteService.requestProductConfiguration(razorpayAccount.id);
      productConfigId = productConfig.id;
      logger.info('Product configuration created', {
        accountId: razorpayAccount.id,
        productId: productConfigId,
      });
    } catch (error: any) {
      logger.warn('Failed to request product configuration, continuing:', {
        error: error.message || error,
        accountId: razorpayAccount.id,
      });
      // Don't fail the entire operation
    }

    // Determine activation status from Razorpay response
    let activationStatus = PayoutAccountActivationStatus.PENDING;
    let activationRequirements: string[] | null = null;

    if (razorpayAccount.activation_status) {
      activationStatus = razorpayAccount.activation_status as PayoutAccountActivationStatus;
    }

    if (razorpayAccount.requirements && Array.isArray(razorpayAccount.requirements)) {
      activationRequirements = razorpayAccount.requirements;
    }

    // Create payout account in database
    const { v4: uuidv4 } = require('uuid');
    const payoutAccountId = uuidv4();
    const payoutAccount = new AcademyPayoutAccountModel({
      id: payoutAccountId,
      user: userObjectId,
      razorpay_account_id: razorpayAccount.id,
      kyc_details: data.kyc_details,
      bank_information: data.bank_information || null,
      activation_status: activationStatus,
      activation_requirements: activationRequirements,
      stakeholder_id: stakeholderId,
      product_configuration_id: productConfigId,
      ready_for_payout: 'pending',
      bank_details_status: data.bank_information ? 'pending' : null, // Will be updated to 'submitted' by worker
      is_active: true,
    });

    await payoutAccount.save();

    // Enqueue stakeholder creation job (will be processed in background)
    if (stakeholderDataToEnqueue) {
      try {
        const { enqueuePayoutStakeholderCreate } = await import('../../queue/payoutStakeholderQueue');
        enqueuePayoutStakeholderCreate({
          accountId: razorpayAccount.id,
          stakeholderData: stakeholderDataToEnqueue,
          payoutAccountId: payoutAccountId,
          autoCreated: autoCreated,
        });
        logger.info('Stakeholder creation job queued (will be processed in background)', {
          accountId: razorpayAccount.id,
          payoutAccountId: payoutAccountId,
          relationship: stakeholderDataToEnqueue.relationship,
          autoCreated: autoCreated,
        });
      } catch (error: any) {
        logger.warn('Failed to enqueue stakeholder creation job, continuing:', {
          error: error.message || error,
          accountId: razorpayAccount.id,
          businessType: data.kyc_details.business_type,
        });
        // Don't fail the entire operation if stakeholder creation fails
      }
    }

    // If bank details are provided, enqueue bank details update job
    // This will be processed in the background and automatically submit the activation form
    if (data.bank_information && productConfigId) {
      try {
        const { enqueuePayoutBankDetailsUpdate } = await import('../../queue/payoutBankDetailsQueue');
        enqueuePayoutBankDetailsUpdate({
          accountId: razorpayAccount.id,
          productConfigId: productConfigId,
          bankDetails: {
            account_number: data.bank_information.account_number,
            ifsc: data.bank_information.ifsc_code,
            beneficiary_name: data.bank_information.account_holder_name,
            beneficiary_email: data.kyc_details.email,
            beneficiary_mobile: data.kyc_details.phone,
          },
          payoutAccountId: payoutAccountId,
        });
        logger.info('Bank details update job queued (will be processed in background)', {
          accountId: razorpayAccount.id,
          productId: productConfigId,
          payoutAccountId: payoutAccountId,
        });
      } catch (error: any) {
        logger.warn('Failed to enqueue bank details update job, continuing:', {
          error: error.message || error,
          accountId: razorpayAccount.id,
        });
        // Don't fail the entire operation - bank details can be updated later via PUT endpoint
      }
    }

    // Create audit trail
    await createAuditTrail(
      ActionType.PAYOUT_ACCOUNT_CREATED,
      ActionScale.CRITICAL,
      `Payout account created for academy user`,
      'PayoutAccount',
      payoutAccount._id,
      {
        userId: userObjectId,
        metadata: {
          razorpay_account_id: razorpayAccount.id,
          activation_status: activationStatus,
          business_type: data.kyc_details.business_type,
        },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for payout account creation', { error, accountId: payoutAccount.id });
    });

    // Send notifications (async)
    const userName = `${user.firstName} ${user.lastName || ''}`.trim() || user.email;
    const accountId = payoutAccount.id;

    // Push notification
    const pushNotification = getPayoutAccountCreatedAcademyPush({
      status: activationStatus,
    });
    createAndSendNotification({
      recipientType: 'academy',
      recipientId: userId,
      title: pushNotification.title,
      body: pushNotification.body,
      channels: ['push'],
      priority: 'high',
      data: {
        type: 'payout_account_created',
        accountId: accountId,
        status: activationStatus,
      },
    }).catch((error) => {
      logger.error('Failed to send push notification for payout account creation', { error, accountId });
    });

    // Email notification (async)
    if (user.email) {
      try {
        queueEmail(
          user.email,
          EmailSubjects.PAYOUT_ACCOUNT_CREATED,
          {
            template: EmailTemplates.PAYOUT_ACCOUNT_CREATED,
            text: getPayoutAccountCreatedAcademyEmailText({
              userName,
              accountId,
              status: activationStatus,
            }),
            templateVariables: {
              userName: userName,
              accountId: accountId,
              status: activationStatus,
              websiteUrl: process.env.FRONTEND_URL || 'https://playasport.in',
              companyName: 'Play A Sport',
              website: 'playasport.in',
              year: new Date().getFullYear(),
            },
            priority: 'high',
            metadata: {
              type: 'payout_account_created',
              accountId: accountId,
              recipient: 'academy',
            },
          }
        );
      } catch (error: unknown) {
        logger.error('Failed to queue email for payout account creation', { error, accountId });
      }
    }

    // SMS notification (async)
    if (user.mobile) {
      try {
        const smsMessage = getPayoutAccountCreatedAcademySms({
          accountId: accountId,
          status: activationStatus,
        });
        queueSms(user.mobile, smsMessage, 'high', {
          type: 'payout_account_created',
          accountId: accountId,
          recipient: 'academy',
        });
      } catch (error: unknown) {
        logger.error('Failed to queue SMS for payout account creation', { error, accountId });
      }
    }

    // WhatsApp notification (async)
    if (user.mobile) {
      try {
        const whatsappMessage = getPayoutAccountCreatedAcademyWhatsApp({
          accountId: accountId,
          status: activationStatus,
        });
        queueWhatsApp(user.mobile, whatsappMessage, 'high', {
          type: 'payout_account_created',
          accountId: accountId,
          recipient: 'academy',
        });
      } catch (error: unknown) {
        logger.error('Failed to queue WhatsApp for payout account creation', { error, accountId });
      }
    }

    // Update bank details if provided
    if (data.bank_information) {
      try {
        await updateBankDetails(userId, data.bank_information, {
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });
      } catch (error: any) {
        logger.warn('Failed to update bank details during account creation:', {
          error: error.message || error,
          accountId: payoutAccount.id,
        });
        // Don't fail the entire operation
      }
    }

    return sanitizePayoutAccountResponse(payoutAccount);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error creating payout account:', {
      error: error.message || error,
      userId,
    });
    throw new ApiError(500, 'Failed to create payout account');
  }
};

/**
 * Update bank details for payout account
 */
export const updateBankDetails = async (
  userId: string,
  bankDetails: UpdateBankDetailsInput,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<AcademyPayoutAccount> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Find existing account
    const account = await AcademyPayoutAccountModel.findOne({
      user: userObjectId,
      is_active: true,
    });

    if (!account) {
      throw new ApiError(404, 'Payout account not found. Please create a payout account first.');
    }

    // Get user details for notifications
    const user = await UserModel.findById(userObjectId).lean().exec();
    if (!user) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get product configuration ID if not stored
    let productConfigId = account.product_configuration_id;
    if (!productConfigId) {
      try {
        const productConfig = await razorpayRouteService.getProductConfiguration(account.razorpay_account_id);
        if (productConfig && productConfig.id) {
          productConfigId = productConfig.id;
          // Store product configuration ID for future use
          account.product_configuration_id = productConfigId;
        }
      } catch (error: any) {
        logger.warn('Failed to fetch product configuration, will try to create:', {
          error: error.message || error,
          accountId: account.id,
        });
        // Try to request product configuration if it doesn't exist
        try {
          const productConfig = await razorpayRouteService.requestProductConfiguration(account.razorpay_account_id);
          productConfigId = productConfig.id;
          account.product_configuration_id = productConfigId;
        } catch (createError: any) {
          logger.error('Failed to create product configuration:', {
            error: createError.message || createError,
            accountId: account.id,
          });
          throw new ApiError(500, 'Product configuration not found. Please contact support.');
        }
      }
    }

    if (!productConfigId) {
      throw new ApiError(500, 'Product configuration ID not found. Please contact support.');
    }

    // Update bank details in database first
    account.bank_information = {
      account_number: bankDetails.account_number,
      ifsc_code: bankDetails.ifsc_code,
      account_holder_name: bankDetails.account_holder_name,
      bank_name: bankDetails.bank_name || null,
    };
    account.bank_details_status = 'pending'; // Will be updated to 'submitted' by worker

    await account.save();

    // Check product configuration status before enqueueing bank update
    // This helps us store requirements if needs_clarification
    try {
      const productConfigDetails = await razorpayRouteService.getProductConfigurationDetails(
        account.razorpay_account_id,
        productConfigId
      );

      // If product configuration needs clarification, store requirements in database
      if (productConfigDetails.activation_status === 'needs_clarification') {
        const requirements = productConfigDetails.requirements || [];
        const requirementsText = Array.isArray(requirements)
          ? requirements.map((req: any) => req.description || req.field_reference || req).join(', ')
          : (typeof requirements === 'string' ? requirements : 'Additional information required');

        // Update account with needs_clarification status and requirements
        account.activation_status = PayoutAccountActivationStatus.NEEDS_CLARIFICATION;
        
        // Format requirements: extract description from each requirement object and deduplicate
        let formattedRequirements: string[] = [];
        if (Array.isArray(requirements)) {
          const seenDescriptions = new Set<string>();
          formattedRequirements = requirements
            .map((req: any) => {
              // If it's an object, extract description or field_reference
              if (typeof req === 'object' && req !== null) {
                return req.description || req.field_reference || JSON.stringify(req);
              }
              // If it's a string, use it directly
              return String(req);
            })
            .filter((desc: string) => {
              // Remove duplicates based on description
              if (seenDescriptions.has(desc)) {
                return false;
              }
              seenDescriptions.add(desc);
              return true;
            });
        } else if (typeof requirements === 'string') {
          formattedRequirements = [requirements];
        } else {
          formattedRequirements = [requirementsText];
        }
        
        account.activation_requirements = formattedRequirements;
        
        await account.save();

        logger.info('Account status updated to needs_clarification with requirements', {
          accountId: account.id,
          activationStatus: account.activation_status,
          requirements: account.activation_requirements,
          requirementsCount: account.activation_requirements?.length || 0,
        });
      }
    } catch (checkError: any) {
      // Non-blocking: Log but continue with bank update
      logger.warn('Could not check product configuration details before bank update', {
        accountId: account.id,
        productId: productConfigId,
        error: checkError.message || checkError,
      });
    }

    // Enqueue bank details update job (will be processed in background)
    try {
      const { enqueuePayoutBankDetailsUpdate } = await import('../../queue/payoutBankDetailsQueue');
      enqueuePayoutBankDetailsUpdate({
        accountId: account.razorpay_account_id,
        productConfigId: productConfigId,
        bankDetails: {
          account_number: bankDetails.account_number,
          ifsc: bankDetails.ifsc_code,
          beneficiary_name: bankDetails.account_holder_name,
          beneficiary_email: user.email || '',
          beneficiary_mobile: user.mobile || '',
        },
        payoutAccountId: account.id,
      });
      logger.info('Bank details update job queued (will be processed in background)', {
        accountId: account.razorpay_account_id,
        productId: productConfigId,
        payoutAccountId: account.id,
      });
    } catch (error: any) {
      logger.error('Failed to enqueue bank details update job:', {
        error: error.message || error,
        accountId: account.id,
        productId: productConfigId,
      });
      // Don't throw error - job can be retried later, but mark status as pending
      account.bank_details_status = 'pending';
      await account.save();
    }

    // Create audit trail
    await createAuditTrail(
      ActionType.PAYOUT_ACCOUNT_BANK_DETAILS_UPDATED,
      ActionScale.HIGH,
      `Bank details updated for payout account`,
      'PayoutAccount',
      account._id,
      {
        userId: userObjectId,
        metadata: {
          razorpay_account_id: account.razorpay_account_id,
          bank_name: bankDetails.bank_name,
        },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for bank details update', { error, accountId: account.id });
    });

    // Send notifications (async)
    const userName = `${user.firstName} ${user.lastName || ''}`.trim() || user.email;
    const accountId = account.id;

    // Push notification
    const bankUpdatePushNotification = getBankDetailsUpdatedAcademyPush({});
    createAndSendNotification({
      recipientType: 'academy',
      recipientId: userId,
      title: bankUpdatePushNotification.title,
      body: bankUpdatePushNotification.body,
      channels: ['push'],
      priority: 'high',
      data: {
        type: 'bank_details_updated',
        accountId: accountId,
      },
    }).catch((error) => {
      logger.error('Failed to send push notification for bank details update', { error, accountId });
    });

    // Email notification (async)
    if (user.email) {
      try {
        queueEmail(
          user.email,
          EmailSubjects.BANK_DETAILS_UPDATED,
          {
            text: getBankDetailsUpdatedAcademyEmailText({
              userName,
              accountId,
            }),
            priority: 'high',
            metadata: {
              type: 'bank_details_updated',
              accountId: accountId,
              recipient: 'academy',
            },
          }
        );
      } catch (error: unknown) {
        logger.error('Failed to queue email for bank details update', { error, accountId });
      }
    }

    // SMS notification (async)
    if (user.mobile) {
      try {
        const smsMessage = getBankDetailsUpdatedAcademySms({
          accountId: accountId,
        });
        queueSms(user.mobile, smsMessage, 'high', {
          type: 'bank_details_updated',
          accountId: accountId,
          recipient: 'academy',
        });
      } catch (error: unknown) {
        logger.error('Failed to queue SMS for bank details update', { error, accountId });
      }
    }

    // WhatsApp notification (async)
    if (user.mobile) {
      try {
        const whatsappMessage = getBankDetailsUpdatedAcademyWhatsApp({
          accountId: accountId,
        });
        queueWhatsApp(user.mobile, whatsappMessage, 'high', {
          type: 'bank_details_updated',
          accountId: accountId,
          recipient: 'academy',
        });
      } catch (error: unknown) {
        logger.error('Failed to queue WhatsApp for bank details update', { error, accountId });
      }
    }

    return sanitizePayoutAccountResponse(account);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error updating bank details:', {
      error: error.message || error,
      userId,
    });
    throw new ApiError(500, 'Failed to update bank details');
  }
};

/**
 * Check and update account status from Razorpay
 * This can be called via webhook or manual polling
 */
export const syncAccountStatus = async (accountId: string): Promise<AcademyPayoutAccount> => {
  try {
    const account = await AcademyPayoutAccountModel.findOne({
      id: accountId,
      is_active: true,
    });

    if (!account) {
      throw new ApiError(404, 'Payout account not found');
    }

    // Fetch latest status from Razorpay account
    const razorpayAccount = await razorpayRouteService.getAccountDetails(account.razorpay_account_id);

    // Also check product configuration status (this is the actual payout readiness status)
    let productConfigStatus: string | null = null;
    let productConfigRequirements: any[] | null = null;
    
    if (account.product_configuration_id) {
      try {
        const productConfig = await razorpayRouteService.getProductConfigurationDetails(
          account.razorpay_account_id,
          account.product_configuration_id
        );
        productConfigStatus = productConfig.activation_status || null;
        productConfigRequirements = productConfig.requirements || null;
        
        logger.info('Product configuration status synced', {
          accountId: account.id,
          productConfigStatus,
          accountStatus: razorpayAccount.activation_status,
        });
      } catch (productConfigError: any) {
        logger.warn('Failed to fetch product configuration status during sync', {
          accountId: account.id,
          error: productConfigError.message || productConfigError,
        });
      }
    }

    // Use product configuration status if available, otherwise use account status
    // Product configuration status is more accurate for payout readiness
    const previousStatus = account.activation_status;
    const newStatus = (productConfigStatus || razorpayAccount.activation_status || PayoutAccountActivationStatus.PENDING) as PayoutAccountActivationStatus;
    const requirements = productConfigRequirements || (razorpayAccount.requirements && Array.isArray(razorpayAccount.requirements) ? razorpayAccount.requirements : null);

    // Update account status
    account.activation_status = newStatus;
    
    // Format and deduplicate requirements
    let formattedRequirements: string[] | null = null;
    if (requirements && Array.isArray(requirements)) {
      const seenDescriptions = new Set<string>();
      formattedRequirements = requirements
        .map((req: any) => {
          // If it's an object, extract description or field_reference
          if (typeof req === 'object' && req !== null) {
            return req.description || req.field_reference || JSON.stringify(req);
          }
          // If it's a string, use it directly
          return String(req);
        })
        .filter((desc: string) => {
          // Remove duplicates based on description
          if (seenDescriptions.has(desc)) {
            return false;
          }
          seenDescriptions.add(desc);
          return true;
        });
    }
    
    account.activation_requirements = formattedRequirements;

    if (razorpayAccount.activation_status === PayoutAccountActivationStatus.REJECTED) {
      account.rejection_reason = razorpayAccount.rejection_reason || null;
    }

    await account.save();

    // If status changed, create audit trail and send notifications
    if (previousStatus !== newStatus) {
      const userObjectId = account.user;

      // Create audit trail
      await createAuditTrail(
        ActionType.PAYOUT_ACCOUNT_STATUS_CHANGED,
        ActionScale.HIGH,
        `Payout account status changed from ${previousStatus} to ${newStatus}`,
        'PayoutAccount',
        account._id,
        {
          userId: userObjectId,
          metadata: {
            previous_status: previousStatus,
            new_status: newStatus,
            razorpay_account_id: account.razorpay_account_id,
            requirements: requirements,
          },
        }
      ).catch((error) => {
        logger.error('Failed to create audit trail for status change', { error, accountId: account.id });
      });

      // Get user for notifications
      const user = await UserModel.findById(userObjectId).lean().exec();
      if (user) {
        const userName = `${user.firstName} ${user.lastName || ''}`.trim() || user.email;
        const userId = user.id;

        // Send notifications based on status
        if (newStatus === PayoutAccountActivationStatus.ACTIVATED) {
          // Account activated
          await createAuditTrail(
            ActionType.PAYOUT_ACCOUNT_ACTIVATED,
            ActionScale.CRITICAL,
            `Payout account activated`,
            'PayoutAccount',
            account._id,
            {
              userId: userObjectId,
              metadata: {
                razorpay_account_id: account.razorpay_account_id,
              },
            }
          ).catch((error) => {
            logger.error('Failed to create audit trail for account activation', { error, accountId: account.id });
          });

          // Push notification
          const activatedPushNotification = getPayoutAccountActivatedAcademyPush({});
          createAndSendNotification({
            recipientType: 'academy',
            recipientId: userId,
            title: activatedPushNotification.title,
            body: activatedPushNotification.body,
            channels: ['push'],
            priority: 'high',
            data: {
              type: 'payout_account_activated',
              accountId: account.id,
            },
          }).catch((error) => {
            logger.error('Failed to send push notification for account activation', { error, accountId: account.id });
          });

          // Email
          if (user.email) {
            try {
              queueEmail(
                user.email,
                EmailSubjects.PAYOUT_ACCOUNT_ACTIVATED,
                {
                  template: EmailTemplates.PAYOUT_ACCOUNT_ACTIVATED,
                  text: getPayoutAccountActivatedAcademyEmailText({
                    userName,
                    accountId: account.id,
                  }),
                  templateVariables: {
                    userName: userName,
                    accountId: account.id,
                    websiteUrl: process.env.FRONTEND_URL || 'https://playasport.in',
                    companyName: 'Play A Sport',
                    website: 'playasport.in',
                    year: new Date().getFullYear(),
                  },
                  priority: 'high',
                  metadata: {
                    type: 'payout_account_activated',
                    accountId: account.id,
                    recipient: 'academy',
                  },
                }
              );
            } catch (error: unknown) {
              logger.error('Failed to queue email for account activation', { error, accountId: account.id });
            }
          }

          // SMS
          if (user.mobile) {
            try {
              const smsMessage = getPayoutAccountActivatedAcademySms({
                accountId: account.id,
              });
              queueSms(user.mobile, smsMessage, 'high', {
                type: 'payout_account_activated',
                accountId: account.id,
                recipient: 'academy',
              });
            } catch (error: unknown) {
              logger.error('Failed to queue SMS for account activation', { error, accountId: account.id });
            }
          }

          // WhatsApp
          if (user.mobile) {
            try {
              const whatsappMessage = getPayoutAccountActivatedAcademyWhatsApp({
                accountId: account.id,
              });
              queueWhatsApp(user.mobile, whatsappMessage, 'high', {
                type: 'payout_account_activated',
                accountId: account.id,
                recipient: 'academy',
              });
            } catch (error: unknown) {
              logger.error('Failed to queue WhatsApp for account activation', { error, accountId: account.id });
            }
          }
        } else if (newStatus === PayoutAccountActivationStatus.NEEDS_CLARIFICATION) {
          // Needs clarification
          const requirementsText = requirements ? requirements.join(', ') : 'Additional information';

          // Push notification
          const actionRequiredPushNotification = getPayoutAccountActionRequiredAcademyPush({
            requirementsText,
          });
          createAndSendNotification({
            recipientType: 'academy',
            recipientId: userId,
            title: actionRequiredPushNotification.title,
            body: actionRequiredPushNotification.body,
            channels: ['push'],
            priority: 'high',
            data: {
              type: 'payout_account_needs_clarification',
              accountId: account.id,
              requirements: requirements,
            },
          }).catch((error) => {
            logger.error('Failed to send push notification for needs clarification', { error, accountId: account.id });
          });

          // Email
          if (user.email) {
            try {
              queueEmail(
                user.email,
                EmailSubjects.PAYOUT_ACCOUNT_ACTION_REQUIRED,
                {
                  text: getPayoutAccountActionRequiredAcademyEmailText({
                    userName,
                    accountId: account.id,
                    requirementsText,
                  }),
                  priority: 'high',
                  metadata: {
                    type: 'payout_account_needs_clarification',
                    accountId: account.id,
                    recipient: 'academy',
                  },
                }
              );
            } catch (error: unknown) {
              logger.error('Failed to queue email for needs clarification', { error, accountId: account.id });
            }
          }

          // SMS
          if (user.mobile) {
            try {
              const smsMessage = getPayoutAccountNeedsClarificationAcademySms({
                accountId: account.id,
              });
              queueSms(user.mobile, smsMessage, 'high', {
                type: 'payout_account_needs_clarification',
                accountId: account.id,
                recipient: 'academy',
              });
            } catch (error: unknown) {
              logger.error('Failed to queue SMS for needs clarification', { error, accountId: account.id });
            }
          }

          // WhatsApp
          if (user.mobile) {
            try {
              const whatsappMessage = getPayoutAccountNeedsClarificationAcademyWhatsApp({
                accountId: account.id,
                requirements: requirementsText,
              });
              queueWhatsApp(user.mobile, whatsappMessage, 'high', {
                type: 'payout_account_needs_clarification',
                accountId: account.id,
                recipient: 'academy',
              });
            } catch (error: unknown) {
              logger.error('Failed to queue WhatsApp for needs clarification', { error, accountId: account.id });
            }
          }
        } else if (newStatus === PayoutAccountActivationStatus.REJECTED) {
          // Rejected
          const rejectionReason = account.rejection_reason || 'Account verification failed';

          // Push notification
          const rejectedPushNotification = getPayoutAccountRejectedAcademyPush({
            reason: rejectionReason,
          });
          createAndSendNotification({
            recipientType: 'academy',
            recipientId: userId,
            title: rejectedPushNotification.title,
            body: rejectedPushNotification.body,
            channels: ['push'],
            priority: 'high',
            data: {
              type: 'payout_account_rejected',
              accountId: account.id,
              reason: rejectionReason,
            },
          }).catch((error) => {
            logger.error('Failed to send push notification for account rejection', { error, accountId: account.id });
          });

          // Email
          if (user.email) {
            try {
              queueEmail(
                user.email,
                EmailSubjects.PAYOUT_ACCOUNT_REJECTED,
                {
                  text: getPayoutAccountRejectedAcademyEmailText({
                    userName,
                    accountId: account.id,
                    reason: rejectionReason,
                  }),
                  priority: 'high',
                  metadata: {
                    type: 'payout_account_rejected',
                    accountId: account.id,
                    recipient: 'academy',
                  },
                }
              );
            } catch (error: unknown) {
              logger.error('Failed to queue email for account rejection', { error, accountId: account.id });
            }
          }

          // SMS
          if (user.mobile) {
            try {
              const smsMessage = getPayoutAccountRejectedAcademySms({
                accountId: account.id,
                reason: rejectionReason,
              });
              queueSms(user.mobile, smsMessage, 'high', {
                type: 'payout_account_rejected',
                accountId: account.id,
                recipient: 'academy',
              });
            } catch (error: unknown) {
              logger.error('Failed to queue SMS for account rejection', { error, accountId: account.id });
            }
          }

          // WhatsApp
          if (user.mobile) {
            try {
              const whatsappMessage = getPayoutAccountRejectedAcademyWhatsApp({
                accountId: account.id,
                reason: rejectionReason,
              });
              queueWhatsApp(user.mobile, whatsappMessage, 'high', {
                type: 'payout_account_rejected',
                accountId: account.id,
                recipient: 'academy',
              });
            } catch (error: unknown) {
              logger.error('Failed to queue WhatsApp for account rejection', { error, accountId: account.id });
            }
          }
        }
      }
    }

    return sanitizePayoutAccountResponse(account);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error syncing account status:', {
      error: error.message || error,
      accountId,
    });
    throw new ApiError(500, 'Failed to sync account status');
  }
};
