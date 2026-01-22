import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';

// Redis connection for academy dashboard caching
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for academy dashboard caching
 */
const getRedisClient = (): Redis | null => {
  try {
    if (!redisClient) {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db.userCache, // Reuse userCache DB
        ...config.redis.connection,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis academy dashboard cache client error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis academy dashboard cache client connected');
      });
    }
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for academy dashboard caching, using fallback only', error);
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
const getCacheKey = (academyUserId: string): string => {
  return `${CACHE_KEY_PREFIX}${academyUserId}`;
};

/**
 * Get academy dashboard data from cache or null if not found
 */
export const getCachedAcademyDashboard = async (
  academyUserId: string
): Promise<any | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cacheKey = getCacheKey(academyUserId);
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Academy dashboard cache hit', { academyUserId });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get academy dashboard from cache', { academyUserId, error });
    return null;
  }
};

/**
 * Cache academy dashboard data
 */
export const cacheAcademyDashboard = async (
  academyUserId: string,
  data: any
): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !data) return;

    const cacheKey = getCacheKey(academyUserId);
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    logger.debug('Academy dashboard cached', { academyUserId });
  } catch (error) {
    logger.warn('Failed to cache academy dashboard', { academyUserId, error });
  }
};

/**
 * Invalidate academy dashboard cache
 */
export const invalidateAcademyDashboardCache = async (academyUserId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    const cacheKey = getCacheKey(academyUserId);
    await redis.del(cacheKey);
    logger.debug('Academy dashboard cache invalidated', { academyUserId });
  } catch (error) {
    logger.warn('Failed to invalidate academy dashboard cache', { academyUserId, error });
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closeAcademyDashboardCache = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis academy dashboard cache client closed');
  }
};
