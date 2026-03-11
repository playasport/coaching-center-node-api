import { Queue, Worker } from 'bullmq';
export declare const THUMBNAIL_QUEUE_NAME = "thumbnail-generation";
export interface ThumbnailJobData {
    coachingCenterId: string;
    videoUrl: string;
    videoUniqueId?: string;
    sportDetailIndex?: number;
    videoIndex?: number;
}
/**
 * Create the thumbnail generation queue
 */
export declare const thumbnailQueue: Queue<ThumbnailJobData, any, string, ThumbnailJobData, any, string>;
/**
 * Worker to process thumbnail generation jobs
 */
export declare const thumbnailWorker: Worker<ThumbnailJobData, any, string>;
/**
 * Add thumbnail generation job to queue
 */
export declare const enqueueThumbnailGeneration: (coachingCenterId: string, videoUrl: string, options?: {
    videoUniqueId?: string;
    sportDetailIndex?: number;
    videoIndex?: number;
}) => Promise<void>;
//# sourceMappingURL=thumbnailQueue.d.ts.map