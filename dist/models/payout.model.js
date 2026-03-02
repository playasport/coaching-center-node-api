"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutModel = exports.PayoutStatus = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// Payout status enum
var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["PENDING"] = "pending";
    PayoutStatus["PROCESSING"] = "processing";
    PayoutStatus["COMPLETED"] = "completed";
    PayoutStatus["FAILED"] = "failed";
    PayoutStatus["CANCELLED"] = "cancelled";
    PayoutStatus["REFUNDED"] = "refunded";
})(PayoutStatus || (exports.PayoutStatus = PayoutStatus = {}));
// Payout schema
const payoutSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    transaction: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
    },
    academy_payout_account: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'AcademyPayoutAccount',
        required: false,
        default: null,
    },
    academy_user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative'],
    },
    batch_amount: {
        type: Number,
        required: true,
        min: [0, 'Batch amount cannot be negative'],
    },
    commission_rate: {
        type: Number,
        required: true,
        min: [0, 'Commission rate cannot be negative'],
        max: [1, 'Commission rate cannot exceed 1 (100%)'],
    },
    commission_amount: {
        type: Number,
        required: true,
        min: [0, 'Commission amount cannot be negative'],
    },
    payout_amount: {
        type: Number,
        required: true,
        min: [0, 'Payout amount cannot be negative'],
    },
    currency: {
        type: String,
        required: true,
        default: 'INR',
        uppercase: true,
    },
    status: {
        type: String,
        enum: Object.values(PayoutStatus),
        required: true,
        default: PayoutStatus.PENDING,
    },
    razorpay_transfer_id: {
        type: String,
        default: null,
    },
    refund_amount: {
        type: Number,
        default: null,
        min: [0, 'Refund amount cannot be negative'],
    },
    adjusted_payout_amount: {
        type: Number,
        default: null,
        min: [0, 'Adjusted payout amount cannot be negative'],
    },
    transfer_notes: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    failure_reason: {
        type: String,
        default: null,
    },
    processed_at: {
        type: Date,
        default: null,
    },
    scheduled_at: {
        type: Date,
        default: null,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.__v;
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
            delete result.__v;
        },
    },
});
// Indexes for better query performance
payoutSchema.index({ booking: 1 }, { unique: true }); // One payout per booking
payoutSchema.index({ transaction: 1 }, { unique: true }); // One payout per transaction
payoutSchema.index({ academy_user: 1, status: 1, createdAt: -1 });
payoutSchema.index({ academy_payout_account: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ razorpay_transfer_id: 1 });
payoutSchema.index({ scheduled_at: 1 }); // For scheduled payouts
payoutSchema.index({ status: 1, scheduled_at: 1 });
exports.PayoutModel = (0, mongoose_1.model)('Payout', payoutSchema);
//# sourceMappingURL=payout.model.js.map