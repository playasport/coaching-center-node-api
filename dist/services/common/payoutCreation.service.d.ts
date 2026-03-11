export interface CreatePayoutParams {
    bookingId: string;
    transactionId: string;
    academyUserId: string;
    amount: number;
    batchAmount: number;
    commissionRate: number;
    commissionAmount: number;
    payoutAmount: number;
    currency: string;
}
/**
 * Create payout record directly (synchronous)
 * This replaces the queue-based payout creation
 */
export declare const createPayoutRecord: (params: CreatePayoutParams) => Promise<{
    success: boolean;
    payoutId?: string;
    skipped?: boolean;
    reason?: string;
}>;
//# sourceMappingURL=payoutCreation.service.d.ts.map