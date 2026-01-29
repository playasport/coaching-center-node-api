import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';

// Redis connection for location caching
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for location caching
 */
const getRedisClient = (): Redis | null => {
  try {
    if (!redisClient) {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db.userCache, // Reuse userCache DB or can be configured separately
        ...config.redis.connection,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis location cache client error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis location cache client connected');
      });
    }
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for location caching, using fallback only', error);
    return null;
  }
};

/**
 * Cache key prefixes
 */
const CACHE_KEY_PREFIX = {
  countries: 'location:countries',
  states: 'location:states:',
  cities: 'location:cities:',
};

/**
 * Cache TTL in seconds
 */
const CACHE_TTL = {
  countries: 3600, // 1 hour - countries rarely change
  states: 1800, // 30 minutes - states change occasionally
  cities: 1800, // 30 minutes - cities change occasionally
};

/**
 * Get countries from cache or null if not found
 */
export const getCachedCountries = async (): Promise<any[] | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cached = await redis.get(CACHE_KEY_PREFIX.countries);
    if (cached) {
      logger.debug('Location cache hit: countries');
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get countries from cache', error);
    return null;
  }
};

/**
 * Cache countries
 */
export const cacheCountries = async (countries: any[]): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !countries || countries.length === 0) return;

    await redis.setex(
      CACHE_KEY_PREFIX.countries,
      CACHE_TTL.countries,
      JSON.stringify(countries)
    );
    logger.debug('Countries cached', { count: countries.length });
  } catch (error) {
    logger.warn('Failed to cache countries', error);
  }
};

/**
 * Get states from cache or null if not found
 */
export const getCachedStates = async (countryCode: string): Promise<any[] | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cacheKey = `${CACHE_KEY_PREFIX.states}${countryCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Location cache hit: states', { countryCode });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get states from cache', { countryCode, error });
    return null;
  }
};

/**
 * Cache states for a country
 */
export const cacheStates = async (countryCode: string, states: any[]): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !states || states.length === 0) return;

    const cacheKey = `${CACHE_KEY_PREFIX.states}${countryCode}`;
    await redis.setex(cacheKey, CACHE_TTL.states, JSON.stringify(states));
    logger.debug('States cached', { countryCode, count: states.length });
  } catch (error) {
    logger.warn('Failed to cache states', { countryCode, error });
  }
};

/**
 * Get cities from cache or null if not found
 */
export const getCachedCities = async (stateId: string): Promise<any[] | null> => {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cacheKey = `${CACHE_KEY_PREFIX.cities}${stateId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Location cache hit: cities', { stateId });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get cities from cache', { stateId, error });
    return null;
  }
};

/**
 * Cache cities for a state
 */
export const cacheCities = async (stateId: string, cities: any[]): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis || !cities || cities.length === 0) return;

    const cacheKey = `${CACHE_KEY_PREFIX.cities}${stateId}`;
    await redis.setex(cacheKey, CACHE_TTL.cities, JSON.stringify(cities));
    logger.debug('Cities cached', { stateId, count: cities.length });
  } catch (error) {
    logger.warn('Failed to cache cities', { stateId, error });
  }
};

/**
 * Invalidate location cache (call when location data is updated)
 */
export const invalidateLocationCache = async (
  type: 'countries' | 'states' | 'cities',
  identifier?: string
): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    if (type === 'countries') {
      await redis.del(CACHE_KEY_PREFIX.countries);
      logger.debug('Countries cache invalidated');
    } else if (type === 'states' && identifier) {
      const cacheKey = `${CACHE_KEY_PREFIX.states}${identifier}`;
      await redis.del(cacheKey);
      logger.debug('States cache invalidated', { countryCode: identifier });
    } else if (type === 'cities' && identifier) {
      const cacheKey = `${CACHE_KEY_PREFIX.cities}${identifier}`;
      await redis.del(cacheKey);
      logger.debug('Cities cache invalidated', { stateId: identifier });
    }
  } catch (error) {
    logger.warn('Failed to invalidate location cache', { type, identifier, error });
  }
};

/**
 * Invalidate all location caches (use with caution)
 */
export const invalidateAllLocationCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    const keys = await redis.keys(`${CACHE_KEY_PREFIX.countries}*`);
    const statesKeys = await redis.keys(`${CACHE_KEY_PREFIX.states}*`);
    const citiesKeys = await redis.keys(`${CACHE_KEY_PREFIX.cities}*`);

    const allKeys = [...keys, ...statesKeys, ...citiesKeys];
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      logger.debug('All location caches invalidated', { count: allKeys.length });
    }
  } catch (error) {
    logger.warn('Failed to invalidate all location caches', error);
  }
};
