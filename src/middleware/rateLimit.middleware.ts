/**
 * Rate limiting middleware using Redis
 * Prevents brute force attacks and API abuse
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { t } from '../utils/i18n';
import { getRedisRateLimit } from '../utils/redisClient';

const getRedisClient = () => getRedisRateLimit();

/**
 * Rate limit options
 */
interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}

/**
 * Create rate limiting middleware
 */
export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      
      // Generate rate limit key
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : `ratelimit:${req.ip || 'unknown'}`;

      // Get current count
      const current = await redis.incr(key);
      
      // Set expiration on first request
      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      // Get remaining time
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, options.maxRequests - current);
      const resetTime = new Date(Date.now() + ttl * 1000);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      // Check if limit exceeded
      if (current > options.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          ip: req.ip,
          path: req.path,
          count: current,
        });

        res.status(429).json({
          success: false,
          message: options.message || t('rateLimit.exceeded'),
          data: {
            retryAfter: ttl,
            resetTime: resetTime.toISOString(),
          },
        });
        return;
      }

      // Track response status if needed
      if (options.skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function (body) {
          if (res.statusCode < 400) {
            redis.decr(key).catch(() => {
              // Ignore errors
            });
          }
          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', {
        error: error instanceof Error ? error.message : error,
      });
      // On error, allow request (fail open for rate limiting)
      next();
    }
  };
};

/**
 * General API rate limiting (100 requests per 15 minutes per IP)
 */
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests,
  keyGenerator: (req) => `ratelimit:general:${req.ip || 'unknown'}`,
  message: t('rateLimit.exceeded'),
});

/**
 * Login rate limiting (5 attempts per 15 minutes per IP)
 */
export const loginRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.loginMaxAttempts,
  keyGenerator: (req) => {
    const email = req.body?.email || req.body?.mobile || 'unknown';
    return `ratelimit:login:${req.ip || 'unknown'}:${email}`;
  },
  message: t('rateLimit.loginExceeded'),
});
