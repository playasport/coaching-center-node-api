"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrailModel = exports.ActionType = exports.ActionScale = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// Action scale/label enum
var ActionScale;
(function (ActionScale) {
    ActionScale["LOW"] = "low";
    ActionScale["MEDIUM"] = "medium";
    ActionScale["HIGH"] = "high";
    ActionScale["CRITICAL"] = "critical";
})(ActionScale || (exports.ActionScale = ActionScale = {}));
// Action type enum
var ActionType;
(function (ActionType) {
    // Booking actions
    ActionType["BOOKING_CREATED"] = "booking_created";
    ActionType["BOOKING_REQUESTED"] = "booking_requested";
    ActionType["BOOKING_APPROVED"] = "booking_approved";
    ActionType["BOOKING_REJECTED"] = "booking_rejected";
    ActionType["BOOKING_CONFIRMED"] = "booking_confirmed";
    ActionType["BOOKING_CANCELLED"] = "booking_cancelled";
    ActionType["BOOKING_COMPLETED"] = "booking_completed";
    ActionType["PAYMENT_INITIATED"] = "payment_initiated";
    ActionType["PAYMENT_SUCCESS"] = "payment_success";
    ActionType["PAYMENT_FAILED"] = "payment_failed";
    ActionType["PAYMENT_REMINDER_SENT"] = "payment_reminder_sent";
    // Academy actions
    ActionType["ACADEMY_CREATED"] = "academy_created";
    ActionType["ACADEMY_UPDATED"] = "academy_updated";
    ActionType["ACADEMY_APPROVED"] = "academy_approved";
    ActionType["ACADEMY_REJECTED"] = "academy_rejected";
    // Batch actions
    ActionType["BATCH_CREATED"] = "batch_created";
    ActionType["BATCH_UPDATED"] = "batch_updated";
    ActionType["BATCH_PUBLISHED"] = "batch_published";
    ActionType["BATCH_UNPUBLISHED"] = "batch_unpublished";
    // User actions
    ActionType["USER_REGISTERED"] = "user_registered";
    ActionType["USER_UPDATED"] = "user_updated";
    ActionType["USER_DELETED"] = "user_deleted";
    // Admin actions
    ActionType["SETTINGS_UPDATED"] = "settings_updated";
    ActionType["ADMIN_ACTION"] = "admin_action";
    // Payout account actions
    ActionType["PAYOUT_ACCOUNT_CREATED"] = "payout_account_created";
    ActionType["PAYOUT_ACCOUNT_UPDATED"] = "payout_account_updated";
    ActionType["PAYOUT_ACCOUNT_BANK_DETAILS_UPDATED"] = "payout_account_bank_details_updated";
    ActionType["PAYOUT_ACCOUNT_ACTIVATED"] = "payout_account_activated";
    ActionType["PAYOUT_ACCOUNT_STATUS_CHANGED"] = "payout_account_status_changed";
    // Payout actions
    ActionType["PAYOUT_CREATED"] = "payout_created";
    ActionType["PAYOUT_TRANSFER_INITIATED"] = "payout_transfer_initiated";
    ActionType["PAYOUT_TRANSFER_COMPLETED"] = "payout_transfer_completed";
    ActionType["PAYOUT_TRANSFER_FAILED"] = "payout_transfer_failed";
    ActionType["PAYOUT_CANCELLED"] = "payout_cancelled";
    ActionType["PAYOUT_REFUNDED"] = "payout_refunded";
    // Refund actions
    ActionType["REFUND_INITIATED"] = "refund_initiated";
    ActionType["REFUND_COMPLETED"] = "refund_completed";
    ActionType["REFUND_FAILED"] = "refund_failed";
})(ActionType || (exports.ActionType = ActionType = {}));
// Audit Trail schema
const auditTrailSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    action: {
        type: String,
        enum: Object.values(ActionType),
        required: true,
        index: true,
    },
    scale: {
        type: String,
        enum: Object.values(ActionScale),
        required: true,
        index: true,
    },
    label: {
        type: String,
        required: true,
        maxlength: 255,
    },
    entityType: {
        type: String,
        required: true,
        index: true,
    },
    entityId: {
        type: mongoose_1.Schema.Types.Mixed, // Can be ObjectId or string
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    academyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        default: null,
        index: true,
    },
    bookingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null,
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    ipAddress: {
        type: String,
        default: null,
    },
    userAgent: {
        type: String,
        default: null,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
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
auditTrailSchema.index({ action: 1, createdAt: -1 });
auditTrailSchema.index({ entityType: 1, entityId: 1 });
auditTrailSchema.index({ userId: 1, createdAt: -1 });
auditTrailSchema.index({ academyId: 1, createdAt: -1 });
auditTrailSchema.index({ bookingId: 1, createdAt: -1 });
auditTrailSchema.index({ scale: 1, createdAt: -1 });
auditTrailSchema.index({ createdAt: -1 }); // For time-based queries
// Compound indexes
auditTrailSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditTrailSchema.index({ userId: 1, action: 1, createdAt: -1 });
auditTrailSchema.index({ bookingId: 1, action: 1, createdAt: -1 });
exports.AuditTrailModel = (0, mongoose_1.model)('AuditTrail', auditTrailSchema);
//# sourceMappingURL=auditTrail.model.js.map