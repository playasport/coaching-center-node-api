import Razorpay from 'razorpay';
import { config } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../utils/ApiError';
import { BusinessType } from '../../../models/academyPayoutAccount.model';

/**
 * Razorpay Route API Service
 * Handles Linked Account creation and management for payouts
 */
export class RazorpayRouteService {
  private razorpay: Razorpay | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Razorpay instance
   */
  private initialize(): void {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      logger.warn('Razorpay credentials not configured. Route API will not work.');
      return;
    }

    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });

    logger.info('Razorpay Route service initialized successfully');
  }

  /**
   * Ensure Razorpay is initialized
   */
  private ensureInitialized(): void {
    if (!this.razorpay) {
      throw new ApiError(500, 'Razorpay Route service is not initialized. Please check configuration.');
    }
  }

  /**
   * Create a Linked Account (Route Account) with KYC details
   * @param kycData KYC information for the account
   * @returns Razorpay account response
   */
  async createLinkedAccount(kycData: {
    email: string;
    phone: string;
    type: 'route';
    legal_business_name: string;
    business_type: BusinessType;
    contact_name: string;
    profile: {
      category: string;
      subcategory: string;
      addresses: {
        registered: {
          street1: string;
          street2?: string;
          city: string;
          state: string;
          postal_code: string;
          country: string;
        };
      };
    };
    legal_info: {
      pan?: string;
      gst?: string;
    };
  }): Promise<any> {
    this.ensureInitialized();

    try {
      const accountData: any = {
        email: kycData.email,
        phone: kycData.phone,
        type: kycData.type,
        legal_business_name: kycData.legal_business_name,
        business_type: kycData.business_type,
        contact_name: kycData.contact_name,
        profile: kycData.profile,
      };
      if (kycData.business_type === 'individual') {
        // For individual, don't include pan or gst in legal_info
        // Individual accounts don't require PAN/GST during account creation
        // legal_info can be empty or omitted for individual type
      } else {
        // For other business types (partnership, private_limited, etc.), PAN is required
        accountData.legal_info = {
          pan: kycData.legal_info.pan,
        };
        // Add GST if provided
        if (kycData.legal_info.gst) {
          accountData.legal_info.gst = kycData.legal_info.gst;
        }
      }

      // Use Razorpay API directly for Route accounts (v2 endpoint)
      const response = await fetch('https://api.razorpay.com/v2/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
        logger.error('Razorpay Linked Account creation failed:', {
          status: response.status,
          error: errorData,
          kycData: { ...kycData, legal_info: { pan: '***' } }, // Don't log PAN
        });
        throw new ApiError(
          response.status || 500,
          errorData.error?.description || 'Failed to create Razorpay Linked Account'
        );
      }

      const account = (await response.json()) as { id: string; email?: string };
      logger.info('Razorpay Linked Account created successfully', {
        accountId: account.id,
        email: account.email,
      });

      return account;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error creating Razorpay Linked Account:', {
        error: error.message || error,
        kycData: { ...kycData, legal_info: { pan: '***' } },
      });
      throw new ApiError(500, 'Failed to create Razorpay Linked Account. Please try again.');
    }
  }

  /**
   * Create a stakeholder for the Linked Account
   * @param accountId Razorpay account ID
   * @param stakeholderData Stakeholder information
   * @returns Stakeholder response
   */
  async createStakeholder(
    accountId: string,
    stakeholderData: {
      name: string;
      email: string;
      phone: string;
      relationship: 'director' | 'proprietor' | 'partner' | 'authorised_signatory';
      kyc: {
        pan?: string;
        aadhaar?: string;
      };
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    }
  ): Promise<any> {
    this.ensureInitialized();

    try {
      // Convert relationship string to Razorpay's object format
      // Razorpay expects: { director: boolean, executive: boolean }
      let relationshipObject: { director?: boolean; executive?: boolean } = {};
      
      switch (stakeholderData.relationship) {
        case 'director':
          relationshipObject = { director: true, executive: false };
          break;
        case 'proprietor':
          // Proprietor is typically an executive/authorized signatory
          relationshipObject = { executive: true, director: false };
          break;
        case 'partner':
          // Partner in partnership firm
          relationshipObject = { director: true, executive: false };
          break;
        case 'authorised_signatory':
          // Authorized signatory is an executive
          relationshipObject = { executive: true, director: false };
          break;
        default:
          // Default to executive for safety
          relationshipObject = { executive: true, director: false };
      }

      // Prepare request body according to Razorpay API format
      // Phone should be an object with primary field
      // Relationship should be an object with director/executive boolean values
      // Addresses field is optional but recommended for KYC
      const requestBody: any = {
        name: stakeholderData.name,
        email: stakeholderData.email,
        phone: {
          primary: stakeholderData.phone,
        },
        relationship: relationshipObject,
        kyc: {
          // PAN is mandatory for stakeholder creation
          // Ensure PAN is uppercase and valid format before sending
          // Razorpay expects PAN in uppercase format: ABCDE1234F
          // PAN must match the name exactly as on PAN card
          ...(stakeholderData.kyc.pan && {
            pan: stakeholderData.kyc.pan.toUpperCase().trim(),
          }),
          ...(stakeholderData.kyc.aadhaar && { aadhaar: stakeholderData.kyc.aadhaar }),
        },
      };

      // Add addresses if provided (recommended for KYC verification)
      if (stakeholderData.address) {
        requestBody.addresses = {
          residential: {
            ...(stakeholderData.address.street && { street: stakeholderData.address.street }),
            ...(stakeholderData.address.city && { city: stakeholderData.address.city }),
            ...(stakeholderData.address.state && { state: stakeholderData.address.state }),
            ...(stakeholderData.address.postal_code && { postal_code: stakeholderData.address.postal_code }),
            ...(stakeholderData.address.country && { country: stakeholderData.address.country }),
          },
        };
      }

      logger.info('Creating stakeholder with Razorpay API format', {
        accountId,
        relationship: relationshipObject,
        hasPan: !!stakeholderData.kyc.pan,
      });

      const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { description?: string; field?: string } };
        const errorMessage = errorData.error?.description || 'Failed to create stakeholder';
        
        // Log detailed error information
        logger.error('Razorpay Stakeholder creation failed:', {
          status: response.status,
          error: errorData,
          accountId,
          stakeholderName: stakeholderData.name,
          panProvided: !!stakeholderData.kyc.pan,
          panValue: stakeholderData.kyc.pan ? `${stakeholderData.kyc.pan.substring(0, 3)}***` : 'N/A', // Masked for security
          field: errorData.error?.field,
        });

        // Provide more specific error message for PAN validation errors
        if (errorData.error?.field === 'pan' || errorMessage.toLowerCase().includes('pan')) {
          throw new ApiError(
            response.status || 500,
            `PAN validation failed: ${errorMessage}. Please ensure the PAN is valid and matches the name exactly as on the PAN card.`
          );
        }
        
        throw new ApiError(
          response.status || 500,
          errorMessage
        );
      }

      const stakeholder = (await response.json()) as { id: string };
      logger.info('Razorpay Stakeholder created successfully', {
        stakeholderId: stakeholder.id,
        accountId,
      });

      return stakeholder;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error creating Razorpay Stakeholder:', {
        error: error.message || error,
        accountId,
      });
      throw new ApiError(500, 'Failed to create stakeholder. Please try again.');
    }
  }

  /**
   * Request product configuration for Route
   * @param accountId Razorpay account ID
   * @returns Product configuration response
   */
  async requestProductConfiguration(accountId: string): Promise<any> {
    this.ensureInitialized();

    try {
      const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          product_name: 'route',
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
        logger.error('Razorpay Product Configuration request failed:', {
          status: response.status,
          error: errorData,
          accountId,
        });
        throw new ApiError(
          response.status || 500,
          errorData.error?.description || 'Failed to request product configuration'
        );
      }

      const product = (await response.json()) as { id: string };
      logger.info('Razorpay Product Configuration requested successfully', {
        accountId,
        productId: product.id,
      });

      return product;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error requesting Razorpay Product Configuration:', {
        error: error.message || error,
        accountId,
      });
      throw new ApiError(500, 'Failed to request product configuration. Please try again.');
    }
  }

  /**
   * Get product configuration details
   * @param accountId Razorpay account ID
   * @returns Product configuration response
   */
  async getProductConfiguration(accountId: string): Promise<any> {
    this.ensureInitialized();

    try {
      const response = await fetch(
        `https://api.razorpay.com/v2/accounts/${accountId}/products`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
        logger.error('Razorpay Product Configuration fetch failed:', {
          status: response.status,
          error: errorData,
          accountId,
        });
        throw new ApiError(
          response.status || 500,
          errorData.error?.description || 'Failed to fetch product configuration'
        );
      }

      const result = (await response.json()) as { items?: Array<{ id: string; product_name: string }> };
      // Find route product configuration
      const routeProduct = result.items?.find((item: any) => item.product_name === 'route');
      if (!routeProduct) {
        throw new ApiError(404, 'Route product configuration not found for this account');
      }
      return routeProduct;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching Razorpay Product Configuration:', {
        error: error.message || error,
        accountId,
      });
      throw new ApiError(500, 'Failed to fetch product configuration. Please try again.');
    }
  }

  /**
   * Update bank account details for Route product
   * @param accountId Razorpay account ID
   * @param productId Product configuration ID (acc_prd_xxx)
   * @param bankDetails Bank account information
   * @returns Update response
   */
  /**
   * Get product configuration details with full status
   * @param accountId Razorpay account ID
   * @param productId Product configuration ID
   * @returns Product configuration with status and requirements
   */
  async getProductConfigurationDetails(accountId: string, productId: string): Promise<any> {
    this.ensureInitialized();

    try {
      const response = await fetch(
        `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
        throw new ApiError(
          response.status || 500,
          errorData.error?.description || 'Failed to fetch product configuration details'
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching product configuration details:', {
        error: error.message || error,
        accountId,
        productId,
      });
      throw new ApiError(500, 'Failed to fetch product configuration details. Please try again.');
    }
  }

  async updateBankDetails(
    accountId: string,
    productId: string,
    bankDetails: {
      account_number: string;
      ifsc: string;
      beneficiary_name: string;
      beneficiary_mobile?: string;
      beneficiary_email?: string;
    }
  ): Promise<any> {
    this.ensureInitialized();

    try {
      // First, check the product configuration status to ensure it's ready
      // This helps avoid "contact support" errors
      // Product configuration must exist and be in a valid state
      try {
        const productConfigResponse = await fetch(
          `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
            },
          }
        );

        if (productConfigResponse.ok) {
          const productConfig = (await productConfigResponse.json()) as any;
          logger.info('Product configuration status checked before bank update', {
            accountId,
            productId,
            status: productConfig.status,
            activationStatus: productConfig.activation_status,
            readyForPayout: productConfig.ready_for_payout,
          });

          // Check if product configuration needs clarification
          if (productConfig.activation_status === 'needs_clarification') {
            const requirements = productConfig.requirements || [];
            
            // Check if requirements are only about bank details that we're about to submit
            // If all requirements are about settlements.* or tnc_accepted, we can proceed
            const bankDetailsFields = ['settlements.account_number', 'settlements.ifsc_code', 'settlements.beneficiary_name', 'tnc_accepted'];
            const allRequirementsAreBankDetails = Array.isArray(requirements) && requirements.length > 0
              ? requirements.every((req: any) => {
                  const fieldRef = req.field_reference || '';
                  return bankDetailsFields.some(field => fieldRef.includes(field) || fieldRef === field);
                })
              : false;
            
            if (allRequirementsAreBankDetails) {
              // All requirements are about bank details we're about to submit, so proceed
              logger.info('Product configuration needs clarification but only for bank details we are submitting - proceeding with update', {
                accountId,
                productId,
                requirements,
              });
            } else {
              // There are other clarifications needed beyond bank details
              const requirementsText = Array.isArray(requirements) 
                ? requirements.map((req: any) => req.description || req.field_reference || req).join(', ')
                : (typeof requirements === 'string' ? requirements : 'Additional information required');
              
              logger.warn('Product configuration needs clarification before bank update', {
                accountId,
                productId,
                requirements,
                resolutionUrl: productConfig.resolution_url,
              });
              
              // Return requirements in error so they can be stored and displayed
              const error = new ApiError(
                400,
                `Product configuration requires clarification: ${requirementsText}`
              );
              // Attach requirements to error for storage
              (error as any).requirements = requirements;
              (error as any).resolutionUrl = productConfig.resolution_url;
              throw error;
            }
          }

          // Check if account is rejected
          if (productConfig.activation_status === 'rejected') {
            throw new ApiError(
              400,
              'Account has been rejected. Please contact Razorpay support or create a new account.'
            );
          }
        } else {
          // If we can't fetch product config, log but continue (might be a temporary issue)
          const errorData = (await productConfigResponse.json().catch(() => ({}))) as { error?: { description?: string } };
          logger.warn('Could not fetch product configuration status before bank update', {
            accountId,
            productId,
            status: productConfigResponse.status,
            error: errorData.error?.description,
          });
        }
      } catch (checkError: any) {
        // If it's an ApiError we threw, re-throw it
        if (checkError instanceof ApiError) {
          throw checkError;
        }
        // Otherwise, log but continue with update (non-blocking)
        logger.warn('Could not check product configuration status before bank update', {
          accountId,
          productId,
          error: checkError.message || checkError,
        });
      }

      // Prepare request body according to Razorpay API
      const requestBody: any = {
        settlements: {
          account_number: bankDetails.account_number,
          ifsc_code: bankDetails.ifsc,
          beneficiary_name: bankDetails.beneficiary_name,
        },
        tnc_accepted: true,
      };

      logger.info('Updating bank details in Razorpay', {
        accountId,
        productId,
        accountNumber: `${bankDetails.account_number.substring(0, 4)}****${bankDetails.account_number.substring(bankDetails.account_number.length - 4)}`, // Masked
        ifsc: bankDetails.ifsc,
      });

      const response = await fetch(
        `https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { 
          error?: { 
            description?: string;
            code?: string;
            reason?: string;
            field?: string;
          } 
        };
        
        const errorDescription = errorData.error?.description || 'Failed to update bank details';
        const errorCode = errorData.error?.code;
        const errorReason = errorData.error?.reason;
        
        logger.error('Razorpay Bank Details update failed:', {
          status: response.status,
          error: errorData,
          accountId,
          productId,
          errorCode,
          errorReason,
          field: errorData.error?.field,
        });

        // Provide more helpful error messages
        if (errorDescription.toLowerCase().includes('contact support') || 
            errorDescription.toLowerCase().includes('support')) {
          throw new ApiError(
            response.status || 500,
            `Unable to update bank details. The account may need to be activated first or product configuration may require review. Please ensure the account is properly set up. If the issue persists, contact Razorpay support. Original error: ${errorDescription}`
          );
        }

        throw new ApiError(
          response.status || 500,
          errorDescription
        );
      }

      const result = (await response.json()) as any;
      logger.info('Razorpay Bank Details updated successfully', {
        accountId,
        productId,
      });

      return result;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error updating Razorpay Bank Details:', {
        error: error.message || error,
        accountId,
      });
      throw new ApiError(500, 'Failed to update bank details. Please try again.');
    }
  }

  /**
   * Get account details and status
   * @param accountId Razorpay account ID
   * @returns Account details
   */
  async getAccountDetails(accountId: string): Promise<any> {
    this.ensureInitialized();

    try {
      const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { description?: string } };
        logger.error('Razorpay Account fetch failed:', {
          status: response.status,
          error: errorData,
          accountId,
        });
        throw new ApiError(
          response.status || 500,
          errorData.error?.description || 'Failed to fetch account details'
        );
      }

      const account = await response.json();
      return account;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching Razorpay Account:', {
        error: error.message || error,
        accountId,
      });
      throw new ApiError(500, 'Failed to fetch account details. Please try again.');
    }
  }
}

// Export singleton instance
export const razorpayRouteService = new RazorpayRouteService();
