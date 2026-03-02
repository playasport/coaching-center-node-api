import { HydratedDocument, Types } from 'mongoose';
export declare enum ActionScale {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum ActionType {
    BOOKING_CREATED = "booking_created",
    BOOKING_REQUESTED = "booking_requested",
    BOOKING_APPROVED = "booking_approved",
    BOOKING_REJECTED = "booking_rejected",
    BOOKING_CONFIRMED = "booking_confirmed",
    BOOKING_CANCELLED = "booking_cancelled",
    BOOKING_COMPLETED = "booking_completed",
    PAYMENT_INITIATED = "payment_initiated",
    PAYMENT_SUCCESS = "payment_success",
    PAYMENT_FAILED = "payment_failed",
    ACADEMY_CREATED = "academy_created",
    ACADEMY_UPDATED = "academy_updated",
    ACADEMY_APPROVED = "academy_approved",
    ACADEMY_REJECTED = "academy_rejected",
    BATCH_CREATED = "batch_created",
    BATCH_UPDATED = "batch_updated",
    BATCH_PUBLISHED = "batch_published",
    BATCH_UNPUBLISHED = "batch_unpublished",
    USER_REGISTERED = "user_registered",
    USER_UPDATED = "user_updated",
    USER_DELETED = "user_deleted",
    SETTINGS_UPDATED = "settings_updated",
    ADMIN_ACTION = "admin_action",
    PAYOUT_ACCOUNT_CREATED = "payout_account_created",
    PAYOUT_ACCOUNT_UPDATED = "payout_account_updated",
    PAYOUT_ACCOUNT_BANK_DETAILS_UPDATED = "payout_account_bank_details_updated",
    PAYOUT_ACCOUNT_ACTIVATED = "payout_account_activated",
    PAYOUT_ACCOUNT_STATUS_CHANGED = "payout_account_status_changed",
    PAYOUT_CREATED = "payout_created",
    PAYOUT_TRANSFER_INITIATED = "payout_transfer_initiated",
    PAYOUT_TRANSFER_COMPLETED = "payout_transfer_completed",
    PAYOUT_TRANSFER_FAILED = "payout_transfer_failed",
    PAYOUT_CANCELLED = "payout_cancelled",
    PAYOUT_REFUNDED = "payout_refunded",
    REFUND_INITIATED = "refund_initiated",
    REFUND_COMPLETED = "refund_completed",
    REFUND_FAILED = "refund_failed"
}
export interface AuditTrail {
    id: string;
    action: ActionType;
    scale: ActionScale;
    label: string;
    entityType: string;
    entityId: Types.ObjectId | string;
    userId?: Types.ObjectId | null;
    academyId?: Types.ObjectId | null;
    bookingId?: Types.ObjectId | null;
    metadata?: Record<string, any> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
}
export type AuditTrailDocument = HydratedDocument<AuditTrail>;
export declare const AuditTrailModel: import("mongoose").Model<AuditTrail, {}, {}, {}, import("mongoose").Document<unknown, {}, AuditTrail, {}, {}> & AuditTrail & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=auditTrail.model.d.ts.map