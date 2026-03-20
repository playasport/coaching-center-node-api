"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAcademyDashboardCache = exports.cacheAcademyDashboard = exports.getCachedAcademyDashboard = void 0;
const logger_1 = require("./logger");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
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
        if (!data)
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
        const cacheKey = getCacheKey(academyUserId);
        await redis.del(cacheKey);
        logger_1.logger.debug('Academy dashboard cache invalidated', { academyUserId });
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate academy dashboard cache', { academyUserId, error });
    }
};
exports.invalidateAcademyDashboardCache = invalidateAcademyDashboardCache;
//# sourceMappingURL=academyDashboardCache.js.map