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
 * User blacklist key prefix (for logout all devices)
 */
const USER_BLACKLIST_KEY_PREFIX = 'blacklist:user:';

/**
 * JTI blacklist key prefix (for single-device logout — invalidates both access and refresh token sharing the same jti)
 */
const JTI_BLACKLIST_KEY_PREFIX = 'blacklist:jti:';

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
 * Blacklist a JTI (JWT ID) so that both the access and refresh token sharing it are invalidated.
 * @param jti - The jti claim from the token
 * @param expiresIn - TTL in seconds (should cover the longest-lived token in the pair)
 */
export const blacklistJti = async (jti: string, expiresIn?: number): Promise<void> => {
  try {
    const redis = getRedisClient();
    const ttl = expiresIn && expiresIn > 0 ? expiresIn : 90 * 24 * 60 * 60; // default 90 days (mobile refresh token max)
    const key = `${JTI_BLACKLIST_KEY_PREFIX}${jti}`;
    await redis.setex(key, ttl, '1');
    logger.debug('JTI blacklisted', { jti, expiresIn: ttl });
  } catch (error) {
    logger.error('Failed to blacklist JTI:', {
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * Check if a token is blacklisted
 * Checks: specific token → JTI → user-level blacklist
 * @param token - JWT token to check
 * @returns true if token is blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    
    // First check if the specific token is blacklisted
    const key = `${BLACKLIST_KEY_PREFIX}${token}`;
    const tokenBlacklisted = await redis.get(key);
    if (tokenBlacklisted === '1') {
      return true;
    }
    
    // Try to decode token to get userId and jti (without verification)
    try {
      const decoded = jwt.decode(token, { complete: false }) as jwt.JwtPayload | null;
      if (decoded) {
        // Check if JTI is blacklisted (single-device logout)
        if (decoded.jti) {
          const jtiKey = `${JTI_BLACKLIST_KEY_PREFIX}${decoded.jti}`;
          const jtiBlacklisted = await redis.get(jtiKey);
          if (jtiBlacklisted === '1') {
            return true;
          }
        }

        // Check if user is blacklisted (logout from all devices)
        if (decoded.id) {
          const userBlacklisted = await isUserBlacklisted(decoded.id);
          if (userBlacklisted) {
            return true;
          }
        }
      }
    } catch (decodeError) {
      // If we can't decode, just continue - token might be malformed
    }
    
    return false;
  } catch (error) {
    logger.error('Failed to check token blacklist:', {
      error: error instanceof Error ? error.message : error,
    });
    // Fail secure - if we can't check, assume token might be blacklisted
    return true;
  }
};

/**
 * Blacklist all tokens for a user (logout from all devices)
 * This sets a user-level blacklist flag that invalidates all tokens for that user
 * @param userId - User ID
 */
export const blacklistUserTokens = async (userId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    
    // Set a user-level blacklist flag with a long expiration (1 year)
    // This will invalidate all tokens for this user
    const userBlacklistKey = `${USER_BLACKLIST_KEY_PREFIX}${userId}`;
    const oneYearInSeconds = 365 * 24 * 60 * 60; // 1 year
    
    await redis.setex(userBlacklistKey, oneYearInSeconds, Date.now().toString());
    
    logger.info('User tokens blacklisted (logout all devices)', { userId });
  } catch (error) {
    logger.error('Failed to blacklist user tokens:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw - blacklisting failure shouldn't break the flow
  }
};

/**
 * Check if a user is blacklisted (logout from all devices)
 * @param userId - User ID
 * @returns true if user is blacklisted, false otherwise
 */
export const isUserBlacklisted = async (userId: string): Promise<boolean> => {
  try {
    const redis = getRedisClient();
    const userBlacklistKey = `${USER_BLACKLIST_KEY_PREFIX}${userId}`;
    const result = await redis.get(userBlacklistKey);
    return result !== null;
  } catch (error) {
    logger.error('Failed to check user blacklist:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    // On error, assume user is blacklisted for security
    return true;
  }
};

/**
 * Clear user-level blacklist (allow user to login again after logout all)
 * This should be called when user successfully logs in
 * @param userId - User ID
 */
export const clearUserBlacklist = async (userId: string): Promise<void> => {
  try {
    const redis = getRedisClient();
    const userBlacklistKey = `${USER_BLACKLIST_KEY_PREFIX}${userId}`;
    await redis.del(userBlacklistKey);
    logger.info('User blacklist cleared (user logged in)', { userId });
  } catch (error) {
    logger.error('Failed to clear user blacklist:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw - clearing failure shouldn't break login
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

