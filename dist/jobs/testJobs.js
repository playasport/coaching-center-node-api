"use strict";
/**
 * Test script for cron jobs
 * This file allows manual testing of cron jobs without waiting for scheduled times
 *
 * Usage:
 *   npm run test:jobs -- --job=permanent-delete
 *   npm run test:jobs -- --job=media-cleanup
 *   npm run test:jobs -- --job=all
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPermanentDeleteJob = runPermanentDeleteJob;
exports.runMediaCleanupJob = runMediaCleanupJob;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const permanentDelete_job_1 = require("./permanentDelete.job");
const mediaCleanup_job_1 = require("./mediaCleanup.job");
async function runPermanentDeleteJob() {
    try {
        logger_1.logger.info('=== Starting Permanent Delete Job Test ===');
        await (0, permanentDelete_job_1.executePermanentDeleteJob)();
        logger_1.logger.info('=== Permanent Delete Job Test Completed ===');
    }
    catch (error) {
        logger_1.logger.error('Permanent delete job test failed', { error });
        throw error;
    }
}
async function runMediaCleanupJob() {
    try {
        logger_1.logger.info('=== Starting Media Cleanup Job Test ===');
        await (0, mediaCleanup_job_1.executeMediaCleanupJob)();
        logger_1.logger.info('=== Media Cleanup Job Test Completed ===');
    }
    catch (error) {
        logger_1.logger.error('Media cleanup job test failed', { error });
        throw error;
    }
}
async function main() {
    const args = process.argv.slice(2);
    const jobArg = args.find((arg) => arg.startsWith('--job='));
    const jobName = jobArg ? jobArg.split('=')[1] : 'all';
    try {
        // Connect to database
        await (0, database_1.connectDatabase)();
        logger_1.logger.info('Database connected');
        switch (jobName) {
            case 'permanent-delete':
                await runPermanentDeleteJob();
                break;
            case 'media-cleanup':
                await runMediaCleanupJob();
                break;
            case 'all':
                await runPermanentDeleteJob();
                await runMediaCleanupJob();
                break;
            default:
                logger_1.logger.error('Invalid job name. Use: permanent-delete, media-cleanup, or all');
                process.exit(1);
        }
        logger_1.logger.info('All job tests completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Job test failed', { error });
        process.exit(1);
    }
    finally {
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=testJobs.js.map