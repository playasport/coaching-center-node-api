import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Transaction type enum
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
}

// Transaction status enum
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Transaction source enum
export enum TransactionSource {
  USER_VERIFICATION = 'user_verification',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
}

// Transaction interface
export interface Transaction {
  id: string;
  booking: Types.ObjectId; // Reference to Booking model
  user: Types.ObjectId; // Reference to User model
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  razorpay_refund_id?: string | null;
  type: TransactionType;
  status: TransactionStatus;
  source: TransactionSource; // How the transaction was created/verified
  amount: number; // Amount in rupees
  currency: string;
  payment_method?: string | null;
  razorpay_signature?: string | null; // For payment verification
  failure_reason?: string | null;
  razorpay_webhook_data?: Record<string, any> | null; // Store full webhook payload
  metadata?: Record<string, any> | null; // Additional metadata
  processed_at?: Date | null;
  created_at: Date;
  updatedAt: Date;
}

export type TransactionDocument = HydratedDocument<Transaction>;

// Main transaction schema
const transactionSchema = new Schema<Transaction>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    razorpay_order_id: {
      type: String,
      required: true,
      index: true,
    },
    razorpay_payment_id: {
      type: String,
      default: null,
      index: true,
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
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(TransactionSource),
      required: true,
      index: true,
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
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    processed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
      },
    },
  }
);

// Indexes for better query performance
transactionSchema.index({ booking: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ razorpay_order_id: 1 });
transactionSchema.index({ razorpay_payment_id: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ source: 1 });
transactionSchema.index({ created_at: -1 });

// Compound indexes
transactionSchema.index({ booking: 1, status: 1 });
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ razorpay_order_id: 1, razorpay_payment_id: 1 });

export const TransactionModel = model<Transaction>('Transaction', transactionSchema);

