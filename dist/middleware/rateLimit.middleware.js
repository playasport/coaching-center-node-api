"use strict";
/**
 * Rate limiting middleware using Redis
 * Prevents brute force attacks and API abuse
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimit = exports.generalRateLimit = exports.rateLimit = void 0;
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const i18n_1 = require("../utils/i18n");
const redisClient_1 = require("../utils/redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisRateLimit)();
/**
 * Create rate limiting middleware
 */
const rateLimit = (options) => {
    return async (req, res, next) => {
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
                logger_1.logger.warn('Rate limit exceeded', {
                    key,
                    ip: req.ip,
                    path: req.path,
                    count: current,
                });
                res.status(429).json({
                    success: false,
                    message: options.message || (0, i18n_1.t)('rateLimit.exceeded'),
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
        }
        catch (error) {
            logger_1.logger.error('Rate limit middleware error:', {
                error: error instanceof Error ? error.message : error,
            });
            // On error, allow request (fail open for rate limiting)
            next();
        }
    };
};
exports.rateLimit = rateLimit;
/**
 * General API rate limiting (100 requests per 15 minutes per IP)
 */
exports.generalRateLimit = (0, exports.rateLimit)({
    windowMs: env_1.config.rateLimit.windowMs,
    maxRequests: env_1.config.rateLimit.maxRequests,
    keyGenerator: (req) => `ratelimit:general:${req.ip || 'unknown'}`,
    message: (0, i18n_1.t)('rateLimit.exceeded'),
});
/**
 * Login rate limiting (5 attempts per 15 minutes per IP)
 */
exports.loginRateLimit = (0, exports.rateLimit)({
    windowMs: env_1.config.rateLimit.windowMs,
    maxRequests: env_1.config.rateLimit.loginMaxAttempts,
    keyGenerator: (req) => {
        const email = req.body?.email || req.body?.mobile || 'unknown';
        return `ratelimit:login:${req.ip || 'unknown'}:${email}`;
    },
    message: (0, i18n_1.t)('rateLimit.loginExceeded'),
});
//# sourceMappingURL=rateLimit.middleware.js.map