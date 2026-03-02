/**
 * Create refund for a booking
 */
export declare const createRefund: (bookingId: string, adminUserId: string, refundData: {
    amount?: number;
    reason: string;
}, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<{
    booking: any;
    refund: any;
    payout?: any;
}>;
/**
 * Get refund details
 */
export declare const getRefundDetails: (refundId: string) => Promise<any>;
//# sourceMappingURL=refund.service.d.ts.map