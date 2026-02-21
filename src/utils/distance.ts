import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';


// Redis connection for distance caching
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for distance caching
 */
const getRedisClient = (): Redis | null => {
  try {
    if (!redisClient) {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db.userCache, // Reuse userCache DB or create new one
        ...config.redis.connection,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis distance cache client error:', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis distance cache client connected');
      });
    }
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for distance caching, using fallback only', error);
    return null;
  }
};

/**
 * Cache key prefix for distance calculations
 */
const CACHE_KEY_PREFIX = 'distance:';
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Calculate distance using Haversine formula (fallback)
 * Returns distance in kilometers (rounded to 2 decimal places)
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return roundToTwoDecimals(R * c);
};

/**
 * Calculate bounding box for approximate radius filtering
 * Returns {minLat, maxLat, minLon, maxLon}
 * 
 * This creates a rectangular bounding box around a point to pre-filter
 * locations before calculating exact distances. The bounding box includes
 * a buffer factor to ensure we don't miss nearby records that are just
 * outside the circular radius but inside the rectangular box.
 * 
 * @param latitude - Center point latitude
 * @param longitude - Center point longitude
 * @param radiusKm - Search radius in kilometers
 * @param bufferFactor - Multiplier for bounding box size (default: 1.414 for diagonal coverage)
 * @returns Bounding box coordinates
 */
export const getBoundingBox = (
  latitude: number,
  longitude: number,
  radiusKm: number,
  bufferFactor: number = 1.5 // 1.5x buffer to ensure we don't miss nearby records
): { minLat: number; maxLat: number; minLon: number; maxLon: number } => {
  // Earth's radius in kilometers
  const R = 6371;
  // Apply buffer factor to ensure we don't miss records at the edges
  const adjustedRadius = radiusKm * bufferFactor;
  // Convert radius to degrees (approximate)
  const latDelta = adjustedRadius / R * (180 / Math.PI);
  const lonDelta = adjustedRadius / (R * Math.cos(latitude * Math.PI / 180)) * (180 / Math.PI);
  
  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta,
  };
};

/**
 * Generate cache key for distance calculation
 */
const getCacheKey = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  // Round coordinates to 4 decimal places (~11 meters precision) for cache efficiency
  const roundedLat1 = Math.round(lat1 * 10000) / 10000;
  const roundedLon1 = Math.round(lon1 * 10000) / 10000;
  const roundedLat2 = Math.round(lat2 * 10000) / 10000;
  const roundedLon2 = Math.round(lon2 * 10000) / 10000;
  return `${CACHE_KEY_PREFIX}${roundedLat1},${roundedLon1}:${roundedLat2},${roundedLon2}`;
};

/**
 * Calculate distance using Google Maps Distance Matrix API with caching
 * Falls back to Haversine formula if API fails or is not configured
 * 
 * @param originLat - Origin latitude
 * @param originLon - Origin longitude
 * @param destLat - Destination latitude
 * @param destLon - Destination longitude
 * @returns Distance in kilometers
 */
export const calculateDistance = async (
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
): Promise<number> => {
  try {
    // Check cache first
    const redis = getRedisClient();
    const cacheKey = getCacheKey(originLat, originLon, destLat, destLon);

    if (redis) {
      try {
        const cachedDistance = await redis.get(cacheKey);
        if (cachedDistance) {
          const distance = parseFloat(cachedDistance);
          if (!isNaN(distance) && distance >= 0) {
            logger.debug('Distance cache hit', { cacheKey, distance });
            return roundToTwoDecimals(distance);
          }
        }
      } catch (cacheError) {
        logger.warn('Failed to read from distance cache', { error: cacheError });
      }
    }

    // Try Google Maps API if configured
    const googleMapsApiKey = config.location.googleMapsApiKey;
    if (googleMapsApiKey) {
      try {
        const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
        url.searchParams.append('origins', `${originLat},${originLon}`);
        url.searchParams.append('destinations', `${destLat},${destLon}`);
        url.searchParams.append('key', googleMapsApiKey);
        url.searchParams.append('units', 'metric');

        const response = await fetch(url.toString());
        const data = await response.json() as {
          status: string;
          rows?: Array<{
            elements?: Array<{
              status: string;
              distance?: { value: number };
            }>;
          }>;
          error_message?: string;
        };

        if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const distanceInMeters = data.rows[0].elements[0].distance!.value;
          const distanceInKm = roundToTwoDecimals(distanceInMeters / 1000);

          // Cache the result
          if (redis && distanceInKm >= 0) {
            try {
              await redis.setex(cacheKey, CACHE_TTL, distanceInKm.toString());
              logger.debug('Distance cached from Google Maps API', { cacheKey, distance: distanceInKm });
            } catch (cacheError) {
              logger.warn('Failed to cache distance', { error: cacheError });
            }
          }

          return distanceInKm;
        } else {
          logger.warn('Google Maps API returned error, using Haversine fallback', {
            status: data.status,
            error: data.error_message,
          });
        }
      } catch (apiError) {
        logger.warn('Google Maps API request failed, using Haversine fallback', {
          error: apiError instanceof Error ? apiError.message : apiError,
        });
      }
    }

    // Fallback to Haversine formula
    const distance = calculateHaversineDistance(originLat, originLon, destLat, destLon);

    // Cache Haversine result too (for consistency)
    if (redis && distance >= 0) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, distance.toString());
        logger.debug('Distance cached from Haversine calculation', { cacheKey, distance });
      } catch (cacheError) {
        logger.warn('Failed to cache Haversine distance', { error: cacheError });
      }
    }

    return roundToTwoDecimals(distance);
  } catch (error) {
    logger.error('Distance calculation error, using Haversine fallback', {
      error: error instanceof Error ? error.message : error,
    });
    // Final fallback to Haversine
    return calculateHaversineDistance(originLat, originLon, destLat, destLon);
  }
};


