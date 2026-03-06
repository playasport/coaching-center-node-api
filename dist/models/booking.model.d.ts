import { HydratedDocument, Types } from 'mongoose';
export declare enum PaymentStatus {
    NOT_INITIATED = "not_initiated",// Payment not yet initiated (booking is SLOT_BOOKED or APPROVED, waiting for payment order creation)
    INITIATED = "initiated",// Razorpay order created, payment initiated, waiting for user to complete payment
    PENDING = "pending",// Payment initiated but not completed
    PROCESSING = "processing",// Payment is being processed
    SUCCESS = "success",// Payment successful
    FAILED = "failed",// Payment failed
    REFUNDED = "refunded",// Payment refunded
    CANCELLED = "cancelled"
}
export declare enum BookingStatus {
    SLOT_BOOKED = "slot_booked",// User has booked the slot, waiting for academy approval
    APPROVED = "approved",// Academy approved, waiting for payment
    REJECTED = "rejected",// Academy rejected the booking request
    PAYMENT_PENDING = "payment_pending",// Payment pending (legacy - for backward compatibility, also used for old flow)
    CONFIRMED = "confirmed",// Payment successful, booking confirmed
    CANCELLED = "cancelled",// Booking cancelled
    COMPLETED = "completed",// Booking completed
    REQUESTED = "requested",// Deprecated: Use SLOT_BOOKED instead
    PENDING = "pending"
}
export declare enum BookingPayoutStatus {
    NOT_INITIATED = "not_initiated",// Payout not yet created
    PENDING = "pending",// Payout created, waiting for transfer
    PROCESSING = "processing",// Transfer initiated
    COMPLETED = "completed",// Transfer successful
    FAILED = "failed",// Transfer failed
    CANCELLED = "cancelled",// Payout cancelled
    REFUNDED = "refunded"
}
export interface PaymentDetails {
    razorpay_order_id?: string | null;
    razorpay_payment_id?: string | null;
    razorpay_signature?: string | null;
    amount: number;
    currency: string;
    status: PaymentStatus;
    payment_method?: string | null;
    paid_at?: Date | null;
    failure_reason?: string | null;
    payment_initiated_count?: number;
    payment_cancelled_count?: number;
    payment_failed_count?: number;
}
export interface CommissionDetails {
    rate: number;
    amount: number;
    payoutAmount: number;
    calculatedAt: Date;
}
export interface PriceBreakdown {
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
}
export interface Booking {
    id: string;
    booking_id?: string | null;
    user: Types.ObjectId;
    participants: Types.ObjectId[];
    batch: Types.ObjectId;
    center: Types.ObjectId;
    sport: Types.ObjectId;
    amount: number;
    currency: string;
    status: BookingStatus;
    payment: PaymentDetails;
    commission?: CommissionDetails | null;
    priceBreakdown?: PriceBreakdown | null;
    payout_status?: BookingPayoutStatus | null;
    notes?: string | null;
    cancellation_reason?: string | null;
    cancelled_by?: 'user' | 'academy' | 'system' | null;
    rejection_reason?: string | null;
    is_active: boolean;
    is_deleted: boolean;
    deletedAt?: Date | null;
    /** Token for public payment URL (no login). Set when booking is APPROVED, expires per settings. */
    payment_token?: string | null;
    payment_token_expires_at?: Date | null;
    /** Hours-before-expiry at which we already sent a payment reminder (e.g. [12, 6, 2]). */
    payment_reminder_sent_hours?: number[] | null;
    createdAt: Date;
    updatedAt: Date;
}
export type BookingDocument = HydratedDocument<Booking>;
export declare const BookingModel: import("mongoose").Model<Booking, {}, {}, {}, import("mongoose").Document<unknown, {}, Booking, {}, {}> & Booking & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=booking.model.d.ts.map