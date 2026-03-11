/**
 * Test script for cron jobs
 * This file allows manual testing of cron jobs without waiting for scheduled times
 *
 * Usage:
 *   npm run test:jobs -- --job=permanent-delete
 *   npm run test:jobs -- --job=media-cleanup
 *   npm run test:jobs -- --job=booking-payment-expiry
 *   npm run test:jobs -- --job=all
 *   npm run test:jobs -- --job=booking-payment-expiry --no-wait   (quick run, notifications may not complete)
 */
declare function runPermanentDeleteJob(): Promise<void>;
declare function runMediaCleanupJob(): Promise<void>;
export { runPermanentDeleteJob, runMediaCleanupJob };
//# sourceMappingURL=testJobs.d.ts.map