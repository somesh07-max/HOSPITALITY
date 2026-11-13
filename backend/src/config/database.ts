import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDatabase = async (uriOverride?: string): Promise<typeof mongoose> => {
  const uri = uriOverride || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(uri);
    logger.info(`MongoDB Connected successfully to: ${conn.connection.host || 'database'}`);
    return conn;
  } catch (error: any) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    if (env.NODE_ENV !== 'test') {
      logger.warn('Please ensure MongoDB is running or MONGODB_URI is properly configured.');
    }
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error: any) {
    logger.error(`Error during MongoDB disconnection: ${error.message}`);
  }
};

mongoose.connection.on('disconnected', () => {
  if (env.NODE_ENV !== 'test') {
    logger.warn('MongoDB connection lost. Waiting for reconnect...');
  }
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error event: ${err.message}`);
});

