import { Types } from 'mongoose';
import { TransactionModel, Transaction, TransactionStatus, TransactionType, TransactionSource } from '../../models/transaction.model';
import { BookingModel } from '../../models/booking.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

export interface GetAdminTransactionsParams {
  page?: number;
  limit?: number;
  userId?: string;
  bookingId?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  source?: TransactionSource;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminTransactionListItem {
  id: string;
  transaction_id: string;
  booking_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  source: string;
  payment_method: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_refund_id: string | null;
  failure_reason: string | null;
  processed_at: Date | null;
  created_at: Date;
}

export interface AdminPaginatedTransactionsResult {
  transactions: AdminTransactionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionStats {
  total: number;
  byStatus: {
    pending: number;
    processing: number;
    success: number;
    failed: number;
    cancelled: number;
    refunded: number;
  };
  byType: {
    payment: number;
    refund: number;
    partial_refund: number;
  };
  totalAmount: number;
  successAmount: number;
  failedAmount: number;
  refundedAmount: number;
}

/**
 * Get all transactions for admin with filters and pagination
 */
export const getAllTransactions = async (
  params: GetAdminTransactionsParams = {}
): Promise<AdminPaginatedTransactionsResult> => {
  try {
    const query: any = {};

    // Filter by user if provided
    if (params.userId) {
      const userObjectId = await getUserObjectId(params.userId);
      if (userObjectId) {
        query.user = userObjectId;
      }
    }

    // Filter by booking if provided
    if (params.bookingId) {
      const queryId = Types.ObjectId.isValid(params.bookingId) 
        ? { _id: new Types.ObjectId(params.bookingId) }
        : { id: params.bookingId };
      
      const booking = await BookingModel.findOne(queryId).lean();
      if (booking) {
        query.booking = booking._id;
      }
    }

    // Filter by status if provided
    if (params.status) {
      query.status = params.status;
    }

    // Filter by type if provided
    if (params.type) {
      query.type = params.type;
    }

    // Filter by source if provided
    if (params.source) {
      query.source = params.source;
    }

    // Date range filter
    if (params.startDate || params.endDate) {
      query.created_at = {};
      if (params.startDate) {
        query.created_at.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.created_at.$lte = endDate;
      }
    }

    // Search by transaction ID, Razorpay order ID, payment ID, or refund ID
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { id: searchRegex },
        { razorpay_order_id: searchRegex },
        { razorpay_payment_id: searchRegex },
        { razorpay_refund_id: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await TransactionModel.countDocuments(query);

    // Get transactions with population
    const transactions = await TransactionModel.find(query)
      .populate('user', 'firstName lastName email mobile')
      .populate({
        path: 'booking',
        select: 'id booking_id',
        match: { is_deleted: false },
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedTransactions: AdminTransactionListItem[] = transactions
      .filter((tx: any) => tx.booking) // Filter out transactions with deleted bookings
      .map((transaction: any) => {
        return {
          id: transaction.id,
          transaction_id: transaction.id,
          booking_id: transaction.booking?.id || transaction.booking?.booking_id || 'N/A',
          user_name: transaction.user
            ? `${transaction.user.firstName || ''} ${transaction.user.lastName || ''}`.trim()
            : 'N/A',
          user_email: transaction.user?.email || 'N/A',
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          status: transaction.status,
          source: transaction.source,
          payment_method: transaction.payment_method || null,
          razorpay_order_id: transaction.razorpay_order_id,
          razorpay_payment_id: transaction.razorpay_payment_id || null,
          razorpay_refund_id: transaction.razorpay_refund_id || null,
          failure_reason: transaction.failure_reason || null,
          processed_at: transaction.processed_at || null,
          created_at: transaction.created_at,
        };
      });

    return {
      transactions: transformedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Admin failed to get transactions:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get transaction by ID for admin
 */
export const getTransactionById = async (id: string): Promise<Transaction | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const transaction = await TransactionModel.findOne(query)
      .populate('user', 'id firstName lastName email mobile profileImage')
      .populate({
        path: 'booking',
        select: 'id booking_id amount currency status payment participants batch center sport',
        populate: [
          { path: 'participants', select: 'id firstName lastName' },
          { path: 'batch', select: 'id name' },
          { path: 'center', select: 'id center_name' },
          { path: 'sport', select: 'id name' },
        ],
        match: { is_deleted: false },
      })
      .lean();

    return transaction as Transaction | null;
  } catch (error) {
    logger.error('Admin failed to get transaction by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update transaction status by admin (manual status update)
 */
export const updateTransactionStatus = async (
  transactionId: string,
  status: TransactionStatus,
  adminId?: string,
  notes?: string
): Promise<Transaction | null> => {
  try {
    const query = Types.ObjectId.isValid(transactionId) ? { _id: transactionId } : { id: transactionId };
    const transaction = await TransactionModel.findOne(query);
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    // Update metadata with admin action
    const metadata = transaction.metadata || {};
    if (adminId) {
      metadata.adminUpdatedBy = adminId;
      metadata.adminUpdatedAt = new Date();
    }
    if (notes) {
      metadata.adminNotes = notes;
    }

    const updatedTransaction = await TransactionModel.findOneAndUpdate(
      query,
      {
        $set: {
          status,
          source: TransactionSource.MANUAL,
          metadata,
        },
      },
      { new: true }
    )
      .populate('user', 'id firstName lastName email mobile')
      .populate({
        path: 'booking',
        select: 'id booking_id',
        match: { is_deleted: false },
      })
      .lean();

    logger.info(`Transaction status updated to ${status} by admin ${adminId} for transaction ${transactionId}`);
    return updatedTransaction as Transaction | null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to update transaction status:', error);
    throw new ApiError(500, 'Failed to update transaction status');
  }
};

/**
 * Get transaction statistics for admin dashboard
 */
export const getTransactionStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<TransactionStats> => {
  try {
    const dateQuery: any = {};
    
    if (params?.startDate || params?.endDate) {
      dateQuery.created_at = {};
      if (params.startDate) {
        dateQuery.created_at.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.created_at.$lte = endDate;
      }
    }

    // Get total count
    const total = await TransactionModel.countDocuments(dateQuery);

    // Get counts by status
    const statusCounts = await TransactionModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus: any = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
    };

    statusCounts.forEach((item: any) => {
      if (byStatus.hasOwnProperty(item._id)) {
        byStatus[item._id] = item.count;
      }
    });

    // Get counts by type
    const typeCounts = await TransactionModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const byType: any = {
      payment: 0,
      refund: 0,
      partial_refund: 0,
    };

    typeCounts.forEach((item: any) => {
      if (byType.hasOwnProperty(item._id)) {
        byType[item._id] = item.count;
      }
    });

    // Get amount statistics
    const amountStats = await TransactionModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          successAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', TransactionStatus.SUCCESS] }, '$amount', 0],
            },
          },
          failedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', TransactionStatus.FAILED] }, '$amount', 0],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', [TransactionStatus.REFUNDED]] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = amountStats[0] || {
      totalAmount: 0,
      successAmount: 0,
      failedAmount: 0,
      refundedAmount: 0,
    };

    return {
      total,
      byStatus,
      byType,
      totalAmount: stats.totalAmount || 0,
      successAmount: stats.successAmount || 0,
      failedAmount: stats.failedAmount || 0,
      refundedAmount: stats.refundedAmount || 0,
    };
  } catch (error) {
    logger.error('Admin failed to get transaction stats:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

