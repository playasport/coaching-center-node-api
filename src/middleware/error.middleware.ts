import { Request, Response, NextFunction } from 'express';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || t('errors.internalServerError');
  const data =
    process.env.NODE_ENV === 'development' && err.stack
      ? { stack: err.stack }
      : null;

  const response = new ApiResponse(statusCode, data, message);
  res.status(statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const message = t('errors.routeNotFound', { route: req.originalUrl });
  const response = new ApiResponse(404, null, message);
  res.status(404).json(response);
};

