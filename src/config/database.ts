import mongoose from 'mongoose';
import { config } from './env';
import { logger } from '../utils/logger';

let isConnecting = false;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    await new Promise<void>((resolve) => {
      mongoose.connection.once('connected', () => resolve());
    });
    return mongoose;
  }

  if (!config.database.mongoUri) {
    throw new Error('MONGO_URI is not defined. Please set it in your environment variables.');
  }

  isConnecting = true;
  mongoose.set('strictQuery', true);

  await mongoose.connect(config.database.mongoUri);
  isConnecting = false;

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  return mongoose;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export default mongoose;

