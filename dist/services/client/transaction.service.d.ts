import { TransactionStatus, TransactionType } from '../../models/transaction.model';
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
export declare const getUserTransactions: (userId: string, params?: GetUserTransactionsParams) => Promise<UserPaginatedTransactionsResult>;
export declare const getUserTransactionById: (transactionId: string, userId: string) => Promise<any>;
//# sourceMappingURL=transaction.service.d.ts.map