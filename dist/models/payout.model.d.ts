import { HydratedDocument, Types } from 'mongoose';
export declare enum PayoutStatus {
    PENDING = "pending",// Payout created, waiting for admin to initiate transfer
    PROCESSING = "processing",// Transfer initiated, waiting for Razorpay to process
    COMPLETED = "completed",// Transfer successful
    FAILED = "failed",// Transfer failed
    CANCELLED = "cancelled",// Payout cancelled by admin
    REFUNDED = "refunded"
}
export interface Payout {
    id: string;
    booking: Types.ObjectId;
    transaction: Types.ObjectId;
    academy_payout_account?: Types.ObjectId | null;
    academy_user: Types.ObjectId;
    amount: number;
    batch_amount: number;
    commission_rate: number;
    commission_amount: number;
    payout_amount: number;
    currency: string;
    status: PayoutStatus;
    razorpay_transfer_id?: string | null;
    refund_amount?: number | null;
    adjusted_payout_amount?: number | null;
    transfer_notes?: Record<string, any> | null;
    failure_reason?: string | null;
    processed_at?: Date | null;
    scheduled_at?: Date | null;
    metadata?: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}
export type PayoutDocument = HydratedDocument<Payout>;
export declare const PayoutModel: import("mongoose").Model<Payout, {}, {}, {}, import("mongoose").Document<unknown, {}, Payout, {}, {}> & Payout & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=payout.model.d.ts.map