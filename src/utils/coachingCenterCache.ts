import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';

// Redis connection for coaching center caching
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for coaching center caching
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
        logger.error('Redis coaching center cache client error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis coaching center cache client connected');
      });
    }
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for coaching center caching, using fallback only', error);
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
const getCacheKey = (page: number, limit: number, search?: string, status?: string, isActive?: boolean, centerId?: string): string => {
  const searchPart = search && search.trim() ? `:search:${search.trim().toLowerCase()}` : '';
  const statusPart = status ? `:status:${status}` : '';
  const isActivePart = isActive !== undefined ? `:isActive:${isActive}` : '';
  const centerIdPart = centerId ? `:centerId:${centerId}` : '';
  return `${CACHE_KEY_PREFIX}page:${page}:limit:${limit}${searchPart}${statusPart}${isActivePart}${centerIdPart}`;
};

/**
 * Get coaching centers list from cache or null if not found
 */
export const getCachedCoachingCentersList = async (
  page: number,
  limit: number,
  search?: string,
  status?: string,
  isActive?: boolean,
  centerId?: string
): Promise<any | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cacheKey = getCacheKey(page, limit, search, status, isActive, centerId);
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Coaching center list cache hit', { page, limit, search, status, isActive, centerId });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get coaching centers list from cache', { page, limit, search, status, isActive, centerId, error });
    return null;
  }
};

/**
 * Cache coaching centers list
 */
export const cacheCoachingCentersList = async (
  page: number,
  limit: number,
  search: string | undefined,
  status: string | undefined,
  isActive: boolean | undefined,
  centerId: string | undefined,
  data: any
): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !data) return;

    const cacheKey = getCacheKey(page, limit, search, status, isActive, centerId);
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    logger.debug('Coaching centers list cached', { page, limit, search, status, isActive, centerId, count: data.coachingCenters?.length || 0 });
  } catch (error) {
    logger.warn('Failed to cache coaching centers list', { page, limit, search, status, isActive, centerId, error });
  }
};

/**
 * Invalidate coaching centers list cache
 * Call this when coaching centers are created, updated, or deleted
 */
export const invalidateCoachingCentersListCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    // Get all cache keys for coaching centers list
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug('Coaching centers list cache invalidated', { count: keys.length });
    }
  } catch (error) {
    logger.warn('Failed to invalidate coaching centers list cache', error);
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closeCoachingCenterCache = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis coaching center cache client closed');
  }
};
