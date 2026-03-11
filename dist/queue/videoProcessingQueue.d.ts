import { Queue } from 'bullmq';
export declare const VIDEO_PROCESSING_QUEUE_NAME = "video-processing-reel";
/**
 * Video processing is now handled by the worker in this project.
 * Set VIDEO_PROCESSING_CONCURRENCY environment variable to control
 * how many videos are processed simultaneously (default: 2).
 *
 * Example: VIDEO_PROCESSING_CONCURRENCY=3 (processes 3 videos at the same time)
 */
export interface VideoProcessingJobData {
    highlightId?: string;
    reelId?: string;
    videoUrl: string;
    folderPath: string;
    type: 'highlight' | 'reel';
    timestamp?: number;
}
/**
 * Create the video processing queue
 * This uses the same queue that your video converter server processes
 */
export declare const videoProcessingQueue: Queue<VideoProcessingJobData, any, string, VideoProcessingJobData, any, string>;
/**
 * Add video processing job to queue (non-blocking)
 * The job will be processed by your existing video converter server worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export declare const enqueueVideoProcessing: (data: VideoProcessingJobData) => Promise<void>;
//# sourceMappingURL=videoProcessingQueue.d.ts.map