import { Transaction, TransactionStatus, TransactionType, TransactionSource } from '../../models/transaction.model';
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
    status: string;
    payment_method: string | null;
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
export declare const getAllTransactions: (params?: GetAdminTransactionsParams) => Promise<AdminPaginatedTransactionsResult>;
/**
 * Get transaction by ID for admin
 */
export declare const getTransactionById: (id: string) => Promise<Transaction | null>;
/**
 * Update transaction status by admin (manual status update)
 */
export declare const updateTransactionStatus: (transactionId: string, status: TransactionStatus, adminId?: string, notes?: string) => Promise<Transaction | null>;
/**
 * Get transaction statistics for admin dashboard
 */
export declare const getTransactionStats: (params?: {
    startDate?: string;
    endDate?: string;
}) => Promise<TransactionStats>;
//# sourceMappingURL=transaction.service.d.ts.map