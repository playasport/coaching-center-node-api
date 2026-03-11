import { HydratedDocument, Types } from 'mongoose';
export declare enum TransactionType {
    PAYMENT = "payment",
    REFUND = "refund",
    PARTIAL_REFUND = "partial_refund"
}
export declare enum TransactionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum TransactionSource {
    USER_VERIFICATION = "user_verification",
    WEBHOOK = "webhook",
    MANUAL = "manual"
}
export interface Transaction {
    id: string;
    transaction_id: string;
    booking: Types.ObjectId;
    user: Types.ObjectId;
    razorpay_order_id: string;
    razorpay_payment_id?: string | null;
    razorpay_refund_id?: string | null;
    type: TransactionType;
    status: TransactionStatus;
    source: TransactionSource;
    amount: number;
    currency: string;
    payment_method?: string | null;
    razorpay_signature?: string | null;
    failure_reason?: string | null;
    razorpay_webhook_data?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
    processed_at?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type TransactionDocument = HydratedDocument<Transaction>;
export declare const TransactionModel: import("mongoose").Model<Transaction, {}, {}, {}, import("mongoose").Document<unknown, {}, Transaction, {}, {}> & Transaction & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=transaction.model.d.ts.map