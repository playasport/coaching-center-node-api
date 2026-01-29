import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Payment status enum
export enum PaymentStatus {
  NOT_INITIATED = 'not_initiated', // Payment not yet initiated (booking is SLOT_BOOKED or APPROVED, waiting for payment order creation)
  INITIATED = 'initiated', // Razorpay order created, payment initiated, waiting for user to complete payment
  PENDING = 'pending', // Payment initiated but not completed
  PROCESSING = 'processing', // Payment is being processed
  SUCCESS = 'success', // Payment successful
  FAILED = 'failed', // Payment failed
  REFUNDED = 'refunded', // Payment refunded
  CANCELLED = 'cancelled', // Payment cancelled
}

// Booking status enum
export enum BookingStatus {
  SLOT_BOOKED = 'slot_booked', // User has booked the slot, waiting for academy approval
  APPROVED = 'approved', // Academy approved, waiting for payment
  REJECTED = 'rejected', // Academy rejected the booking request
  PAYMENT_PENDING = 'payment_pending', // Payment pending (legacy - for backward compatibility, also used for old flow)
  CONFIRMED = 'confirmed', // Payment successful, booking confirmed
  CANCELLED = 'cancelled', // Booking cancelled
  COMPLETED = 'completed', // Booking completed
  // Legacy status for backward compatibility
  REQUESTED = 'requested', // Deprecated: Use SLOT_BOOKED instead
  PENDING = 'pending', // Deprecated: Use PAYMENT_PENDING instead
}

// Booking payout status enum
export enum BookingPayoutStatus {
  NOT_INITIATED = 'not_initiated', // Payout not yet created
  PENDING = 'pending', // Payout created, waiting for transfer
  PROCESSING = 'processing', // Transfer initiated
  COMPLETED = 'completed', // Transfer successful
  FAILED = 'failed', // Transfer failed
  CANCELLED = 'cancelled', // Payout cancelled
  REFUNDED = 'refunded', // Payout refunded (booking refunded)
}

// Payment details interface
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
  payment_initiated_count?: number; // Number of times payment was initiated
  payment_cancelled_count?: number; // Number of times payment was cancelled
  payment_failed_count?: number; // Number of times payment failed
}

// Commission details interface
export interface CommissionDetails {
  rate: number; // Commission rate used (e.g., 0.10 for 10%)
  amount: number; // Calculated commission amount
  payoutAmount: number; // Amount to be paid to academy after deducting commission (batch_amount - commission_amount)
  calculatedAt: Date; // When commission was calculated
}

// Price breakdown interface
export interface PriceBreakdown {
  // Batch-related (Academy gets this)
  admission_fee_per_participant: number;
  total_admission_fee: number;
  base_fee_per_participant: number;
  total_base_fee: number;
  batch_amount: number; // admission_fee + base_fee (what academy earns)
  
  // Platform charges (Academy doesn't see this)
  platform_fee: number;
  subtotal: number; // batch_amount + platform_fee
  gst_percentage: number;
  gst_amount: number;
  total_amount: number; // Final amount user pays
  
  // Metadata
  participant_count: number;
  currency: string;
  calculated_at: Date;
}

// Booking interface
export interface Booking {
  id: string;
  booking_id?: string | null; // Unique booking reference ID (e.g., BK-2024-001)
  user: Types.ObjectId; // Reference to User model
  participants: Types.ObjectId[]; // Array of Participant references
  batch: Types.ObjectId; // Reference to Batch model
  center: Types.ObjectId; // Reference to CoachingCenter model
  sport: Types.ObjectId; // Reference to Sport model
  amount: number; // Total booking amount
  currency: string; // Currency code (e.g., 'INR')
  status: BookingStatus;
  payment: PaymentDetails;
  commission?: CommissionDetails | null; // Commission details
  priceBreakdown?: PriceBreakdown | null; // Price breakdown details
  payout_status?: BookingPayoutStatus | null; // Status of payout to academy
  notes?: string | null;
  cancellation_reason?: string | null; // Reason for cancellation
  cancelled_by?: 'user' | 'academy' | 'system' | null; // Who cancelled the booking
  rejection_reason?: string | null; // Reason for rejection by academy
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<Booking>;

// Payment details sub-schema
const paymentDetailsSchema = new Schema<PaymentDetails>(
  {
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
  },
  { _id: false }
);

// Commission details sub-schema
const commissionDetailsSchema = new Schema<CommissionDetails>(
  {
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
  },
  { _id: false }
);

// Price breakdown sub-schema
const priceBreakdownSchema = new Schema<PriceBreakdown>(
  {
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
  },
  { _id: false }
);

// Main booking schema
const bookingSchema = new Schema<Booking>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
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
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'Participant',
      required: true,
      validate: {
        validator: function (value: Types.ObjectId[]) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one participant is required',
      },
    },
    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    center: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      required: true,
    },
    sport: {
      type: Schema.Types.ObjectId,
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

export const BookingModel = model<Booking>('Booking', bookingSchema);

