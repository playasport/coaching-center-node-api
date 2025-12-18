import app from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { setLocale } from './utils/i18n';
import { logger } from './utils/logger';
import { thumbnailWorker, thumbnailQueue } from './queue/thumbnailQueue';
import { closeUserCache } from './utils/userCache';
import { closeTokenBlacklist } from './utils/tokenBlacklist';
import { closeRateLimit } from './middleware/rateLimit.middleware';
import { closePermissionCache } from './services/admin/permission.service';
import { startMediaCleanupJob } from './jobs/mediaCleanup.job';

const startServer = async (): Promise<void> => {
  try {
    // Set default locale from environment variable or default to 'en'
    setLocale(config.defaultLocale);
    logger.info('Default locale configured', { locale: config.defaultLocale });

    // Test database connection
    await connectDatabase();
    logger.info('MongoDB connected successfully');

    // Start media cleanup cron job (runs daily at 2 AM)
    startMediaCleanupJob();

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
    
    // Close user cache Redis connection
    await closeUserCache();
    
    // Close token blacklist Redis connection
    await closeTokenBlacklist();
    
    // Close rate limit Redis connection
    await closeRateLimit();
    
    // Close permission cache Redis connection
    await closePermissionCache();
    
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

