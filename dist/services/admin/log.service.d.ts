export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    meta?: any;
    raw: string;
}
export interface LogResponse {
    logs: LogEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
/**
 * Get application logs
 */
export declare const getApplicationLogs: (page?: number, limit?: number, filter?: {
    level?: string;
    search?: string;
}) => LogResponse;
/**
 * Get queue-related logs
 */
export declare const getQueueLogs: (queueName?: string, page?: number, limit?: number) => LogResponse;
/**
 * Get video processing logs
 */
export declare const getVideoProcessingLogs: (jobId?: string, page?: number, limit?: number) => LogResponse;
/**
 * Get logs by job ID
 */
export declare const getLogsByJobId: (jobId: string, page?: number, limit?: number) => LogResponse;
/**
 * Get log file info
 */
export declare const getLogFileInfo: () => {
    exists: boolean;
    path: string;
    size?: number;
    lastModified?: Date;
};
//# sourceMappingURL=log.service.d.ts.map