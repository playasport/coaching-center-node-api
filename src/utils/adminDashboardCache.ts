import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';

let redisClient: Redis | null = null;

const getRedisClient = (): Redis | null => {
  try {
    if (!redisClient) {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db.userCache,
        ...config.redis.connection,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis admin dashboard cache client error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis admin dashboard cache client connected');
      });
    }
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for admin dashboard caching', error);
    return null;
  }
};

const CACHE_KEY = 'admin:dashboard:stats';
const CACHE_TTL = 5 * 60; // 5 minutes

/**
 * Get admin dashboard stats from cache or null if not found
 */
export const getCachedAdminDashboardStats = async (): Promise<any | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      logger.debug('Admin dashboard cache hit');
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get admin dashboard from cache', { error });
    return null;
  }
};

/**
 * Cache admin dashboard stats
 */
export const cacheAdminDashboardStats = async (data: any): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !data) return;

    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data));
    logger.debug('Admin dashboard stats cached');
  } catch (error) {
    logger.warn('Failed to cache admin dashboard stats', { error });
  }
};

/**
 * Invalidate admin dashboard cache (e.g. when critical data changes)
 */
export const invalidateAdminDashboardCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    await redis.del(CACHE_KEY);
    logger.debug('Admin dashboard cache invalidated');
  } catch (error) {
    logger.warn('Failed to invalidate admin dashboard cache', { error });
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closeAdminDashboardCache = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis admin dashboard cache client closed');
  }
};
