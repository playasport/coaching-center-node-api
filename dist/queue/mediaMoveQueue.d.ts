import { Queue } from 'bullmq';
export declare const MEDIA_MOVE_QUEUE_NAME = "media-move-coaching-center";
export interface MediaMoveJobData {
    coachingCenterId: string;
    fileUrls: string[];
    timestamp?: number;
}
/**
 * Create the media move queue
 * This queue handles moving files from temp to permanent locations for coaching centers
 */
export declare const mediaMoveQueue: Queue<MediaMoveJobData, any, string, MediaMoveJobData, any, string>;
/**
 * Add media move job to queue (non-blocking)
 * The job will be processed by the media move worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export declare const enqueueMediaMove: (data: MediaMoveJobData) => Promise<void>;
//# sourceMappingURL=mediaMoveQueue.d.ts.map