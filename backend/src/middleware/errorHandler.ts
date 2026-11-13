import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled Error caught in middleware:', {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message
    }));
    sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message
    }));
    sendError(res, 422, 'VALIDATION_ERROR', 'Database validation failed', details);
    return;
  }

  if (err.name === 'CastError') {
    sendError(res, 400, 'INVALID_IDENTIFIER', `Invalid resource identifier format: ${err.value}`);
    return;
  }

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
    sendError(res, 409, 'DUPLICATE_RESOURCE', `Resource with this ${duplicateField} already exists.`);
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    sendError(res, 401, 'INVALID_TOKEN', 'Authentication token is invalid or expired');
    return;
  }

  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected internal server error occurred',
    env.NODE_ENV === 'development' ? err.message : undefined
  );
};

