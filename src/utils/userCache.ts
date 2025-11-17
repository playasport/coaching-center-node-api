import Redis from 'ioredis';
import { Types } from 'mongoose';
import { config } from '../config/env';
import { logger } from './logger';
import { UserModel } from '../models/user.model';

// Redis connection for caching (separate from BullMQ)
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for caching
 */
const getRedisClient = (): Redis => {
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
      logger.error('Redis cache client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis cache client connected');
    });
  }
  return redisClient;
};

/**
 * Cache key prefix for user ObjectId lookups
 */
const CACHE_KEY_PREFIX = 'user:objectid:';

/**
 * Cache TTL in seconds (24 hours)
 */
const CACHE_TTL = 24 * 60 * 60;

/**
 * Sanitize userId to prevent cache key injection attacks
 */
const sanitizeUserId = (userId: string): string => {
  // Remove any characters that could be used for injection
  // Allow only alphanumeric, hyphens, and underscores
  return userId.trim().replace(/[^a-zA-Z0-9\-_]/g, '');
};

/**
 * Get user ObjectId from cache or database
 * This optimizes the lookup from string ID to ObjectId
 * Includes security validations to prevent cache poisoning
 * 
 * @param userId - User's custom string ID
 * @returns User's MongoDB ObjectId or null if not found
 */
export const getUserObjectId = async (userId: string): Promise<Types.ObjectId | null> => {
  try {
    // Security: Validate and sanitize input
    if (!userId || typeof userId !== 'string' || userId.length > 100) {
      logger.warn('Invalid userId format in cache lookup', { userId });
      return null;
    }

    const sanitizedUserId = sanitizeUserId(userId);
    if (sanitizedUserId !== userId) {
      logger.warn('UserId sanitized due to invalid characters', {
        original: userId,
        sanitized: sanitizedUserId,
      });
    }

    const redis = getRedisClient();
    const cacheKey = `${CACHE_KEY_PREFIX}${sanitizedUserId}`;

    // Try to get from cache first
    try {
      const cachedObjectId = await redis.get(cacheKey);
      if (cachedObjectId) {
        // Validate cached ObjectId format to prevent cache poisoning
        if (Types.ObjectId.isValid(cachedObjectId)) {
          logger.debug('User ObjectId cache hit', { userId: sanitizedUserId });
          return new Types.ObjectId(cachedObjectId);
        } else {
          // Invalid cached value - delete it and fetch from DB
          logger.warn('Invalid cached ObjectId format, invalidating cache', {
            userId: sanitizedUserId,
            cachedValue: cachedObjectId,
          });
          await redis.del(cacheKey);
        }
      }
    } catch (cacheError) {
      // If Redis fails, continue to database lookup
      logger.warn('Redis cache read failed, falling back to database', {
        userId: sanitizedUserId,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    // Cache miss - fetch from database
    logger.debug('User ObjectId cache miss, fetching from database', { userId: sanitizedUserId });
    const user = await UserModel.findOne({ id: sanitizedUserId, isDeleted: false })
      .select('_id')
      .lean();

    if (!user) {
      return null;
    }

    // Validate ObjectId before caching
    const objectIdString = user._id.toString();
    if (!Types.ObjectId.isValid(objectIdString)) {
      logger.error('Invalid ObjectId from database', {
        userId: sanitizedUserId,
        objectId: objectIdString,
      });
      return null;
    }

    // Store in cache for future requests
    try {
      await redis.setex(cacheKey, CACHE_TTL, objectIdString);
      logger.debug('User ObjectId cached', { userId: sanitizedUserId, objectId: objectIdString });
    } catch (cacheError) {
      // Don't fail if caching fails
      logger.warn('Failed to cache user ObjectId, but continuing', {
        userId: sanitizedUserId,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    return user._id as Types.ObjectId;
  } catch (error) {
    logger.error('Failed to get user ObjectId:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    // Fallback to direct database lookup if cache fails
    try {
      const sanitizedUserId = sanitizeUserId(userId);
      const user = await UserModel.findOne({ id: sanitizedUserId, isDeleted: false })
        .select('_id')
        .lean();
      return user ? (user._id as Types.ObjectId) : null;
    } catch (dbError) {
      logger.error('Database fallback also failed:', {
        userId,
        error: dbError instanceof Error ? dbError.message : dbError,
      });
      return null;
    }
  }
};

/**
 * Invalidate user ObjectId cache
 * Call this when user is deleted or ID changes
 * 
 * @param userId - User's custom string ID
 */
export const invalidateUserCache = async (userId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    await redis.del(cacheKey);
    logger.debug('User ObjectId cache invalidated', { userId });
  } catch (error) {
    logger.warn('Failed to invalidate user cache', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closeUserCache = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis cache client closed');
  }
};

