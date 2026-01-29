import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { NotificationChannel, NotificationPriority } from '../types/notification.types';

export type NotificationRecipientType = 'user' | 'academy' | 'role';

export interface Notification {
  id: string;
  recipientType: NotificationRecipientType;
  recipientId?: Types.ObjectId; // Reference to User or CoachingCenter (optional when recipientType is 'role')
  recipientTypeRef?: string; // Internal field for mongoose refPath
  roles?: string[]; // Array of role names (for role-based notifications) - supports single or multiple roles
  title: string;
  body: string;
  channels: NotificationChannel[]; // Array of channels to send through
  priority: NotificationPriority;
  data?: Record<string, unknown>; // Additional data for push notifications
  imageUrl?: string | null; // Image URL for push notifications
  isRead: boolean;
  readAt?: Date | null;
  sent: boolean; // Whether notification was successfully sent
  sentAt?: Date | null;
  error?: string | null; // Error message if sending failed
  metadata?: Record<string, unknown>; // Additional metadata
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

const notificationSchema = new Schema<Notification>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    recipientType: {
      type: String,
      enum: ['user', 'academy', 'role'],
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      required: function(this: Notification) {
        return this.recipientType !== 'role';
      },
      refPath: 'recipientTypeRef',
      index: true,
      default: null,
    },
    recipientTypeRef: {
      type: String,
      enum: ['User', 'CoachingCenter'],
      required: function(this: Notification) {
        return this.recipientType === 'user' ? 'User' : this.recipientType === 'academy' ? 'CoachingCenter' : false;
      },
    },
    roles: {
      type: [String],
      required: function(this: Notification) {
        return this.recipientType === 'role';
      },
      index: true,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    channels: {
      type: [String],
      enum: ['sms', 'email', 'whatsapp', 'push'],
      required: true,
      default: ['push'],
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    sent: {
      type: Boolean,
      default: false,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
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
        delete result.recipientTypeRef;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        delete result.recipientTypeRef;
      },
    },
  }
);

// Compound indexes for efficient querying
notificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, recipientId: 1, sent: 1 });
notificationSchema.index({ recipientType: 1, roles: 1, isRead: 1 }); // For role-based notifications
notificationSchema.index({ recipientType: 1, roles: 1, createdAt: -1 }); // For role-based notifications
notificationSchema.index({ createdAt: -1 });

export const NotificationModel = model<Notification>('Notification', notificationSchema);

