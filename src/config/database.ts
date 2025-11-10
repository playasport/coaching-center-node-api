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

  try {
    await mongoose.connect(config.database.mongoUri);

    const currentState = mongoose.connection.readyState as mongoose.ConnectionStates;
    if (currentState !== mongoose.ConnectionStates.connected) {
      throw new Error('MongoDB connection not established.');
    }

    logger.info('MongoDB connection established');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return mongoose;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  } finally {
    isConnecting = false;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export default mongoose;

