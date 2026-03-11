"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = exports.TransactionSource = exports.TransactionStatus = exports.TransactionType = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
// Transaction type enum
var TransactionType;
(function (TransactionType) {
    TransactionType["PAYMENT"] = "payment";
    TransactionType["REFUND"] = "refund";
    TransactionType["PARTIAL_REFUND"] = "partial_refund";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
// Transaction status enum
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["SUCCESS"] = "success";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["CANCELLED"] = "cancelled";
    TransactionStatus["REFUNDED"] = "refunded";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
// Transaction source enum
var TransactionSource;
(function (TransactionSource) {
    TransactionSource["USER_VERIFICATION"] = "user_verification";
    TransactionSource["WEBHOOK"] = "webhook";
    TransactionSource["MANUAL"] = "manual";
})(TransactionSource || (exports.TransactionSource = TransactionSource = {}));
/**
 * Generate a unique transaction ID: TXN-YYYYMMDD-HHmmss-XXXXX
 */
function generateTransactionId() {
    const now = new Date();
    const date = now.getFullYear().toString()
        + (now.getMonth() + 1).toString().padStart(2, '0')
        + now.getDate().toString().padStart(2, '0');
    const time = now.getHours().toString().padStart(2, '0')
        + now.getMinutes().toString().padStart(2, '0')
        + now.getSeconds().toString().padStart(2, '0');
    const random = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
    return `TXN-${date}-${time}-${random}`;
}
// Main transaction schema
const transactionSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    transaction_id: {
        type: String,
        unique: true,
        index: true,
        default: generateTransactionId,
    },
    booking: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    razorpay_order_id: {
        type: String,
        required: true,
    },
    razorpay_payment_id: {
        type: String,
        default: null,
    },
    razorpay_refund_id: {
        type: String,
        default: null,
    },
    type: {
        type: String,
        enum: Object.values(TransactionType),
        required: true,
        default: TransactionType.PAYMENT,
    },
    status: {
        type: String,
        enum: Object.values(TransactionStatus),
        required: true,
        default: TransactionStatus.PENDING,
    },
    source: {
        type: String,
        enum: Object.values(TransactionSource),
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative'],
    },
    currency: {
        type: String,
        required: true,
        default: 'INR',
        uppercase: true,
    },
    payment_method: {
        type: String,
        default: null,
    },
    razorpay_signature: {
        type: String,
        default: null,
    },
    failure_reason: {
        type: String,
        default: null,
    },
    razorpay_webhook_data: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    processed_at: {
        type: Date,
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
        },
    },
    toObject: {
        transform(_doc, ret) {
            const result = ret;
            result.id = result.id ?? result._id;
            delete result._id;
        },
    },
});
// Indexes for better query performance
transactionSchema.index({ booking: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ razorpay_order_id: 1 });
transactionSchema.index({ razorpay_payment_id: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ source: 1 });
transactionSchema.index({ createdAt: -1 });
// Compound indexes
transactionSchema.index({ booking: 1, status: 1 });
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ razorpay_order_id: 1, razorpay_payment_id: 1 });
exports.TransactionModel = (0, mongoose_1.model)('Transaction', transactionSchema);
//# sourceMappingURL=transaction.model.js.map