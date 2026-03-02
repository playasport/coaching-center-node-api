import { Request, Response, NextFunction } from 'express';
/**
 * Get all queues with statistics
 */
export declare const getAllQueues: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get jobs from a specific queue
 */
export declare const getQueueJobs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get a specific job by ID
 */
export declare const getQueueJob: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Retry a failed job
 */
export declare const retryJob: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Remove a job
 */
export declare const removeJob: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Pause a queue
 */
export declare const pauseQueue: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Resume a queue
 */
export declare const resumeQueue: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Clean a queue (remove completed/failed jobs)
 */
export declare const cleanQueue: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=queue.controller.d.ts.map