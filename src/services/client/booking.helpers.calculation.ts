import { config } from '../../config/env';

/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Re-export roundToTwoDecimals for convenience
 */
export { roundToTwoDecimals };

/**
 * Resolve per-participant fee from batch: use discounted_price only when set and > 0, else base_price.
 * Use this everywhere batch pricing drives booking amount, payout, or commission.
 */
export const getPerParticipantFee = (batch: {
  base_price: number;
  discounted_price?: number | null;
}): number =>
  batch.discounted_price != null && batch.discounted_price > 0
    ? batch.discounted_price
    : batch.base_price;

/**
 * Helper function to calculate price breakdown and commission
 * Used internally for booking creation
 * Note: GST is applied only on platform_fee, not on the entire amount
 */
export const calculatePriceBreakdownAndCommission = async (
  admissionFeePerParticipant: number,
  perParticipantFee: number,
  participantCount: number,
  baseAmount: number
): Promise<{
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
}> => {
  const { getSettings } = await import('../common/settings.service');
  const settings = await getSettings(false);
  
  const platformFee = (settings.fees?.platform_fee as number | undefined) ?? config.booking.platformFee;
  const gstPercentage = (settings.fees?.gst_percentage as number | undefined) ?? config.booking.gstPercentage;
  const isGstEnabled = (settings.fees?.gst_enabled as boolean | undefined) ?? true;
  let commissionRate = (settings.fees?.commission_rate as number | undefined) ?? 0;
  
  // Commission rate is stored as percentage (1-100) in settings
  // e.g., 10 = 10%, 100 = 100%
  // Convert to decimal (0-1) for calculations
  // Booking model expects rate between 0-1 (e.g., 0.10 for 10%)
  if (commissionRate >= 1) {
    // If rate is >= 1, it's stored as percentage (e.g., 10 for 10%), convert to decimal
    commissionRate = commissionRate / 100;
  }
 
  // Ensure commission rate is within valid range (0-1 after conversion)
  if (commissionRate < 0) {
    commissionRate = 0;
  } else if (commissionRate > 1) {
    commissionRate = 1; // Cap at 100%
  }
  
  // GST is applied only on platform_fee, not on the entire amount
  const gst = isGstEnabled ? roundToTwoDecimals((platformFee * gstPercentage) / 100) : 0;
  const subtotal = roundToTwoDecimals(baseAmount + platformFee);
  // Total amount: baseAmount + platformFee + GST (on platform_fee only)
  const calculatedTotalAmount = roundToTwoDecimals(baseAmount + platformFee + gst);
  const totalAdmissionFee = roundToTwoDecimals(admissionFeePerParticipant * participantCount);
  const totalBaseFee = roundToTwoDecimals(perParticipantFee * participantCount);
  const commissionAmount = roundToTwoDecimals(baseAmount * commissionRate);
  
  // Calculate payout amount: baseAmount - commissionAmount
  // If commission rate is 0 (0%), payout = full baseAmount (academy gets everything)
  // If commission rate is 1 (100%), payout = 0 (platform gets everything)
  // If commission rate is between 0 and 1, payout = baseAmount - commissionAmount
  let payoutAmount: number;
  if (commissionRate === 0 || commissionRate < 0.0001) {
    // No commission or negligible commission - academy gets full baseAmount
    payoutAmount = roundToTwoDecimals(baseAmount);
  } else if (commissionRate >= 0.9999) {
    // 100% commission (or very close to 100%) - academy gets nothing
    payoutAmount = 0;
  } else {
    // Partial commission - calculate payout
    payoutAmount = roundToTwoDecimals(baseAmount - commissionAmount);
  }
  
  // Ensure payout amount is in [0, baseAmount] (safety check)
  payoutAmount = Math.max(0, Math.min(roundToTwoDecimals(baseAmount), roundToTwoDecimals(payoutAmount)));

  const priceBreakdown = {
    admission_fee_per_participant: admissionFeePerParticipant,
    total_admission_fee: totalAdmissionFee,
    base_fee_per_participant: perParticipantFee,
    total_base_fee: totalBaseFee,
    batch_amount: baseAmount,
    platform_fee: platformFee,
    subtotal: subtotal, // This subtotal includes platform fee for internal use
    gst_percentage: gstPercentage,
    gst_amount: gst,
    total_amount: calculatedTotalAmount,
    participant_count: participantCount,
    currency: 'INR',
    calculated_at: new Date(),
  };

  const commission = {
    rate: commissionRate,
    amount: commissionAmount,
    payoutAmount: payoutAmount,
    calculatedAt: new Date(),
  };

  return { priceBreakdown, commission };
};
