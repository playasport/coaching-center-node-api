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
        logger.error('Redis home data cache client error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis home data cache client connected');
      });
    }
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for home data caching', error);
    return null;
  }
};

const CACHE_KEY_PREFIX = 'home:data:';
/** Cache TTL: 5 minutes - balance freshness vs DB load for same user/location */
const CACHE_TTL = 5 * 60;

/**
 * Round coordinates to 3 decimals (~111m) so nearby requests share cache
 */
const roundCoord = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Build cache key from user, location, radius
 */
const getCacheKey = (
  userId: string | undefined,
  userLocation: { latitude: number; longitude: number } | undefined,
  radius: number | undefined
): string => {
  const userPart = userId ? `user:${userId}` : 'anon';
  if (!userLocation) {
    return `${CACHE_KEY_PREFIX}${userPart}:no-location`;
  }
  const lat = roundCoord(userLocation.latitude);
  const lon = roundCoord(userLocation.longitude);
  const radiusPart = radius !== undefined ? radius : 'default';
  return `${CACHE_KEY_PREFIX}${userPart}:${lat}:${lon}:${radiusPart}`;
};

export interface HomeDataCacheParams {
  userId?: string;
  userLocation?: { latitude: number; longitude: number };
  radius?: number;
}

/**
 * Get home data from cache or null if not found
 */
export const getCachedHomeData = async (
  params: HomeDataCacheParams
): Promise<any | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const key = getCacheKey(params.userId, params.userLocation, params.radius);
    const cached = await redis.get(key);
    if (cached) {
      logger.debug('Home data cache hit', {
        userId: params.userId ? 'present' : 'anon',
        hasLocation: !!params.userLocation,
      });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get home data from cache', { error });
    return null;
  }
};

/**
 * Cache home data
 */
export const cacheHomeData = async (
  params: HomeDataCacheParams,
  data: any
): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !data) return;

    const key = getCacheKey(params.userId, params.userLocation, params.radius);
    await redis.setex(key, CACHE_TTL, JSON.stringify(data));
    logger.debug('Home data cached', { hasLocation: !!params.userLocation });
  } catch (error) {
    logger.warn('Failed to cache home data', { error });
  }
};

/** Global data (popularSports, popularReels, topCities) - no user/location, longer TTL */
const GLOBAL_CACHE_KEY = `${CACHE_KEY_PREFIX}global`;
const GLOBAL_CACHE_TTL = 10 * 60; // 10 minutes

export interface CachedGlobalHomeData {
  popularSports: any[];
  popularReels: any[];
  topCities: any[];
}

/**
 * Get cached global home data (popularSports, popularReels, topCities)
 */
export const getCachedGlobalHomeData = async (): Promise<CachedGlobalHomeData | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;
    const cached = await redis.get(GLOBAL_CACHE_KEY);
    if (cached) return JSON.parse(cached);
    return null;
  } catch (error) {
    logger.warn('Failed to get global home data from cache', { error });
    return null;
  }
};

/**
 * Cache global home data
 */
export const cacheGlobalHomeData = async (data: CachedGlobalHomeData): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !data) return;
    await redis.setex(GLOBAL_CACHE_KEY, GLOBAL_CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    logger.warn('Failed to cache global home data', { error });
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closeHomeDataCache = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis home data cache client closed');
  }
};
