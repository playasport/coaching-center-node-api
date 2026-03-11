export interface QueueStats {
    name: string;
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
}
export interface QueueJob {
    id: string;
    name: string;
    data: any;
    state: string;
    /** Raw progress from BullMQ (number or object) */
    progress: number | string | boolean | object;
    /** Normalized 0-100 number for progress bar display */
    progressPercent: number;
    timestamp: number;
    processedOn?: number | null;
    finishedOn?: number | null;
    failedReason?: string | null;
    returnvalue?: any;
    attemptsMade: number;
    attempts: number;
}
export interface QueueListResponse {
    queues: QueueStats[];
    totalQueues: number;
}
export interface QueueJobsResponse {
    jobs: QueueJob[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
/**
 * Get all queues with their statistics
 */
export declare const getAllQueues: () => Promise<QueueListResponse>;
/**
 * Get jobs from a specific queue
 */
export declare const getQueueJobs: (queueName: string, status?: "active" | "waiting" | "completed" | "failed" | "delayed" | "all", page?: number, limit?: number) => Promise<QueueJobsResponse>;
/**
 * Get a specific job by ID
 */
export declare const getQueueJob: (queueName: string, jobId: string) => Promise<QueueJob | null>;
/**
 * Retry a failed job
 */
export declare const retryJob: (queueName: string, jobId: string) => Promise<void>;
/**
 * Remove a job
 */
export declare const removeJob: (queueName: string, jobId: string) => Promise<void>;
/**
 * Pause a queue
 */
export declare const pauseQueue: (queueName: string) => Promise<void>;
/**
 * Resume a queue
 */
export declare const resumeQueue: (queueName: string) => Promise<void>;
/**
 * Clean a queue (remove completed/failed jobs)
 */
export declare const cleanQueue: (queueName: string, grace?: number, limit?: number) => Promise<number>;
//# sourceMappingURL=queue.service.d.ts.map