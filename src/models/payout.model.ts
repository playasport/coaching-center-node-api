import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Payout status enum
export enum PayoutStatus {
  PENDING = 'pending',           // Payout created, waiting for admin to initiate transfer
  PROCESSING = 'processing',     // Transfer initiated, waiting for Razorpay to process
  COMPLETED = 'completed',      // Transfer successful
  FAILED = 'failed',             // Transfer failed
  CANCELLED = 'cancelled',       // Payout cancelled by admin
  REFUNDED = 'refunded',         // Payout refunded (booking refunded)
}

// Payout interface
export interface Payout {
  id: string;
  booking: Types.ObjectId; // Reference to Booking model
  transaction: Types.ObjectId; // Reference to Transaction model
  academy_payout_account: Types.ObjectId; // Reference to AcademyPayoutAccount model
  academy_user: Types.ObjectId; // Reference to User model (academy owner)
  
  // Amount details
  amount: number;              // Total booking amount (what user paid)
  batch_amount: number;        // Academy's share (admission + base fee)
  commission_rate: number;     // Commission rate used (e.g., 0.10 for 10%)
  commission_amount: number;   // Commission deducted
  payout_amount: number;       // Final amount to transfer (batch_amount - commission_amount)
  currency: string;            // Currency (INR)
  
  // Status and processing
  status: PayoutStatus;
  razorpay_transfer_id?: string | null; // Razorpay transfer ID (after transfer created)
  razorpay_account_id: string; // Academy's Razorpay account ID
  
  // Refund handling
  refund_amount?: number | null; // If refunded, amount refunded
  adjusted_payout_amount?: number | null; // Payout amount after refund adjustment
  
  // Metadata
  transfer_notes?: Record<string, any> | null; // Notes for transfer
  failure_reason?: string | null; // Error message if failed
  processed_at?: Date | null; // When transfer was completed
  scheduled_at?: Date | null; // For future scheduled transfers
  metadata?: Record<string, any> | null; // Additional metadata
  
  createdAt: Date;
  updatedAt: Date;
}

export type PayoutDocument = HydratedDocument<Payout>;

// Payout schema
const payoutSchema = new Schema<Payout>(
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
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      index: true,
    },
    academy_payout_account: {
      type: Schema.Types.ObjectId,
      ref: 'AcademyPayoutAccount',
      required: true,
      index: true,
    },
    academy_user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
      index: true,
    },
    razorpay_transfer_id: {
      type: String,
      default: null,
      index: true,
    },
    razorpay_account_id: {
      type: String,
      required: true,
      index: true,
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
      type: Schema.Types.Mixed,
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
      type: Schema.Types.Mixed,
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
        delete result.__v;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        delete result.__v;
      },
    },
  }
);

// Indexes for better query performance
payoutSchema.index({ booking: 1 }, { unique: true }); // One payout per booking
payoutSchema.index({ transaction: 1 }, { unique: true }); // One payout per transaction
payoutSchema.index({ academy_user: 1, status: 1, createdAt: -1 });
payoutSchema.index({ academy_payout_account: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ razorpay_transfer_id: 1 });
payoutSchema.index({ razorpay_account_id: 1 });
payoutSchema.index({ scheduled_at: 1 }); // For scheduled payouts

// Compound indexes
payoutSchema.index({ academy_user: 1, status: 1, createdAt: -1 });
payoutSchema.index({ status: 1, scheduled_at: 1 });

export const PayoutModel = model<Payout>('Payout', payoutSchema);
