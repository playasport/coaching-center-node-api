import { PayoutStatus } from '../../models/payout.model';
/**
 * Get payouts for academy user (basic data for list)
 */
export declare const getAcademyPayouts: (academyUserId: string, filters: {
    status?: PayoutStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}) => Promise<{
    data: Array<{
        id: string;
        booking_id: string | null;
        payout_amount: number;
        currency: string;
        status: PayoutStatus;
        payout_status: string;
        students: string[];
    }>;
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
 * Get payout details by ID for academy user
 */
export declare const getAcademyPayoutById: (payoutId: string, academyUserId: string) => Promise<{
    id: string;
    booking: {
        id: string;
        booking_id: string | null;
        currency: string;
        payout_status: string;
    };
    payout_amount: number;
    currency: string;
    status: PayoutStatus;
    failure_reason: string | null;
    processed_at: Date | null;
    students: Array<{
        id: string;
        firstName: string;
        lastName: string;
        fullName: string;
        gender: string;
        dob: Date | null;
        profilePhoto: string | null;
    }>;
}>;
/**
 * Get academy payout statistics
 */
export declare const getAcademyPayoutStats: (academyUserId: string, filters?: {
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