/**
 * Rate limiting middleware using Redis
 * Prevents brute force attacks and API abuse
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Rate limit options
 */
interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    message?: string;
}
/**
 * Create rate limiting middleware
 */
export declare const rateLimit: (options: RateLimitOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * General API rate limiting (100 requests per 15 minutes per IP)
 */
export declare const generalRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Login rate limiting (5 attempts per 15 minutes per IP)
 */
export declare const loginRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeRateLimit: () => Promise<void>;
export {};
//# sourceMappingURL=rateLimit.middleware.d.ts.map