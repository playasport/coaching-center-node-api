import crypto from 'crypto';
import { logger } from './logger';
import { getRedisUserCache } from './redisClient';

const getRedisClient = () => getRedisUserCache();

const CACHE_KEY_PREFIX = 'academy:detail:v1:';
/** Same as home data — balance freshness vs load */
const CACHE_TTL = 5 * 60;

const roundCoord = (n: number): number => Math.round(n * 1000) / 1000;

/** Stable key segment for any :id format (UUID / ObjectId / custom) */
const hashRequestId = (rawId: string): string =>
  crypto.createHash('sha256').update(String(rawId).trim()).digest('hex').slice(0, 32);

export interface AcademyDetailCacheParams {
  /** Raw `id` route param (before DB resolve) */
  requestId: string;
  userId?: string | null;
  userLocation?: { latitude: number; longitude: number };
  /** Guest responses mask email/phone; must be part of key */
  isUserLoggedIn: boolean;
}

const buildKey = (params: AcademyDetailCacheParams): string => {
  const idPart = hashRequestId(params.requestId);
  const userPart = params.userId ? `u:${params.userId}` : 'anon';
  const authPart = params.isUserLoggedIn ? 'auth' : 'guest';
  if (!params.userLocation) {
    return `${CACHE_KEY_PREFIX}${idPart}:${userPart}:${authPart}:no-loc`;
  }
  const lat = roundCoord(params.userLocation.latitude);
  const lon = roundCoord(params.userLocation.longitude);
  return `${CACHE_KEY_PREFIX}${idPart}:${userPart}:${authPart}:loc:${lat}:${lon}`;
};

export const getCachedAcademyDetail = async (
  params: AcademyDetailCacheParams
): Promise<unknown | null> => {
  try {
    const redis = getRedisClient();

    const key = buildKey(params);
    const cached = await redis.get(key);
    if (cached) {
      logger.debug('Academy detail cache hit', {
        hasUser: !!params.userId,
        hasLocation: !!params.userLocation,
      });
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('Failed to get academy detail from cache', { error });
    return null;
  }
};

export const cacheAcademyDetail = async (
  params: AcademyDetailCacheParams,
  data: unknown
): Promise<void> => {
  try {
    const redis = getRedisClient();
    if (data == null) return;

    const key = buildKey(params);
    await redis.setex(key, CACHE_TTL, JSON.stringify(data));
    logger.debug('Academy detail cached', {
      hasUser: !!params.userId,
      hasLocation: !!params.userLocation,
    });
  } catch (error) {
    logger.warn('Failed to cache academy detail', { error });
  }
};
