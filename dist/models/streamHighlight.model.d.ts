import { HydratedDocument, Types } from 'mongoose';
export declare enum HighlightStatus {
    PUBLISHED = "published",
    ARCHIVED = "archived",
    BLOCKED = "blocked",
    DELETED = "deleted"
}
export declare enum VideoProcessingStatus {
    NOT_STARTED = "not_started",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface StreamHighlight {
    id: string;
    streamSessionId?: Types.ObjectId | null;
    userId: Types.ObjectId;
    coachingCenterId?: Types.ObjectId | null;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    videoUrl: string;
    hlsUrls?: {
        '360p'?: string;
        '480p'?: string;
        '720p'?: string;
        '1080p'?: string;
        [key: string]: string | undefined;
    } | null;
    masterM3u8Url?: string | null;
    previewUrl?: string | null;
    duration: number;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    status: HighlightStatus;
    videoProcessingStatus: VideoProcessingStatus;
    originalStreamStartTime?: Date | null;
    originalStreamEndTime?: Date | null;
    publishedAt?: Date | null;
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
export declare const StreamHighlightModel: import("mongoose").Model<StreamHighlight, {}, {}, {}, import("mongoose").Document<unknown, {}, StreamHighlight, {}, {}> & StreamHighlight & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=streamHighlight.model.d.ts.map