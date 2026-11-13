import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess, sendError } from './utils/response';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN === '*' ? true : [env.CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Standard Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// Health Check Endpoint (Public)
app.get('/health', (_req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  return sendSuccess(res, 200, {
    status: 'UP',
    timestamp: new Date().toISOString(),
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
    environment: env.NODE_ENV,
    version: '1.0.0'
  }, 'HOSPITALITY API Health Check OK');
});

// Root friendly welcome endpoint
app.get('/', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, {
    service: 'HOSPITALITY — Holistic Optimization System for Policy-Integrated Admission & Treatment Intelligence',
    status: 'ACTIVE',
    apiVersion: 'v1',
    docs: '/api/v1/docs',
    healthCheck: '/health'
  });
});

// Swagger Documentation UI
import { setupSwagger } from './config/swagger';
setupSwagger(app);

// API v1 Router will be mounted here
import { apiV1Router } from './routes';
app.use('/api/v1', apiV1Router);

// 404 Route Handler
app.use('*', (req: Request, res: Response) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;

