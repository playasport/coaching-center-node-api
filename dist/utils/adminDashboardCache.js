"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAdminDashboardCache = exports.invalidateAdminDashboardCache = exports.cacheAdminDashboardStats = exports.getCachedAdminDashboardStats = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
let redisClient = null;
const getRedisClient = () => {
    try {
        if (!redisClient) {
            redisClient = new ioredis_1.default({
                host: env_1.config.redis.host,
                port: env_1.config.redis.port,
                password: env_1.config.redis.password,
                db: env_1.config.redis.db.userCache,
                ...env_1.config.redis.connection,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
            });
            redisClient.on('error', (err) => {
                logger_1.logger.error('Redis admin dashboard cache client error:', err);
            });
            redisClient.on('connect', () => {
                logger_1.logger.info('Redis admin dashboard cache client connected');
            });
        }
        return redisClient;
    }
    catch (error) {
        logger_1.logger.warn('Redis not available for admin dashboard caching', error);
        return null;
    }
};
const CACHE_KEY = 'admin:dashboard:stats';
const CACHE_TTL = 5 * 60; // 5 minutes
/**
 * Get admin dashboard stats from cache or null if not found
 */
const getCachedAdminDashboardStats = async () => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return null;
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
        if (!redis || !data)
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
        if (!redis)
            return;
        await redis.del(CACHE_KEY);
        logger_1.logger.debug('Admin dashboard cache invalidated');
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate admin dashboard cache', { error });
    }
};
exports.invalidateAdminDashboardCache = invalidateAdminDashboardCache;
/**
 * Close Redis connection (for graceful shutdown)
 */
const closeAdminDashboardCache = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('Redis admin dashboard cache client closed');
    }
};
exports.closeAdminDashboardCache = closeAdminDashboardCache;
//# sourceMappingURL=adminDashboardCache.js.map