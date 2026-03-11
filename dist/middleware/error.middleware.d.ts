import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
export interface AppError extends Error {
    statusCode?: number;
}
export declare const errorHandler: (err: AppError | ApiError, req: Request, res: Response, _next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map