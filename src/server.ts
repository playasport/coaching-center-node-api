import app from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { setLocale } from './utils/i18n';

const startServer = async (): Promise<void> => {
  try {
    // Set default locale from environment variable or default to 'en'
    setLocale(config.defaultLocale);
    console.log(`🌐 Default locale set to: ${config.defaultLocale}`);

    // Test database connection
    await connectDatabase();
    console.log('✅ MongoDB connected successfully');

    // Start server
    app.listen(config.port, () => {
      console.log(`🚀 Server is running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 API endpoint: http://localhost:${config.port}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await disconnectDatabase();
  process.exit(0);
});

startServer();

