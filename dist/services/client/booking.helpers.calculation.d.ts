/**
 * Round number to 2 decimal places
 */
declare const roundToTwoDecimals: (value: number) => number;
/**
 * Re-export roundToTwoDecimals for convenience
 */
export { roundToTwoDecimals };
/**
 * Resolve per-participant fee from batch: use discounted_price only when set and > 0, else base_price.
 * Use this everywhere batch pricing drives booking amount, payout, or commission.
 */
export declare const getPerParticipantFee: (batch: {
    base_price: number;
    discounted_price?: number | null;
}) => number;
/**
 * Helper function to calculate price breakdown and commission
 * Used internally for booking creation
 * Note: GST is applied only on platform_fee, not on the entire amount
 */
export declare const calculatePriceBreakdownAndCommission: (admissionFeePerParticipant: number, perParticipantFee: number, participantCount: number, baseAmount: number) => Promise<{
    priceBreakdown: {
        admission_fee_per_participant: number;
        total_admission_fee: number;
        base_fee_per_participant: number;
        total_base_fee: number;
        batch_amount: number;
        platform_fee: number;
        subtotal: number;
        gst_percentage: number;
        gst_amount: number;
        total_amount: number;
        participant_count: number;
        currency: string;
        calculated_at: Date;
    };
    commission: {
        rate: number;
        amount: number;
        payoutAmount: number;
        calculatedAt: Date;
    };
}>;
//# sourceMappingURL=booking.helpers.calculation.d.ts.map