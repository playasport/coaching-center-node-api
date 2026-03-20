import app from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { setLocale } from './utils/i18n';
import { logger } from './utils/logger';
import { thumbnailWorker, thumbnailQueue } from './queue/thumbnailQueue';
import { videoProcessingQueue } from './queue/videoProcessingQueue';
import { closeVideoProcessingWorker } from './queue/videoProcessingWorker';
import { mediaMoveQueue } from './queue/mediaMoveQueue';
import { closeMediaMoveWorker } from './queue/mediaMoveWorker';
import { meilisearchIndexingQueue } from './queue/meilisearchIndexingQueue';
import { closeMeilisearchIndexingWorker } from './queue/meilisearchIndexingWorker';
import { payoutBankDetailsQueue } from './queue/payoutBankDetailsQueue';
import { closePayoutBankDetailsWorker } from './queue/payoutBankDetailsWorker';
import { payoutStakeholderQueue } from './queue/payoutStakeholderQueue';
import { closePayoutStakeholderWorker } from './queue/payoutStakeholderWorker';
import { payoutTransferQueue } from './queue/payoutTransferQueue';
import { closePayoutTransferWorker } from './queue/payoutTransferWorker';
import { closeAllRedisConnections } from './utils/redisClient';
import { startMediaCleanupJob } from './jobs/mediaCleanup.job';
import { startPermanentDeleteJob } from './jobs/permanentDelete.job';
import { startPayoutReconciliationJob } from './jobs/payoutReconciliation.job';
import { preloadRoleCache } from './services/admin/role.service';

const startServer = async (): Promise<void> => {
  try {
    // Set default locale from environment variable or default to 'en'
    setLocale(config.defaultLocale);
    logger.info('Default locale configured', { locale: config.defaultLocale });

    // Test database connection
    await connectDatabase();
    logger.info('MongoDB connected successfully');

    // Pre-load role cache for faster API responses
    await preloadRoleCache();

    // Start media cleanup cron job (runs daily at 2 AM)
    startMediaCleanupJob();

    // Start permanent deletion cron job (runs monthly on the 1st at 3 AM)
    startPermanentDeleteJob();

    // Booking payment expiry: auto-cancel unpaid approved bookings and send payment reminders (every 15 min)
    const { startBookingPaymentExpiryJob } = await import('./jobs/bookingPaymentExpiry.job');
    startBookingPaymentExpiryJob();

    // Payout reconciliation: create missing payouts for verified payments (every hour)
    startPayoutReconciliationJob();

    // Start server
    app.listen(config.port, () => {
      logger.info('HTTP server started', {
        port: config.port,
        environment: config.nodeEnv,
        endpoint: `http://localhost:${config.port}/api`,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.warn(`${signal} signal received: closing HTTP server`);
  
  try {
    // Close thumbnail worker
    await thumbnailWorker.close();
    logger.info('Thumbnail worker closed');
    
    // Close thumbnail queue
    await thumbnailQueue.close();
    logger.info('Thumbnail queue closed');
    
    // Close video processing worker
    await closeVideoProcessingWorker();
    logger.info('Video processing worker closed');
    
    // Close video processing queue
    await videoProcessingQueue.close();
    logger.info('Video processing queue closed');
    
    // Close media move worker
    await closeMediaMoveWorker();
    logger.info('Media move worker closed');
    
    // Close media move queue
    await mediaMoveQueue.close();
    logger.info('Media move queue closed');
    
    // Close Meilisearch indexing worker
    await closeMeilisearchIndexingWorker();
    logger.info('Meilisearch indexing worker closed');
    
    // Close Meilisearch indexing queue
    await meilisearchIndexingQueue.close();
    logger.info('Meilisearch indexing queue closed');
    
    // Close payout bank details worker
    await closePayoutBankDetailsWorker();
    logger.info('Payout bank details worker closed');
    
    // Close payout bank details queue
    await payoutBankDetailsQueue.close();
    logger.info('Payout bank details queue closed');
    
    // Close payout stakeholder worker
    await closePayoutStakeholderWorker();
    logger.info('Payout stakeholder worker closed');
    
    // Close payout stakeholder queue
    await payoutStakeholderQueue.close();
    logger.info('Payout stakeholder queue closed');
    
    // Close payout transfer worker
    await closePayoutTransferWorker();
    logger.info('Payout transfer worker closed');
    
    // Close payout transfer queue
    await payoutTransferQueue.close();
    logger.info('Payout transfer queue closed');
    
    // Shared Redis connections (user cache, blacklist, rate limit, permissions, dashboards, home, academy detail, etc.)
    await closeAllRedisConnections();
    
    // Disconnect database
    await disconnectDatabase();
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

