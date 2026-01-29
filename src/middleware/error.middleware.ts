import { Request, Response, NextFunction } from 'express';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Check if it's an ApiError instance
  const isApiError = err instanceof ApiError;
  const statusCode = err.statusCode || 500;
  
  // Use the error message if it's an ApiError, otherwise use internal server error message
  const message = isApiError && err.message ? err.message : (statusCode === 500 ? t('errors.internalServerError') : err.message || t('errors.internalServerError'));

  // Only log as error if it's a 500, otherwise log as warn/info
  if (statusCode >= 500) {
    logger.error('Unhandled application error', {
      statusCode,
      message: err.message,
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    });
  } else {
    logger.warn('Application error', {
      statusCode,
      message: err.message,
      method: req.method,
      url: req.originalUrl,
    });
  }

  const shouldIncludeStack = config.nodeEnv !== 'production';
  const data = shouldIncludeStack && err.stack ? { stack: err.stack } : null;

  // Include errors array if it's an ApiError with validation errors
  const responseData = isApiError && err.errors && err.errors.length > 0 
    ? { ...data, errors: err.errors } 
    : data;

  const response = new ApiResponse(statusCode, responseData, message);
  res.status(statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
  });

  const message = t('errors.routeNotFound', { route: req.originalUrl });
  const response = new ApiResponse(404, null, message);
  res.status(404).json(response);
};

