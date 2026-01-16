import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Action scale/label enum
export enum ActionScale {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Action type enum
export enum ActionType {
  // Booking actions
  BOOKING_CREATED = 'booking_created',
  BOOKING_REQUESTED = 'booking_requested',
  BOOKING_APPROVED = 'booking_approved',
  BOOKING_REJECTED = 'booking_rejected',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_COMPLETED = 'booking_completed',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  
  // Academy actions
  ACADEMY_CREATED = 'academy_created',
  ACADEMY_UPDATED = 'academy_updated',
  ACADEMY_APPROVED = 'academy_approved',
  ACADEMY_REJECTED = 'academy_rejected',
  
  // Batch actions
  BATCH_CREATED = 'batch_created',
  BATCH_UPDATED = 'batch_updated',
  BATCH_PUBLISHED = 'batch_published',
  BATCH_UNPUBLISHED = 'batch_unpublished',
  
  // User actions
  USER_REGISTERED = 'user_registered',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  
  // Admin actions
  SETTINGS_UPDATED = 'settings_updated',
  ADMIN_ACTION = 'admin_action',
}

// Audit Trail interface
export interface AuditTrail {
  id: string;
  action: ActionType;
  scale: ActionScale;
  label: string; // Human-readable label for the action
  entityType: string; // e.g., 'Booking', 'Academy', 'User', 'Batch'
  entityId: Types.ObjectId | string; // ID of the affected entity
  userId?: Types.ObjectId | null; // User who performed the action
  academyId?: Types.ObjectId | null; // Academy involved (if applicable)
  bookingId?: Types.ObjectId | null; // Booking involved (if applicable)
  metadata?: Record<string, any> | null; // Additional context data
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export type AuditTrailDocument = HydratedDocument<AuditTrail>;

// Audit Trail schema
const auditTrailSchema = new Schema<AuditTrail>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
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
      type: Schema.Types.Mixed, // Can be ObjectId or string
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    academyId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      default: null,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
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

export const AuditTrailModel = model<AuditTrail>('AuditTrail', auditTrailSchema);
