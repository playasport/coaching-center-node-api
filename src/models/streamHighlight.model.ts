import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Highlight Status Enum
export enum HighlightStatus {
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
}

// Video Processing Status Enum
export enum VideoProcessingStatus {
  NOT_STARTED = 'not_started',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Stream Highlight Interface (managed from admin panel)
export interface StreamHighlight {
  id: string;
  streamSessionId?: Types.ObjectId | null; // Reference to StreamSession (for future live streaming feature)
  userId: Types.ObjectId; // Reference to User model
  coachingCenterId?: Types.ObjectId | null; // Reference to CoachingCenter model (ObjectId, not UUID)
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  videoUrl: string; // Processed highlight video URL
  hlsUrls?: {
    '360p'?: string;
    '480p'?: string;
    '720p'?: string;
    '1080p'?: string;
    [key: string]: string | undefined;
  } | null;
  masterM3u8Url?: string | null;
  previewUrl?: string | null;
  duration: number; // Duration in seconds
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  status: HighlightStatus;
  videoProcessingStatus: VideoProcessingStatus; // Video processing job status
  originalStreamStartTime?: Date | null; // When the original stream started (if from live stream)
  originalStreamEndTime?: Date | null; // When the original stream ended (if from live stream)
  publishedAt?: Date | null; // When highlight was published
  metadata?: {
    originalRecordingUrl?: string | null;
    processingTime?: number | null;
    fileSize?: number | null;
    resolution?: string | null;
    [key: string]: any;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type StreamHighlightDocument = HydratedDocument<StreamHighlight>;

const streamHighlightSchema = new Schema<StreamHighlight>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    streamSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'StreamSession',
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coachingCenterId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    hlsUrls: {
      type: Schema.Types.Mixed,
      default: null,
    },
    masterM3u8Url: {
      type: String,
      default: null,
    },
    previewUrl: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    viewsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    likesCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(HighlightStatus),
      required: true,
      default: HighlightStatus.PUBLISHED,
    },
    videoProcessingStatus: {
      type: String,
      enum: Object.values(VideoProcessingStatus),
      required: true,
      default: VideoProcessingStatus.NOT_STARTED,
    },
    originalStreamStartTime: {
      type: Date,
      default: null,
      index: true,
    },
    originalStreamEndTime: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
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

// Indexes for common queries
streamHighlightSchema.index({ userId: 1, deletedAt: 1 });
streamHighlightSchema.index({ coachingCenterId: 1, deletedAt: 1 });
streamHighlightSchema.index({ status: 1, deletedAt: 1 });
streamHighlightSchema.index({ status: 1, publishedAt: -1 });
streamHighlightSchema.index({ videoProcessingStatus: 1 });
streamHighlightSchema.index({ viewsCount: -1 });
streamHighlightSchema.index({ createdAt: -1 });
streamHighlightSchema.index({ userId: 1, status: 1, deletedAt: 1 });
streamHighlightSchema.index({ streamSessionId: 1 });
streamHighlightSchema.index({ coachingCenterId: 1, status: 1, deletedAt: 1 });

// Meilisearch indexing hooks - using queue for non-blocking indexing
streamHighlightSchema.post('save', async function (doc) {
  try {
    if (doc.id) {
      const { enqueueMeilisearchIndexing, IndexingJobType } = await import('../queue/meilisearchIndexingQueue');
      await enqueueMeilisearchIndexing(IndexingJobType.INDEX_STREAM_HIGHLIGHT, doc.id);
    }
  } catch (error) {
    // Silently fail - Meilisearch indexing is optional
  }
});

streamHighlightSchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && doc.id) {
      const { enqueueMeilisearchIndexing, IndexingJobType } = await import('../queue/meilisearchIndexingQueue');
      await enqueueMeilisearchIndexing(IndexingJobType.UPDATE_STREAM_HIGHLIGHT, doc.id);
    }
  } catch (error) {
    // Silently fail - Meilisearch indexing is optional
  }
});

streamHighlightSchema.post('findOneAndDelete', async function (doc) {
  try {
    if (doc && doc.id) {
      const { enqueueMeilisearchIndexing, IndexingJobType } = await import('../queue/meilisearchIndexingQueue');
      await enqueueMeilisearchIndexing(IndexingJobType.DELETE_STREAM_HIGHLIGHT, doc.id);
    }
  } catch (error) {
    // Silently fail - Meilisearch indexing is optional
  }
});

export const StreamHighlightModel = model<StreamHighlight>('StreamHighlight', streamHighlightSchema);

