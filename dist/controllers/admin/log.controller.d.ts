import { Request, Response, NextFunction } from 'express';
/**
 * Get application logs
 */
export declare const getApplicationLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get queue logs
 */
export declare const getQueueLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get video processing logs
 */
export declare const getVideoProcessingLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get logs by job ID
 */
export declare const getLogsByJobId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get log file info
 */
export declare const getLogFileInfo: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=log.controller.d.ts.map