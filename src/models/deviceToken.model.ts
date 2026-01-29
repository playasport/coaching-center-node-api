import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { DeviceType } from '../enums/deviceType.enum';

export interface DeviceToken {
  id: string;
  userId: Types.ObjectId; // Reference to User
  fcmToken: string; // FCM token for push notifications
  deviceType: DeviceType; // web, android, or ios
  deviceId?: string | null; // Optional: unique device identifier
  deviceName?: string | null; // Optional: device name/model
  appVersion?: string | null; // Optional: app version
  refreshToken?: string | null; // Optional: Refresh token for this device (for mobile apps with longer validity)
  refreshTokenExpiresAt?: Date | null; // Optional: Refresh token expiration date
  isActive: boolean; // Whether this token is currently active
  lastActiveAt: Date; // Last time this device was used
  createdAt: Date;
  updatedAt: Date;
}

export type DeviceTokenDocument = HydratedDocument<DeviceToken>;

const deviceTokenSchema = new Schema<DeviceToken>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fcmToken: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: Object.values(DeviceType),
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: null,
      trim: true,
    },
    appVersion: {
      type: String,
      default: null,
      trim: true,
    },
    refreshToken: {
      type: String,
      default: null,
      trim: true,
      index: true,
      sparse: true,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
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

// Compound index to ensure one active token per user-device combination
deviceTokenSchema.index({ userId: 1, deviceId: 1, isActive: 1 }, { unique: true, sparse: true });

// Index for efficient querying of active tokens by user
deviceTokenSchema.index({ userId: 1, isActive: 1 });

export const DeviceTokenModel = model<DeviceToken>('DeviceToken', deviceTokenSchema);
