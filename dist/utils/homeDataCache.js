"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeHomeDataCache = exports.cacheAcademyList = exports.getCachedAcademyList = exports.cacheGlobalHomeData = exports.getCachedGlobalHomeData = exports.cacheHomeData = exports.getCachedHomeData = void 0;
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
                logger_1.logger.error('Redis home data cache client error:', err);
            });
            redisClient.on('connect', () => {
                logger_1.logger.info('Redis home data cache client connected');
            });
        }
        return redisClient;
    }
    catch (error) {
        logger_1.logger.warn('Redis not available for home data caching', error);
        return null;
    }
};
const CACHE_KEY_PREFIX = 'home:data:';
/** Cache TTL: 5 minutes - balance freshness vs DB load for same user/location */
const CACHE_TTL = 5 * 60;
/**
 * Round coordinates to 3 decimals (~111m) so nearby requests share cache
 */
const roundCoord = (n) => Math.round(n * 1000) / 1000;
/**
 * Build cache key from user, location, radius
 */
const getCacheKey = (userId, userLocation, radius) => {
    const userPart = userId ? `user:${userId}` : 'anon';
    if (!userLocation) {
        return `${CACHE_KEY_PREFIX}${userPart}:no-location`;
    }
    const lat = roundCoord(userLocation.latitude);
    const lon = roundCoord(userLocation.longitude);
    const radiusPart = radius !== undefined ? radius : 'default';
    return `${CACHE_KEY_PREFIX}${userPart}:${lat}:${lon}:${radiusPart}`;
};
/**
 * Get home data from cache or null if not found
 */
const getCachedHomeData = async (params) => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return null;
        const key = getCacheKey(params.userId, params.userLocation, params.radius);
        const cached = await redis.get(key);
        if (cached) {
            logger_1.logger.debug('Home data cache hit', {
                userId: params.userId ? 'present' : 'anon',
                hasLocation: !!params.userLocation,
            });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get home data from cache', { error });
        return null;
    }
};
exports.getCachedHomeData = getCachedHomeData;
/**
 * Cache home data
 */
const cacheHomeData = async (params, data) => {
    try {
        const redis = getRedisClient();
        if (!redis || !data)
            return;
        const key = getCacheKey(params.userId, params.userLocation, params.radius);
        await redis.setex(key, CACHE_TTL, JSON.stringify(data));
        logger_1.logger.debug('Home data cached', { hasLocation: !!params.userLocation });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache home data', { error });
    }
};
exports.cacheHomeData = cacheHomeData;
/** Global data (popularSports, popularReels, topCities) - no user/location, longer TTL */
const GLOBAL_CACHE_KEY = `${CACHE_KEY_PREFIX}global`;
const GLOBAL_CACHE_TTL = 10 * 60; // 10 minutes
/**
 * Get cached global home data (popularSports, popularReels, topCities)
 */
const getCachedGlobalHomeData = async () => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return null;
        const cached = await redis.get(GLOBAL_CACHE_KEY);
        if (cached)
            return JSON.parse(cached);
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get global home data from cache', { error });
        return null;
    }
};
exports.getCachedGlobalHomeData = getCachedGlobalHomeData;
/**
 * Cache global home data
 */
const cacheGlobalHomeData = async (data) => {
    try {
        const redis = getRedisClient();
        if (!redis || !data)
            return;
        await redis.setex(GLOBAL_CACHE_KEY, GLOBAL_CACHE_TTL, JSON.stringify(data));
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache global home data', { error });
    }
};
exports.cacheGlobalHomeData = cacheGlobalHomeData;
/** ---- Academy list cache ---- */
const ACADEMY_CACHE_PREFIX = 'academy:list:';
const ACADEMY_CACHE_TTL = 3 * 60; // 3 minutes
const getAcademyCacheKey = (params) => {
    const parts = [ACADEMY_CACHE_PREFIX];
    parts.push(`p:${params.page}`);
    parts.push(`l:${params.limit}`);
    if (params.latitude !== undefined && params.longitude !== undefined) {
        parts.push(`loc:${roundCoord(params.latitude)},${roundCoord(params.longitude)}`);
    }
    if (params.radius !== undefined)
        parts.push(`r:${params.radius}`);
    if (params.userId)
        parts.push(`u:${params.userId}`);
    if (params.city)
        parts.push(`city:${params.city.toLowerCase()}`);
    if (params.state)
        parts.push(`state:${params.state.toLowerCase()}`);
    if (params.sportId)
        parts.push(`sid:${params.sportId}`);
    if (params.sportIds)
        parts.push(`sids:${params.sportIds}`);
    if (params.gender)
        parts.push(`g:${params.gender}`);
    if (params.forDisabled)
        parts.push('dis:1');
    if (params.minAge !== undefined)
        parts.push(`mina:${params.minAge}`);
    if (params.maxAge !== undefined)
        parts.push(`maxa:${params.maxAge}`);
    return parts.join(':');
};
const getCachedAcademyList = async (params) => {
    try {
        const redis = getRedisClient();
        if (!redis)
            return null;
        const key = getAcademyCacheKey(params);
        const cached = await redis.get(key);
        if (cached) {
            logger_1.logger.debug('Academy list cache hit', { page: params.page });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get academy list from cache', { error });
        return null;
    }
};
exports.getCachedAcademyList = getCachedAcademyList;
const cacheAcademyList = async (params, data) => {
    try {
        const redis = getRedisClient();
        if (!redis || !data)
            return;
        const key = getAcademyCacheKey(params);
        await redis.setex(key, ACADEMY_CACHE_TTL, JSON.stringify(data));
        logger_1.logger.debug('Academy list cached', { page: params.page });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache academy list', { error });
    }
};
exports.cacheAcademyList = cacheAcademyList;
/**
 * Close Redis connection (for graceful shutdown)
 */
const closeHomeDataCache = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('Redis home data cache client closed');
    }
};
exports.closeHomeDataCache = closeHomeDataCache;
//# sourceMappingURL=homeDataCache.js.map