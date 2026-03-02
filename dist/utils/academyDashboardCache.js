"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAcademyDashboardCache = exports.invalidateAcademyDashboardCache = exports.cacheAcademyDashboard = exports.getCachedAcademyDashboard = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
// Redis connection for academy dashboard caching
let redisClient = null;
/**
 * Get or create Redis client for academy dashboard caching
 */
const getRedisClient = () => {
    try {
        if (!redisClient) {
            redisClient = new ioredis_1.default({
                host: env_1.config.redis.host,
                port: env_1.config.redis.port,
                password: env_1.config.redis.password,
                db: env_1.config.redis.db.userCache, // Reuse userCache DB
                ...env_1.config.redis.connection,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
            });
            redisClient.on('error', (err) => {
                logger_1.logger.error('Redis academy dashboard cache client error:', err);
            });
            redisClient.on('connect', () => {
                logger_1.logger.info('Redis academy dashboard cache client connected');
            });
        }
        return redisClient;
    }
    catch (error) {
        logger_1.logger.warn('Redis not available for academy dashboard caching, using fallback only', error);
        return null;
    }
};
/**
 * Cache key prefix for academy dashboard
 */
const CACHE_KEY_PREFIX = 'academy:dashboard:';
/**
 * Cache TTL in seconds (5 minutes)
 */
const CACHE_TTL = 5 * 60; // 5 minutes
/**
 * Generate cache key for academy dashboard
 */
const getCacheKey = (academyUserId) => {
    return `${CACHE_KEY_PREFIX}${academyUserId}`;
};
/**
 * Get academy dashboard data from cache or null if not found
 */
const getCachedAcademyDashboard = async (academyUserId) => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return null;
        const cacheKey = getCacheKey(academyUserId);
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Academy dashboard cache hit', { academyUserId });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get academy dashboard from cache', { academyUserId, error });
        return null;
    }
};
exports.getCachedAcademyDashboard = getCachedAcademyDashboard;
/**
 * Cache academy dashboard data
 */
const cacheAcademyDashboard = async (academyUserId, data) => {
    try {
        const redis = getRedisClient();
        if (!redis || !data)
            return;
        const cacheKey = getCacheKey(academyUserId);
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
        logger_1.logger.debug('Academy dashboard cached', { academyUserId });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache academy dashboard', { academyUserId, error });
    }
};
exports.cacheAcademyDashboard = cacheAcademyDashboard;
/**
 * Invalidate academy dashboard cache
 */
const invalidateAcademyDashboardCache = async (academyUserId) => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return;
        const cacheKey = getCacheKey(academyUserId);
        await redis.del(cacheKey);
        logger_1.logger.debug('Academy dashboard cache invalidated', { academyUserId });
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate academy dashboard cache', { academyUserId, error });
    }
};
exports.invalidateAcademyDashboardCache = invalidateAcademyDashboardCache;
/**
 * Close Redis connection (for graceful shutdown)
 */
const closeAcademyDashboardCache = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('Redis academy dashboard cache client closed');
    }
};
exports.closeAcademyDashboardCache = closeAcademyDashboardCache;
//# sourceMappingURL=academyDashboardCache.js.map