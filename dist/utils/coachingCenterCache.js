"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateCoachingCentersListCache = exports.cacheCoachingCentersList = exports.getCachedCoachingCentersList = void 0;
const logger_1 = require("./logger");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
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
        if (!data)
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
//# sourceMappingURL=coachingCenterCache.js.map