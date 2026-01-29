import { PayoutModel, Payout, PayoutStatus } from '../../models/payout.model';
import { BookingModel } from '../../models/booking.model';
import { TransactionModel } from '../../models/transaction.model';
import { AcademyPayoutAccountModel } from '../../models/academyPayoutAccount.model';
import { UserModel } from '../../models/user.model';

import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { createAuditTrail } from '../common/auditTrail.service';
import { ActionType, ActionScale } from '../../models/auditTrail.model';
import { enqueuePayoutTransfer } from '../../queue/payoutTransferQueue';

/**
 * Get all payouts with filters and pagination
 */
export const getPayouts = async (filters: {
  status?: PayoutStatus;
  academyUserId?: string;
  bookingId?: string;
  transactionId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}): Promise<{
  data: Payout[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> => {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.academyUserId) {
      const academyUser = await UserModel.findOne({ id: filters.academyUserId }).select('_id').lean();
      if (academyUser) {
        query.academy_user = academyUser._id;
      } else {
        // User not found, return empty result
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    }

    if (filters.bookingId) {
      const booking = await BookingModel.findOne({ id: filters.bookingId }).select('_id').lean();
      if (booking) {
        query.booking = booking._id;
      } else {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    }

    if (filters.transactionId) {
      const transaction = await TransactionModel.findOne({ id: filters.transactionId }).select('_id').lean();
      if (transaction) {
        query.transaction = transaction._id;
      } else {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    // Get total count
    const total = await PayoutModel.countDocuments(query);

    // Get payouts with pagination
    const payouts = await PayoutModel.find(query)
      .populate('booking', 'id booking_id status amount')
      .populate('transaction', 'id razorpay_payment_id status amount')
      .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
      .populate('academy_user', 'id firstName lastName email mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return {
      data: payouts as any,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error: any) {
    logger.error('Error fetching payouts:', {
      error: error.message || error,
      filters,
    });
    throw new ApiError(500, 'Failed to fetch payouts');
  }
};

/**
 * Get payout by ID
 */
export const getPayoutById = async (payoutId: string): Promise<Payout | null> => {
  try {
    const payout = await PayoutModel.findOne({ id: payoutId })
      .populate('booking', 'id booking_id status amount currency payment')
      .populate('transaction', 'id razorpay_payment_id status amount currency')
      .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
      .populate('academy_user', 'id firstName lastName email mobile')
      .lean();

    return payout as any;
  } catch (error: any) {
    logger.error('Error fetching payout:', {
      error: error.message || error,
      payoutId,
    });
    throw new ApiError(500, 'Failed to fetch payout');
  }
};

/**
 * Create transfer for a payout
 */
export const createTransfer = async (
  payoutId: string,
  adminUserId: string,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<Payout> => {
  try {
    // Find payout
    const payout = await PayoutModel.findOne({ id: payoutId })
      .populate('academy_payout_account')
      .populate('academy_user')
      .populate('booking');

    if (!payout) {
      throw new ApiError(404, 'Payout not found');
    }

    // Validate payout status
    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.FAILED) {
      throw new ApiError(400, `Cannot initiate transfer for payout in ${payout.status} status`);
    }

    // Find payout account - first try from payout reference, then from academy_user
    let payoutAccount = null;
    
    if (payout.academy_payout_account) {
      // Try to find account from payout reference
      payoutAccount = await AcademyPayoutAccountModel.findById(payout.academy_payout_account);
    }
    
    // If account not found from reference, try to find by academy_user
    if (!payoutAccount) {
      logger.info('Payout account not found in payout reference, searching by academy_user', {
        payoutId,
        academyUserId: payout.academy_user,
      });
      
      payoutAccount = await AcademyPayoutAccountModel.findOne({
        user: payout.academy_user,
        is_active: true,
      });
      
      // If found, update the payout record with the account reference
      if (payoutAccount) {
        payout.academy_payout_account = payoutAccount._id;
        await payout.save();
        logger.info('Updated payout with academy_payout_account reference', {
          payoutId,
          accountId: payoutAccount.id,
        });
      }
    }
    
    // Validate payout account (required for transfer initiation)
    if (!payoutAccount || !payoutAccount.is_active) {
      throw new ApiError(400, 'Payout account not found or inactive. Please create and activate payout account first.');
    }

    if (payoutAccount.activation_status !== 'activated') {
      throw new ApiError(400, 'Payout account is not activated. Please activate the account first.');
    }

    if (payoutAccount.ready_for_payout !== 'ready') {
      throw new ApiError(400, 'Payout account is not ready for payouts');
    }

    // Validate payout amount
    if (payout.payout_amount <= 0) {
      throw new ApiError(400, 'Payout amount must be greater than 0');
    }

    // Check if transfer already exists
    if (payout.razorpay_transfer_id) {
      throw new ApiError(400, 'Transfer already initiated for this payout');
    }

    // Get razorpay_account_id from the populated account reference
    const accountId = (payoutAccount as any)?.razorpay_account_id;
    if (!accountId) {
      throw new ApiError(400, 'Academy payout account does not have a Razorpay account ID. Account may not be activated.');
    }

    // Enqueue transfer job (will be processed in background)
    await enqueuePayoutTransfer({
      payoutId: payout.id,
      accountId: accountId,
      amount: payout.payout_amount,
      currency: payout.currency,
      notes: {
        payout_id: payout.id,
        booking_id: (payout.booking as any)?.id || payout.booking.toString(),
        transaction_id: payout.transaction.toString(),
        academy_user_id: (payout.academy_user as any)?.id || payout.academy_user.toString(),
      },
      adminUserId,
    });

    // Update payout status to processing
    payout.status = PayoutStatus.PROCESSING;
    await payout.save();

    // Create audit trail
    const adminUser = await UserModel.findOne({ id: adminUserId }).select('_id').lean();
    await createAuditTrail(
      ActionType.PAYOUT_TRANSFER_INITIATED,
      ActionScale.CRITICAL,
      `Transfer initiated for payout ${payoutId}`,
      'Payout',
      payout._id,
      {
        userId: adminUser?._id || null,
        metadata: {
          payout_id: payoutId,
          payout_amount: payout.payout_amount,
          account_id: accountId,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for transfer initiation', {
        error,
        payoutId,
      });
    });

    logger.info('Payout transfer initiated', {
      payoutId,
      amount: payout.payout_amount,
      accountId: accountId,
      adminUserId,
    });

    // Reload payout with populated fields
    const updatedPayout = await PayoutModel.findOne({ id: payoutId })
      .populate('booking', 'id booking_id status amount')
      .populate('transaction', 'id razorpay_payment_id status amount')
      .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
      .populate('academy_user', 'id firstName lastName email mobile')
      .lean();

    return updatedPayout as any;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error creating transfer:', {
      error: error.message || error,
      payoutId,
    });
    throw new ApiError(500, 'Failed to create transfer');
  }
};

/**
 * Retry failed transfer
 */
export const retryTransfer = async (
  payoutId: string,
  adminUserId: string,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<Payout> => {
  try {
    const payout = await PayoutModel.findOne({ id: payoutId });

    if (!payout) {
      throw new ApiError(404, 'Payout not found');
    }

    if (payout.status !== PayoutStatus.FAILED) {
      throw new ApiError(400, 'Can only retry failed payouts');
    }

    // Reset failure reason and retry
    payout.failure_reason = null;
    await payout.save();

    // Create transfer again
    return await createTransfer(payoutId, adminUserId, options);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error retrying transfer:', {
      error: error.message || error,
      payoutId,
    });
    throw new ApiError(500, 'Failed to retry transfer');
  }
};

/**
 * Cancel payout
 */
export const cancelPayout = async (
  payoutId: string,
  adminUserId: string,
  reason: string,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<Payout> => {
  try {
    const payout = await PayoutModel.findOne({ id: payoutId });

    if (!payout) {
      throw new ApiError(404, 'Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new ApiError(400, `Cannot cancel payout in ${payout.status} status`);
    }

    // Update payout status
    payout.status = PayoutStatus.CANCELLED;
    payout.failure_reason = reason;
    await payout.save();

    // Create audit trail
    const adminUser = await UserModel.findOne({ id: adminUserId }).select('_id').lean();
    await createAuditTrail(
      ActionType.PAYOUT_CANCELLED,
      ActionScale.HIGH,
      `Payout cancelled: ${reason}`,
      'Payout',
      payout._id,
      {
        userId: adminUser?._id || null,
        metadata: {
          payout_id: payoutId,
          reason,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        },
      }
    ).catch((error) => {
      logger.error('Failed to create audit trail for payout cancellation', {
        error,
        payoutId,
      });
    });

    logger.info('Payout cancelled', {
      payoutId,
      reason,
      adminUserId,
    });

    // Reload payout with populated fields
    const updatedPayout = await PayoutModel.findOne({ id: payoutId })
      .populate('booking', 'id booking_id status amount')
      .populate('transaction', 'id razorpay_payment_id status amount')
      .populate('academy_payout_account', 'id razorpay_account_id activation_status ready_for_payout')
      .populate('academy_user', 'id firstName lastName email mobile')
      .lean();

    return updatedPayout as any;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error cancelling payout:', {
      error: error.message || error,
      payoutId,
    });
    throw new ApiError(500, 'Failed to cancel payout');
  }
};

/**
 * Get payout statistics
 */
export const getPayoutStats = async (filters?: {
  academyUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  total_pending_amount: number;
  total_completed_amount: number;
  total_failed_amount: number;
}> => {
  try {
    const query: any = {};

    if (filters?.academyUserId) {
      const academyUser = await UserModel.findOne({ id: filters.academyUserId }).select('_id').lean();
      if (academyUser) {
        query.academy_user = academyUser._id;
      }
    }

    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    const stats = await PayoutModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$payout_amount' },
        },
      },
    ]);

    const result = {
      total_pending: 0,
      total_processing: 0,
      total_completed: 0,
      total_failed: 0,
      total_pending_amount: 0,
      total_completed_amount: 0,
      total_failed_amount: 0,
    };

    stats.forEach((stat) => {
      const status = stat._id;
      const count = stat.count;
      const amount = stat.total_amount;

      if (status === PayoutStatus.PENDING) {
        result.total_pending = count;
        result.total_pending_amount = amount;
      } else if (status === PayoutStatus.PROCESSING) {
        result.total_processing = count;
      } else if (status === PayoutStatus.COMPLETED) {
        result.total_completed = count;
        result.total_completed_amount = amount;
      } else if (status === PayoutStatus.FAILED) {
        result.total_failed = count;
        result.total_failed_amount = amount;
      }
    });

    return result;
  } catch (error: any) {
    logger.error('Error fetching payout stats:', {
      error: error.message || error,
      filters,
    });
    throw new ApiError(500, 'Failed to fetch payout statistics');
  }
};
