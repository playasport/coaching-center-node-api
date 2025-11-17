/**
 * Token blacklist service using Redis
 * Stores blacklisted tokens until they expire
 */

import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from './logger';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client for token blacklist
 */
const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db.tokenBlacklist,
      ...config.redis.connection,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis blacklist client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis blacklist client connected');
    });
  }
  return redisClient;
};

/**
 * Blacklist key prefix
 */
const BLACKLIST_KEY_PREFIX = 'blacklist:token:';

/**
 * Blacklist a token until it expires
 * @param token - JWT token to blacklist
 * @param expiresIn - Expiration time in seconds (optional, will extract from token if not provided)
 */
export const blacklistToken = async (token: string, expiresIn?: number): Promise<void> => {
  try {
    const redis = getRedisClient();
    
    // Extract expiration from token if not provided
    if (!expiresIn) {
      try {
        // Try to decode token to get expiration (without verification for expired tokens)
        const decoded = jwt.decode(token, { complete: false }) as jwt.JwtPayload | null;
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          const remainingTime = decoded.exp - now;
          if (remainingTime <= 0) {
            // Token already expired, no need to blacklist
            return;
          }
          expiresIn = remainingTime;
        } else {
          // If we can't decode or no exp, use a default expiration
          expiresIn = 15 * 60; // 15 minutes default
        }
      } catch {
        // If we can't decode, use a default expiration
        expiresIn = 15 * 60; // 15 minutes default
      }
    }

    // Ensure expiresIn is defined and a valid number
    if (!expiresIn || expiresIn <= 0) {
      expiresIn = 15 * 60; // 15 minutes default fallback
    }

    const key = `${BLACKLIST_KEY_PREFIX}${token}`;
    await redis.setex(key, expiresIn, '1');
    logger.debug('Token blacklisted', { expiresIn });
  } catch (error) {
    logger.error('Failed to blacklist token:', {
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw - blacklisting failure shouldn't break the flow
  }
};

/**
 * Check if a token is blacklisted
 * @param token - JWT token to check
 * @returns true if token is blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const key = `${BLACKLIST_KEY_PREFIX}${token}`;
    const result = await redis.get(key);
    return result === '1';
  } catch (error) {
    logger.error('Failed to check token blacklist:', {
      error: error instanceof Error ? error.message : error,
    });
    // Fail secure - if we can't check, assume token might be blacklisted
    return true;
  }
};

/**
 * Blacklist all tokens for a user (by JTI pattern)
 * This is useful when user logs out from all devices
 * @param userId - User ID
 */
export const blacklistUserTokens = async (userId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    const pattern = `${BLACKLIST_KEY_PREFIX}*${userId}*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('User tokens blacklisted', { userId, count: keys.length });
    }
  } catch (error) {
    logger.error('Failed to blacklist user tokens:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closeTokenBlacklist = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis blacklist client closed');
  }
};

