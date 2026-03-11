"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const i18n_1 = require("./utils/i18n");
const logger_1 = require("./utils/logger");
const thumbnailQueue_1 = require("./queue/thumbnailQueue");
const videoProcessingQueue_1 = require("./queue/videoProcessingQueue");
const videoProcessingWorker_1 = require("./queue/videoProcessingWorker");
const mediaMoveQueue_1 = require("./queue/mediaMoveQueue");
const mediaMoveWorker_1 = require("./queue/mediaMoveWorker");
const meilisearchIndexingQueue_1 = require("./queue/meilisearchIndexingQueue");
const meilisearchIndexingWorker_1 = require("./queue/meilisearchIndexingWorker");
const payoutBankDetailsQueue_1 = require("./queue/payoutBankDetailsQueue");
const payoutBankDetailsWorker_1 = require("./queue/payoutBankDetailsWorker");
const payoutStakeholderQueue_1 = require("./queue/payoutStakeholderQueue");
const payoutStakeholderWorker_1 = require("./queue/payoutStakeholderWorker");
const payoutTransferQueue_1 = require("./queue/payoutTransferQueue");
const payoutTransferWorker_1 = require("./queue/payoutTransferWorker");
const userCache_1 = require("./utils/userCache");
const tokenBlacklist_1 = require("./utils/tokenBlacklist");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const permission_service_1 = require("./services/admin/permission.service");
const mediaCleanup_job_1 = require("./jobs/mediaCleanup.job");
const permanentDelete_job_1 = require("./jobs/permanentDelete.job");
const role_service_1 = require("./services/admin/role.service");
const academyDashboardCache_1 = require("./utils/academyDashboardCache");
const adminDashboardCache_1 = require("./utils/adminDashboardCache");
const homeDataCache_1 = require("./utils/homeDataCache");
const startServer = async () => {
    try {
        // Set default locale from environment variable or default to 'en'
        (0, i18n_1.setLocale)(env_1.config.defaultLocale);
        logger_1.logger.info('Default locale configured', { locale: env_1.config.defaultLocale });
        // Test database connection
        await (0, database_1.connectDatabase)();
        logger_1.logger.info('MongoDB connected successfully');
        // Pre-load role cache for faster API responses
        await (0, role_service_1.preloadRoleCache)();
        // Start media cleanup cron job (runs daily at 2 AM)
        (0, mediaCleanup_job_1.startMediaCleanupJob)();
        // Start permanent deletion cron job (runs monthly on the 1st at 3 AM)
        (0, permanentDelete_job_1.startPermanentDeleteJob)();
        // Booking payment expiry: auto-cancel unpaid approved bookings and send payment reminders (every 15 min)
        const { startBookingPaymentExpiryJob } = await Promise.resolve().then(() => __importStar(require('./jobs/bookingPaymentExpiry.job')));
        startBookingPaymentExpiryJob();
        // Start server
        app_1.default.listen(env_1.config.port, () => {
            logger_1.logger.info('HTTP server started', {
                port: env_1.config.port,
                environment: env_1.config.nodeEnv,
                endpoint: `http://localhost:${env_1.config.port}/api`,
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
};
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger_1.logger.warn(`${signal} signal received: closing HTTP server`);
    try {
        // Close thumbnail worker
        await thumbnailQueue_1.thumbnailWorker.close();
        logger_1.logger.info('Thumbnail worker closed');
        // Close thumbnail queue
        await thumbnailQueue_1.thumbnailQueue.close();
        logger_1.logger.info('Thumbnail queue closed');
        // Close video processing worker
        await (0, videoProcessingWorker_1.closeVideoProcessingWorker)();
        logger_1.logger.info('Video processing worker closed');
        // Close video processing queue
        await videoProcessingQueue_1.videoProcessingQueue.close();
        logger_1.logger.info('Video processing queue closed');
        // Close media move worker
        await (0, mediaMoveWorker_1.closeMediaMoveWorker)();
        logger_1.logger.info('Media move worker closed');
        // Close media move queue
        await mediaMoveQueue_1.mediaMoveQueue.close();
        logger_1.logger.info('Media move queue closed');
        // Close Meilisearch indexing worker
        await (0, meilisearchIndexingWorker_1.closeMeilisearchIndexingWorker)();
        logger_1.logger.info('Meilisearch indexing worker closed');
        // Close Meilisearch indexing queue
        await meilisearchIndexingQueue_1.meilisearchIndexingQueue.close();
        logger_1.logger.info('Meilisearch indexing queue closed');
        // Close payout bank details worker
        await (0, payoutBankDetailsWorker_1.closePayoutBankDetailsWorker)();
        logger_1.logger.info('Payout bank details worker closed');
        // Close payout bank details queue
        await payoutBankDetailsQueue_1.payoutBankDetailsQueue.close();
        logger_1.logger.info('Payout bank details queue closed');
        // Close payout stakeholder worker
        await (0, payoutStakeholderWorker_1.closePayoutStakeholderWorker)();
        logger_1.logger.info('Payout stakeholder worker closed');
        // Close payout stakeholder queue
        await payoutStakeholderQueue_1.payoutStakeholderQueue.close();
        logger_1.logger.info('Payout stakeholder queue closed');
        // Close payout transfer worker
        await (0, payoutTransferWorker_1.closePayoutTransferWorker)();
        logger_1.logger.info('Payout transfer worker closed');
        // Close payout transfer queue
        await payoutTransferQueue_1.payoutTransferQueue.close();
        logger_1.logger.info('Payout transfer queue closed');
        // Close user cache Redis connection
        await (0, userCache_1.closeUserCache)();
        // Close token blacklist Redis connection
        await (0, tokenBlacklist_1.closeTokenBlacklist)();
        // Close rate limit Redis connection
        await (0, rateLimit_middleware_1.closeRateLimit)();
        // Close permission cache Redis connection
        await (0, permission_service_1.closePermissionCache)();
        // Close academy dashboard cache Redis connection
        await (0, academyDashboardCache_1.closeAcademyDashboardCache)();
        // Close admin dashboard cache Redis connection
        await (0, adminDashboardCache_1.closeAdminDashboardCache)();
        // Close home data cache Redis connection
        await (0, homeDataCache_1.closeHomeDataCache)();
        // Disconnect database
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error during graceful shutdown', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
startServer();
//# sourceMappingURL=server.js.map