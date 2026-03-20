"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAdminDashboardCache = exports.cacheAdminDashboardStats = exports.getCachedAdminDashboardStats = void 0;
const logger_1 = require("./logger");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
const CACHE_KEY = 'admin:dashboard:stats';
const CACHE_TTL = 5 * 60; // 5 minutes
/**
 * Get admin dashboard stats from cache or null if not found
 */
const getCachedAdminDashboardStats = async () => {
    try {
        const redis = getRedisClient();
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            logger_1.logger.debug('Admin dashboard cache hit');
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get admin dashboard from cache', { error });
        return null;
    }
};
exports.getCachedAdminDashboardStats = getCachedAdminDashboardStats;
/**
 * Cache admin dashboard stats
 */
const cacheAdminDashboardStats = async (data) => {
    try {
        const redis = getRedisClient();
        if (!data)
            return;
        await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data));
        logger_1.logger.debug('Admin dashboard stats cached');
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache admin dashboard stats', { error });
    }
};
exports.cacheAdminDashboardStats = cacheAdminDashboardStats;
/**
 * Invalidate admin dashboard cache (e.g. when critical data changes)
 */
const invalidateAdminDashboardCache = async () => {
    try {
        const redis = getRedisClient();
        await redis.del(CACHE_KEY);
        logger_1.logger.debug('Admin dashboard cache invalidated');
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate admin dashboard cache', { error });
    }
};
exports.invalidateAdminDashboardCache = invalidateAdminDashboardCache;
//# sourceMappingURL=adminDashboardCache.js.map