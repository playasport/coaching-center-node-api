/**
 * Execute permanent deletion job
 * This function can be called directly for testing
 */
export declare const executePermanentDeleteJob: () => Promise<void>;
/**
 * Permanent deletion job for soft-deleted records
 * Deletes records that have been soft deleted for more than 1 year
 * Also deletes all associated media files from S3
 * Runs monthly on the 1st at 3 AM
 */
export declare const startPermanentDeleteJob: () => void;
//# sourceMappingURL=permanentDelete.job.d.ts.map