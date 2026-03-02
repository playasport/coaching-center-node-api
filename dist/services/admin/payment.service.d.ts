import { Transaction, TransactionStatus } from '../../models/transaction.model';
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
    failure_reason: string | null;
    processed_at: Date | null;
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
export declare const getAllPayments: (params?: GetAdminPaymentsParams) => Promise<AdminPaginatedPaymentsResult>;
/**
 * Update payment status by admin
 */
export declare const updatePaymentStatus: (paymentId: string, status: TransactionStatus, adminId?: string, notes?: string) => Promise<Transaction>;
/**
 * Get payment statistics for admin dashboard
 */
export declare const getPaymentStats: (params?: {
    startDate?: string;
    endDate?: string;
}) => Promise<PaymentStats>;
/**
 * Get payment by ID for admin (only payment type transactions)
 */
export declare const getPaymentById: (id: string) => Promise<Transaction | null>;
//# sourceMappingURL=payment.service.d.ts.map