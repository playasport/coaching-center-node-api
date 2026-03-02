import { Payout, PayoutStatus } from '../../models/payout.model';
/**
 * Get all payouts with filters and pagination
 */
export declare const getPayouts: (filters: {
    status?: PayoutStatus;
    academyUserId?: string;
    bookingId?: string;
    transactionId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}) => Promise<{
    data: Payout[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}>;
/**
 * Get payout by ID
 */
export declare const getPayoutById: (payoutId: string) => Promise<Payout | null>;
/**
 * Create transfer for a payout
 */
export declare const createTransfer: (payoutId: string, adminUserId: string, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<Payout>;
/**
 * Retry failed transfer
 */
export declare const retryTransfer: (payoutId: string, adminUserId: string, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<Payout>;
/**
 * Cancel payout
 */
export declare const cancelPayout: (payoutId: string, adminUserId: string, reason: string, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<Payout>;
/**
 * Get payout statistics
 */
export declare const getPayoutStats: (filters?: {
    academyUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}) => Promise<{
    total_pending: number;
    total_processing: number;
    total_completed: number;
    total_failed: number;
    total_pending_amount: number;
    total_completed_amount: number;
    total_failed_amount: number;
}>;
//# sourceMappingURL=payout.service.d.ts.map