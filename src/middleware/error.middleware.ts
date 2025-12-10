import { Request, Response, NextFunction } from 'express';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  // const message = err.message || t('errors.internalServerError');
  const message = t('errors.internalServerError');

  logger.error('Unhandled application error', {
    statusCode,
    message: err.message,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  const shouldIncludeStack = config.nodeEnv !== 'production';
  const data = shouldIncludeStack && err.stack ? { stack: err.stack } : null;

  const response = new ApiResponse(statusCode, data, message);
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

