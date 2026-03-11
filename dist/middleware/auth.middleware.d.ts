import { Request, Response, NextFunction } from 'express';
/**
 * Enhanced authentication middleware with security validations
 * - Validates JWT access token
 * - Checks token blacklist
 * - Verifies user still exists and is active
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware for public routes
 * Sets req.user if token is valid, but doesn't fail if token is missing or invalid
 * Useful for routes that work both with and without authentication
 */
export declare const optionalAuthenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map