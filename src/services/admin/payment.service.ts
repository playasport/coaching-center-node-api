import { Types } from 'mongoose';
import { TransactionModel, Transaction, TransactionStatus, TransactionSource } from '../../models/transaction.model';
import { TransactionType } from '../../models/transaction.model';
import { BookingModel, PaymentStatus } from '../../models/booking.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

export interface GetAdminPaymentsParams {
  page?: number;
  limit?: number;
  userId?: string;
  bookingId?: string;
  status?: TransactionStatus;
  paymentMethod?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminPaymentListItem {
  id: string;
  payment_id: string;
  booking_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  failure_reason: string | null;
  processed_at: Date | null;
  created_at: Date;
}

export interface AdminPaginatedPaymentsResult {
  payments: AdminPaymentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentStats {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  totalAmount: number;
  successfulAmount: number;
  failedAmount: number;
  byPaymentMethod: Record<string, number>;
}

/**
 * Get all payments for admin (only payment type transactions)
 */
export const getAllPayments = async (
  params: GetAdminPaymentsParams = {}
): Promise<AdminPaginatedPaymentsResult> => {
  try {
    const query: any = {
      type: TransactionType.PAYMENT, // Only payment transactions
    };

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

    // Filter by payment method if provided
    if (params.paymentMethod) {
      query.payment_method = params.paymentMethod;
    }

    // Date range filter
    if (params.startDate || params.endDate) {
      query.created_at = {};
      if (params.startDate) {
        query.created_at.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.created_at.$lte = endDate;
      }
    }

    // Search by transaction ID, Razorpay order ID, or payment ID
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { id: searchRegex },
        { razorpay_order_id: searchRegex },
        { razorpay_payment_id: searchRegex },
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

    // Get payments with population
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

    const transformedPayments: AdminPaymentListItem[] = transactions
      .filter((tx: any) => tx.booking)
      .map((transaction: any) => {
        return {
          id: transaction.id,
          payment_id: transaction.id,
          booking_id: transaction.booking?.id || transaction.booking?.booking_id || 'N/A',
          user_name: transaction.user
            ? `${transaction.user.firstName || ''} ${transaction.user.lastName || ''}`.trim()
            : 'N/A',
          user_email: transaction.user?.email || 'N/A',
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          payment_method: transaction.payment_method || null,
          razorpay_order_id: transaction.razorpay_order_id,
          razorpay_payment_id: transaction.razorpay_payment_id || null,
          failure_reason: transaction.failure_reason || null,
          processed_at: transaction.processed_at || null,
          created_at: transaction.created_at,
        };
      });

    return {
      payments: transformedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Admin failed to get payments:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update payment status by admin
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: TransactionStatus,
  adminId?: string,
  notes?: string
): Promise<Transaction> => {
  try {
    const query = Types.ObjectId.isValid(paymentId) ? { _id: paymentId } : { id: paymentId };
    
    // First check if transaction exists at all
    const anyTransaction = await TransactionModel.findOne(query).lean();
    
    if (!anyTransaction) {
      logger.warn(`Transaction not found with ID: ${paymentId}`);
      throw new ApiError(404, `Transaction with ID ${paymentId} not found`);
    }
    
    // Check if it's a payment type
    if (anyTransaction.type !== TransactionType.PAYMENT) {
      logger.warn(`Transaction ${paymentId} exists but is of type ${anyTransaction.type}, not payment`);
      throw new ApiError(400, `Transaction with ID ${paymentId} is of type '${anyTransaction.type}', not 'payment'. Use /admin/transactions/:id to update this transaction.`);
    }
    
    // Now get the transaction document for updating
    const transaction = await TransactionModel.findOne({
      ...query,
      type: TransactionType.PAYMENT,
    });
    
    if (!transaction) {
      // This shouldn't happen if the checks above passed, but just in case
      throw new ApiError(404, `Payment with ID ${paymentId} not found`);
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

    // If payment is marked as success, also update booking payment status
    if (status === TransactionStatus.SUCCESS && transaction.razorpay_payment_id) {
      await BookingModel.findOneAndUpdate(
        { _id: transaction.booking },
        {
          $set: {
            'payment.status': PaymentStatus.SUCCESS,
            'payment.paid_at': new Date(),
          },
        }
      );
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

    logger.info(`Payment status updated to ${status} by admin ${adminId} for payment ${paymentId}`);
    return updatedTransaction as Transaction;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to update payment status:', error);
    throw new ApiError(500, 'Failed to update payment status');
  }
};

/**
 * Get payment statistics for admin dashboard
 */
export const getPaymentStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<PaymentStats> => {
  try {
    const dateQuery: any = {
      type: TransactionType.PAYMENT,
    };
    
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

    const successful = statusCounts.find((s: any) => s._id === TransactionStatus.SUCCESS)?.count || 0;
    const failed = statusCounts.find((s: any) => s._id === TransactionStatus.FAILED)?.count || 0;
    const pending = statusCounts.find((s: any) => s._id === TransactionStatus.PENDING)?.count || 0;

    // Get amount statistics
    const amountStats = await TransactionModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const successfulAmount = amountStats.find((s: any) => s._id === TransactionStatus.SUCCESS)?.totalAmount || 0;
    const failedAmount = amountStats.find((s: any) => s._id === TransactionStatus.FAILED)?.totalAmount || 0;
    
    const totalAmountResult = await TransactionModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);
    const totalAmount = totalAmountResult[0]?.totalAmount || 0;

    // Get payment method statistics
    const paymentMethodStats = await TransactionModel.aggregate([
      { 
        $match: {
          ...dateQuery,
          payment_method: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$payment_method',
          count: { $sum: 1 },
        },
      },
    ]);

    const byPaymentMethod: Record<string, number> = {};
    paymentMethodStats.forEach((item: any) => {
      byPaymentMethod[item._id] = item.count;
    });

    return {
      total,
      successful,
      failed,
      pending,
      totalAmount,
      successfulAmount,
      failedAmount,
      byPaymentMethod,
    };
  } catch (error) {
    logger.error('Admin failed to get payment stats:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

