import { Worker } from 'bullmq';
import { MediaMoveJobData } from './mediaMoveQueue';
/**
 * Create worker for processing media move jobs
 * This worker moves files from temp to permanent locations for coaching centers
 */
export declare const mediaMoveWorker: Worker<MediaMoveJobData, any, string>;
/**
 * Close the media move worker gracefully
 */
export declare const closeMediaMoveWorker: () => Promise<void>;
//# sourceMappingURL=mediaMoveWorker.d.ts.map