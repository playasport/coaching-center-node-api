import { TransactionModel, TransactionStatus, TransactionType } from '../../models/transaction.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

export interface GetUserTransactionsParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserTransactionListItem {
  id: string;
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  rorder_id: string;
  payment_id: string | null;
  failure_reason: string | null;
  processed_at: Date | null;
  created_at: Date;
  booking: {
    id: string;
    booking_id: string;
    batch_name: string | null;
    center_name: string | null;
    sport_name: string | null;
  } | null;
}

export interface UserPaginatedTransactionsResult {
  transactions: UserTransactionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const getUserTransactions = async (
  userId: string,
  params: GetUserTransactionsParams = {}
): Promise<UserPaginatedTransactionsResult> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('errors.userNotFound'));
    }

    const query: any = { user: userObjectId };

    if (params.status) {
      query.status = params.status;
    }

    if (params.type) {
      query.type = params.type;
    }

    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) {
        query.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const total = await TransactionModel.countDocuments(query);

    const transactions = await TransactionModel.find(query)
      .select('-razorpay_signature -razorpay_webhook_data -metadata')
      .populate({
        path: 'booking',
        select: 'id booking_id batch center sport',
        match: { is_deleted: false },
        populate: [
          { path: 'batch', select: 'name' },
          { path: 'center', select: 'center_name' },
          { path: 'sport', select: 'name' },
        ],
      })
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    const transformedTransactions: UserTransactionListItem[] = transactions.map(
      (transaction: any) => ({
        id: transaction.id || transaction._id,
        transaction_id: transaction.transaction_id || null,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: transaction.payment_method || null,
        rorder_id: transaction.razorpay_order_id,
        payment_id: transaction.razorpay_payment_id || null,
        failure_reason: transaction.failure_reason || null,
        processed_at: transaction.processed_at || null,
        created_at: transaction.createdAt,
        booking: transaction.booking
          ? {
              id: transaction.booking.id || transaction.booking._id,
              booking_id: transaction.booking.booking_id || transaction.booking.id,
              batch_name: transaction.booking.batch?.name || null,
              center_name: transaction.booking.center?.center_name || null,
              sport_name: transaction.booking.sport?.name || null,
            }
          : null,
      })
    );

    return {
      transactions: transformedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to get user transactions:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

export const getUserTransactionById = async (
  transactionId: string,
  userId: string
): Promise<any> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('errors.userNotFound'));
    }

    const transaction = await TransactionModel.findOne({
      id: transactionId,
      user: userObjectId,
    })
      .select('-razorpay_signature -razorpay_webhook_data -metadata')
      .populate({
        path: 'booking',
        select: 'id booking_id amount currency status payment participants batch center sport',
        match: { is_deleted: false },
        populate: [
          { path: 'participants', select: 'id firstName lastName' },
          { path: 'batch', select: 'id name' },
          { path: 'center', select: 'id center_name' },
          { path: 'sport', select: 'id name' },
        ],
      })
      .lean();

    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    const result = transaction as any;

    if (result.booking?.payment) {
      const payment = result.booking.payment;
      delete payment.payment_initiated_count;
      delete payment.payment_cancelled_count;
      delete payment.payment_failed_count;
      delete payment.razorpay_signature;
    }

    return {
      id: result.id || result._id,
      transaction_id: result.transaction_id || null,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      payment_method: result.payment_method || null,
      rorder_id: result.razorpay_order_id,
      payment_id: result.razorpay_payment_id || null,
      refund_id: result.razorpay_refund_id || null,
      failure_reason: result.failure_reason || null,
      processed_at: result.processed_at || null,
      created_at: result.createdAt,
      booking: result.booking
        ? {
            id: result.booking.id || result.booking._id,
            booking_id: result.booking.booking_id || result.booking.id,
            amount: result.booking.amount,
            currency: result.booking.currency,
            status: result.booking.status,
            payment: result.booking.payment
              ? {
                  rorder_id: result.booking.payment.razorpay_order_id,
                  status: result.booking.payment.status,
                  payment_method: result.booking.payment.payment_method,
                  paid_at: result.booking.payment.paid_at,
                }
              : null,
            participants: result.booking.participants || [],
            batch: result.booking.batch || null,
            center: result.booking.center || null,
            sport: result.booking.sport || null,
          }
        : null,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to get user transaction by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
