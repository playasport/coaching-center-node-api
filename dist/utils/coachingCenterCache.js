"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeCoachingCenterCache = exports.invalidateCoachingCentersListCache = exports.cacheCoachingCentersList = exports.getCachedCoachingCentersList = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
// Redis connection for coaching center caching
let redisClient = null;
/**
 * Get or create Redis client for coaching center caching
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
                logger_1.logger.error('Redis coaching center cache client error:', err);
            });
            redisClient.on('connect', () => {
                logger_1.logger.info('Redis coaching center cache client connected');
            });
        }
        return redisClient;
    }
    catch (error) {
        logger_1.logger.warn('Redis not available for coaching center caching, using fallback only', error);
        return null;
    }
};
/**
 * Cache key prefix for coaching centers list
 */
const CACHE_KEY_PREFIX = 'coaching-center:list:';
/**
 * Cache TTL in seconds (15 minutes)
 */
const CACHE_TTL = 15 * 60; // 15 minutes
/**
 * Generate cache key for coaching centers list
 */
const getCacheKey = (page, limit, search, status, isActive, centerId) => {
    const searchPart = search && search.trim() ? `:search:${search.trim().toLowerCase()}` : '';
    const statusPart = status ? `:status:${status}` : '';
    const isActivePart = isActive !== undefined ? `:isActive:${isActive}` : '';
    const centerIdPart = centerId ? `:centerId:${centerId}` : '';
    return `${CACHE_KEY_PREFIX}page:${page}:limit:${limit}${searchPart}${statusPart}${isActivePart}${centerIdPart}`;
};
/**
 * Get coaching centers list from cache or null if not found
 */
const getCachedCoachingCentersList = async (page, limit, search, status, isActive, centerId) => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return null;
        const cacheKey = getCacheKey(page, limit, search, status, isActive, centerId);
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Coaching center list cache hit', { page, limit, search, status, isActive, centerId });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get coaching centers list from cache', { page, limit, search, status, isActive, centerId, error });
        return null;
    }
};
exports.getCachedCoachingCentersList = getCachedCoachingCentersList;
/**
 * Cache coaching centers list
 */
const cacheCoachingCentersList = async (page, limit, search, status, isActive, centerId, data) => {
    try {
        const redis = getRedisClient();
        if (!redis || !data)
            return;
        const cacheKey = getCacheKey(page, limit, search, status, isActive, centerId);
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
        logger_1.logger.debug('Coaching centers list cached', { page, limit, search, status, isActive, centerId, count: data.coachingCenters?.length || 0 });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache coaching centers list', { page, limit, search, status, isActive, centerId, error });
    }
};
exports.cacheCoachingCentersList = cacheCoachingCentersList;
/**
 * Invalidate coaching centers list cache
 * Call this when coaching centers are created, updated, or deleted
 */
const invalidateCoachingCentersListCache = async () => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return;
        // Get all cache keys for coaching centers list
        const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
            logger_1.logger.debug('Coaching centers list cache invalidated', { count: keys.length });
        }
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate coaching centers list cache', error);
    }
};
exports.invalidateCoachingCentersListCache = invalidateCoachingCentersListCache;
/**
 * Close Redis connection (for graceful shutdown)
 */
const closeCoachingCenterCache = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('Redis coaching center cache client closed');
    }
};
exports.closeCoachingCenterCache = closeCoachingCenterCache;
//# sourceMappingURL=coachingCenterCache.js.map