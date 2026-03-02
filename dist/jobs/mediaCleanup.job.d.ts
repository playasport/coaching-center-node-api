/**
 * Execute media cleanup job
 * This function can be called directly for testing
 */
export declare const executeMediaCleanupJob: () => Promise<void>;
/**
 * Cleanup job to permanently delete media that has been soft deleted for 6+ months
 * Runs daily at 2 AM
 */
export declare const startMediaCleanupJob: () => void;
//# sourceMappingURL=mediaCleanup.job.d.ts.map