/**
 * Calculate distances for multiple destinations from a single origin
 * Uses batch processing for efficiency
 * 
 * @param originLat - Origin latitude
 * @param originLon - Origin longitude
 * @param destinations - Array of {latitude, longitude} coordinates
 * @returns Array of distances in kilometers (same order as destinations)
 */
export const calculateDistances = async (
  originLat: number,
  originLon: number,
  destinations: Array<{ latitude: number; longitude: number }>
): Promise<number[]> => {
  try {
    // Check cache for all destinations
    const redis = getRedisClient();
    const cachedDistances: (number | null)[] = [];
    const uncachedIndices: number[] = [];

    if (redis) {
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        const cacheKey = getCacheKey(originLat, originLon, dest.latitude, dest.longitude);
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            const distance = parseFloat(cached);
            if (!isNaN(distance) && distance >= 0) {
              cachedDistances[i] = roundToTwoDecimals(distance);
              continue;
            }
          }
        } catch (cacheError) {
          logger.warn('Failed to read from distance cache', { error: cacheError });
        }
        uncachedIndices.push(i);
        cachedDistances[i] = null;
      }
    } else {
      // No cache available, mark all as uncached
      for (let i = 0; i < destinations.length; i++) {
        uncachedIndices.push(i);
        cachedDistances[i] = null;
      }
    }

    // If all distances are cached, return them (already rounded)
    if (uncachedIndices.length === 0) {
      return cachedDistances.map(d => roundToTwoDecimals(d!)) as number[];
    }

    // Try Google Maps API for uncached distances
    const googleMapsApiKey = config.location.googleMapsApiKey;
    if (googleMapsApiKey && uncachedIndices.length > 0) {
      try {
        // Google Maps API supports up to 25 destinations per request
        const batchSize = 25;
        const uncachedDestinations = uncachedIndices.map((idx) => destinations[idx]);

        for (let i = 0; i < uncachedDestinations.length; i += batchSize) {
          const batch = uncachedDestinations.slice(i, i + batchSize);
          const destinationsStr = batch.map((d) => `${d.latitude},${d.longitude}`).join('|');

          const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
          url.searchParams.append('origins', `${originLat},${originLon}`);
          url.searchParams.append('destinations', destinationsStr);
          url.searchParams.append('key', googleMapsApiKey);
          url.searchParams.append('units', 'metric');

          const response = await fetch(url.toString());
          const data = await response.json() as {
            status: string;
            rows?: Array<{
              elements?: Array<{
                status: string;
                distance?: { value: number };
              }>;
            }>;
          };

          if (data.status === 'OK' && data.rows?.[0]?.elements) {
            const elements = data.rows[0].elements;
            for (let j = 0; j < elements.length && i + j < uncachedDestinations.length; j++) {
              const element = elements[j];
              const dest = batch[j];
              const originalIndex = uncachedIndices[i + j];
              if (element.status === 'OK' && element.distance) {
                const distanceInKm = roundToTwoDecimals(element.distance.value / 1000);
                cachedDistances[originalIndex] = distanceInKm;

                if (redis) {
                  const cacheKey = getCacheKey(originLat, originLon, dest.latitude, dest.longitude);
                  try {
                    await redis.setex(cacheKey, CACHE_TTL, distanceInKm.toString());
                  } catch (cacheError) {
                    logger.warn('Failed to cache distance', { error: cacheError });
                  }
                }
              } else {
                const distance = calculateHaversineDistance(originLat, originLon, dest.latitude, dest.longitude);
                cachedDistances[originalIndex] = roundToTwoDecimals(distance);
              }
            }
          }
        }
      } catch (apiError) {
        logger.warn('Google Maps API batch request failed, using Haversine fallback', {
          error: apiError instanceof Error ? apiError.message : apiError,
        });
      }
    }

    // Fill in any remaining uncached distances with Haversine
    for (const idx of uncachedIndices) {
      if (cachedDistances[idx] === null) {
        const dest = destinations[idx];
        cachedDistances[idx] = calculateHaversineDistance(originLat, originLon, dest.latitude, dest.longitude);
      }
    }

    return cachedDistances.map(d => roundToTwoDecimals(d!)) as number[];
  } catch (error) {
    logger.error('Batch distance calculation error, using Haversine fallback', {
      error: error instanceof Error ? error.message : error,
    });
    // Fallback: calculate all using Haversine
    return destinations.map((dest) =>
      roundToTwoDecimals(calculateHaversineDistance(originLat, originLon, dest.latitude, dest.longitude))
    );
  }
};

