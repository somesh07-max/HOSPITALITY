import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // Attempt Database Connection
    try {
      await connectDatabase();
    } catch (dbError: any) {
      logger.warn(`Server starting without active database connection: ${dbError.message}`);
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(` HOSPITALITY API Server running on port ${env.PORT}`);
      logger.info(` Environment: ${env.NODE_ENV}`);
      logger.info(` Health check: http://localhost:${env.PORT}/health`);
      logger.info(` API base URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`=======================================================`);
    });

    // Graceful Shutdown Signals
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error: any) {
    logger.error(`Critical server startup failure: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { startServer };

