import { Worker } from 'bullmq';
import { VideoProcessingJobData } from './videoProcessingQueue';
export declare const videoProcessingWorker: Worker<VideoProcessingJobData, any, string>;
export declare const closeVideoProcessingWorker: () => Promise<void>;
//# sourceMappingURL=videoProcessingWorker.d.ts.map