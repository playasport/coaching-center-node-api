import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

// Booking status enum
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
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
  notes?: string | null;
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
      index: true,
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
      default: PaymentStatus.PENDING,
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
      index: true,
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
      index: true,
    },
    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    center: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      required: true,
      index: true,
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
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
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      required: true,
      default: BookingStatus.PENDING,
      index: true,
    },
    payment: {
      type: paymentDetailsSchema,
      required: true,
    },
    notes: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
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

export const BookingModel = model<Booking>('Booking', bookingSchema);

