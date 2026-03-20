import { logger } from './logger';
import { getRedisUserCache } from './redisClient';

const getRedisClient = () => getRedisUserCache();

const CACHE_KEY = 'admin:dashboard:stats';
const CACHE_TTL = 5 * 60; // 5 minutes

/**
 * Get admin dashboard stats from cache or null if not found
 */
export const getCachedAdminDashboardStats = async (): Promise<any | null> => {
  try {
    const redis = getRedisClient();

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
    if (!data) return;

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

    await redis.del(CACHE_KEY);
    logger.debug('Admin dashboard cache invalidated');
  } catch (error) {
    logger.warn('Failed to invalidate admin dashboard cache', { error });
  }
};

