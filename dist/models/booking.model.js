"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingModel = exports.BookingPayoutStatus = exports.BookingStatus = exports.PaymentStatus = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// Payment status enum
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["NOT_INITIATED"] = "not_initiated";
    PaymentStatus["INITIATED"] = "initiated";
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["SUCCESS"] = "success";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["CANCELLED"] = "cancelled";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
// Booking status enum
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["SLOT_BOOKED"] = "slot_booked";
    BookingStatus["APPROVED"] = "approved";
    BookingStatus["REJECTED"] = "rejected";
    BookingStatus["PAYMENT_PENDING"] = "payment_pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["CANCELLED"] = "cancelled";
    BookingStatus["COMPLETED"] = "completed";
    // Legacy status for backward compatibility
    BookingStatus["REQUESTED"] = "requested";
    BookingStatus["PENDING"] = "pending";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
// Booking payout status enum
var BookingPayoutStatus;
(function (BookingPayoutStatus) {
    BookingPayoutStatus["NOT_INITIATED"] = "not_initiated";
    BookingPayoutStatus["PENDING"] = "pending";
    BookingPayoutStatus["PROCESSING"] = "processing";
    BookingPayoutStatus["COMPLETED"] = "completed";
    BookingPayoutStatus["FAILED"] = "failed";
    BookingPayoutStatus["CANCELLED"] = "cancelled";
    BookingPayoutStatus["REFUNDED"] = "refunded";
})(BookingPayoutStatus || (exports.BookingPayoutStatus = BookingPayoutStatus = {}));
// Payment details sub-schema
const paymentDetailsSchema = new mongoose_1.Schema({
    razorpay_order_id: {
        type: String,
        default: null,
    },
    razorpay_payment_id: {
        type: String,
        default: null,
    },
    razorpay_signature: {
        type: String,
        default: null,
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
    status: {
        type: String,
        enum: Object.values(PaymentStatus),
        required: true,
        default: PaymentStatus.NOT_INITIATED, // Default for new bookings
    },
    payment_method: {
        type: String,
        default: null,
    },
    paid_at: {
        type: Date,
        default: null,
    },
    failure_reason: {
        type: String,
        default: null,
    },
    payment_initiated_count: {
        type: Number,
        default: 0,
        min: [0, 'Payment initiated count cannot be negative'],
    },
    payment_cancelled_count: {
        type: Number,
        default: 0,
        min: [0, 'Payment cancelled count cannot be negative'],
    },
    payment_failed_count: {
        type: Number,
        default: 0,
        min: [0, 'Payment failed count cannot be negative'],
    },
}, { _id: false });
// Commission details sub-schema
const commissionDetailsSchema = new mongoose_1.Schema({
    rate: {
        type: Number,
        required: true,
        min: [0, 'Commission rate cannot be negative'],
        max: [1, 'Commission rate cannot exceed 100%'],
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Commission amount cannot be negative'],
    },
    payoutAmount: {
        type: Number,
        required: true,
        min: [0, 'Payout amount cannot be negative'],
    },
    calculatedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, { _id: false });
// Price breakdown sub-schema
const priceBreakdownSchema = new mongoose_1.Schema({
    // Batch-related (Academy gets this)
    admission_fee_per_participant: {
        type: Number,
        required: true,
        min: [0, 'Admission fee cannot be negative'],
    },
    total_admission_fee: {
        type: Number,
        required: true,
        min: [0, 'Total admission fee cannot be negative'],
    },
    base_fee_per_participant: {
        type: Number,
        required: true,
        min: [0, 'Base fee cannot be negative'],
    },
    total_base_fee: {
        type: Number,
        required: true,
        min: [0, 'Total base fee cannot be negative'],
    },
    batch_amount: {
        type: Number,
        required: true,
        min: [0, 'Batch amount cannot be negative'],
    },
    // Platform charges (Academy doesn't see this)
    platform_fee: {
        type: Number,
        required: true,
        min: [0, 'Platform fee cannot be negative'],
    },
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal cannot be negative'],
    },
    gst_percentage: {
        type: Number,
        required: true,
        min: [0, 'GST percentage cannot be negative'],
    },
    gst_amount: {
        type: Number,
        required: true,
        min: [0, 'GST amount cannot be negative'],
    },
    total_amount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative'],
    },
    // Metadata
    participant_count: {
        type: Number,
        required: true,
        min: [1, 'Participant count must be at least 1'],
    },
    currency: {
        type: String,
        required: true,
        default: 'INR',
        uppercase: true,
    },
    calculated_at: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, { _id: false });
// Main booking schema
const bookingSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    booking_id: {
        type: String,
        default: null,
        unique: true,
        sparse: true,
        index: true,
        trim: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    participants: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'Participant',
        required: true,
        validate: {
            validator: function (value) {
                return Array.isArray(value) && value.length > 0;
            },
            message: 'At least one participant is required',
        },
    },
    batch: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
    },
    center: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        required: true,
    },
    sport: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Sport',
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
    status: {
        type: String,
        enum: Object.values(BookingStatus),
        required: true,
        default: BookingStatus.PAYMENT_PENDING, // Default for new bookings
    },
    payment: {
        type: paymentDetailsSchema,
        required: true,
    },
    commission: {
        type: commissionDetailsSchema,
        default: null,
    },
    priceBreakdown: {
        type: priceBreakdownSchema,
        default: null,
    },
    payout_status: {
        type: String,
        enum: Object.values(BookingPayoutStatus),
        default: BookingPayoutStatus.NOT_INITIATED,
    },
    notes: {
        type: String,
        default: null,
        maxlength: 1000,
    },
    cancellation_reason: {
        type: String,
        default: null,
        maxlength: 1000,
    },
    cancelled_by: {
        type: String,
        enum: ['user', 'academy', 'system'],
        default: null,
    },
    rejection_reason: {
        type: String,
        default: null,
        maxlength: 1000,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    payment_token: {
        type: String,
        default: null,
        sparse: true,
    },
    payment_token_expires_at: {
        type: Date,
        default: null,
    },
    payment_reminder_sent_hours: {
        type: [Number],
        default: [],
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
bookingSchema.index({ user: 1 });
bookingSchema.index({ participants: 1 });
bookingSchema.index({ batch: 1 });
bookingSchema.index({ center: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'payment.status': 1 });
bookingSchema.index({ 'payment.razorpay_order_id': 1 });
bookingSchema.index({ is_active: 1 });
bookingSchema.index({ is_deleted: 1 });
// Compound indexes
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ batch: 1, status: 1 });
bookingSchema.index({ user: 1, is_deleted: 1 });
bookingSchema.index({ is_deleted: 1, is_active: 1 }); // For active bookings count
bookingSchema.index({ is_deleted: 1, sport: 1 }); // For users with enrolled batch sports
bookingSchema.index({ is_deleted: 1, user: 1 }); // For distinct user queries
bookingSchema.index({ id: 1, user: 1, is_deleted: 1 }); // Optimize getBookingDetails query
bookingSchema.index({ payment_token: 1 }, { sparse: true }); // Public pay-by-token lookup
exports.BookingModel = (0, mongoose_1.model)('Booking', bookingSchema);
//# sourceMappingURL=booking.model.js.map