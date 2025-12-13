import { Schema, model, HydratedDocument, Types } from 'mongoose';

export enum VideoProcessedStatus {
  PROCESSING = 'proccesing',
  FAILED = 'failed',
  DONE = 'done',
  EMPTY = '',
}

export enum ReelStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
  PENDING = 'pending',
}

export interface Reel {
  id: string;
  userId: Types.ObjectId; // Reference to User model
  title: string;
  description?: string | null;
  sportIds: string[]; // Array of sport UUIDs
  originalPath: string;
  folderPath?: string | null;
  thumbnailPath?: string | null;
  masterM3u8Url?: string | null;
  previewUrl?: string | null;
  hlsUrls?: {
    '360p'?: string;
    '480p'?: string;
    [key: string]: string | undefined;
  } | null;
  status: ReelStatus;
  videoProcessedStatus: VideoProcessedStatus;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type ReelDocument = HydratedDocument<Reel>;

const reelSchema = new Schema<Reel>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    sportIds: {
      type: [String],
      required: true,
      default: [],
      index: true,
    },
    originalPath: { type: String, required: true },
    folderPath: { type: String, default: null },
    thumbnailPath: { type: String, default: null },
    masterM3u8Url: { type: String, default: null },
    previewUrl: { type: String, default: null },
    hlsUrls: {
      type: Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ReelStatus),
      required: true,
      index: true,
    },
    videoProcessedStatus: {
      type: String,
      enum: Object.values(VideoProcessedStatus),
      required: true,
      default: VideoProcessedStatus.PROCESSING,
      index: true,
    },
    viewsCount: { type: Number, required: true, default: 0 },
    likesCount: { type: Number, required: true, default: 0 },
    commentsCount: { type: Number, required: true, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
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

// Indexes for common queries
reelSchema.index({ userId: 1, deletedAt: 1 });
reelSchema.index({ status: 1, deletedAt: 1 });
reelSchema.index({ videoProcessedStatus: 1 });
reelSchema.index({ createdAt: -1 });

export const ReelModel = model<Reel>('Reel', reelSchema);
