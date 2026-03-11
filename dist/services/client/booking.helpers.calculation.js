"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePriceBreakdownAndCommission = exports.getPerParticipantFee = exports.roundToTwoDecimals = void 0;
const env_1 = require("../../config/env");
/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value) => {
    return Math.round(value * 100) / 100;
};
exports.roundToTwoDecimals = roundToTwoDecimals;
/**
 * Resolve per-participant fee from batch: use discounted_price only when set and > 0, else base_price.
 * Use this everywhere batch pricing drives booking amount, payout, or commission.
 */
const getPerParticipantFee = (batch) => batch.discounted_price != null && batch.discounted_price > 0
    ? batch.discounted_price
    : batch.base_price;
exports.getPerParticipantFee = getPerParticipantFee;
/**
 * Helper function to calculate price breakdown and commission
 * Used internally for booking creation
 * Note: GST is applied only on platform_fee, not on the entire amount
 */
const calculatePriceBreakdownAndCommission = async (admissionFeePerParticipant, perParticipantFee, participantCount, baseAmount) => {
    const { getSettings } = await Promise.resolve().then(() => __importStar(require('../common/settings.service')));
    const settings = await getSettings(false);
    const platformFee = settings.fees?.platform_fee ?? env_1.config.booking.platformFee;
    const gstPercentage = settings.fees?.gst_percentage ?? env_1.config.booking.gstPercentage;
    const isGstEnabled = settings.fees?.gst_enabled ?? true;
    let commissionRate = settings.fees?.commission_rate ?? 0;
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
    }
    else if (commissionRate > 1) {
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
    let payoutAmount;
    if (commissionRate === 0 || commissionRate < 0.0001) {
        // No commission or negligible commission - academy gets full baseAmount
        payoutAmount = roundToTwoDecimals(baseAmount);
    }
    else if (commissionRate >= 0.9999) {
        // 100% commission (or very close to 100%) - academy gets nothing
        payoutAmount = 0;
    }
    else {
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
exports.calculatePriceBreakdownAndCommission = calculatePriceBreakdownAndCommission;
//# sourceMappingURL=booking.helpers.calculation.js.map