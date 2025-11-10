import app from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { setLocale } from './utils/i18n';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // Set default locale from environment variable or default to 'en'
    setLocale(config.defaultLocale);
    logger.info('Default locale configured', { locale: config.defaultLocale });

    // Test database connection
    await connectDatabase();
    logger.info('MongoDB connected successfully');

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
process.on('SIGTERM', async () => {
  logger.warn('SIGTERM signal received: closing HTTP server');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.warn('SIGINT signal received: closing HTTP server');
  await disconnectDatabase();
  process.exit(0);
});

startServer();

