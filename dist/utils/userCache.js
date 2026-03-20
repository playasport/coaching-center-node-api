"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateUserCache = exports.getUserObjectId = void 0;
const mongoose_1 = require("mongoose");
const logger_1 = require("./logger");
const user_model_1 = require("../models/user.model");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
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
const sanitizeUserId = (userId) => {
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
const getUserObjectId = async (userId) => {
    try {
        // Security: Validate and sanitize input
        if (!userId || typeof userId !== 'string' || userId.length > 100) {
            logger_1.logger.warn('Invalid userId format in cache lookup', { userId });
            return null;
        }
        const sanitizedUserId = sanitizeUserId(userId);
        if (sanitizedUserId !== userId) {
            logger_1.logger.warn('UserId sanitized due to invalid characters', {
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
                if (mongoose_1.Types.ObjectId.isValid(cachedObjectId)) {
                    logger_1.logger.debug('User ObjectId cache hit', { userId: sanitizedUserId });
                    return new mongoose_1.Types.ObjectId(cachedObjectId);
                }
                else {
                    // Invalid cached value - delete it and fetch from DB
                    logger_1.logger.warn('Invalid cached ObjectId format, invalidating cache', {
                        userId: sanitizedUserId,
                        cachedValue: cachedObjectId,
                    });
                    await redis.del(cacheKey);
                }
            }
        }
        catch (cacheError) {
            // If Redis fails, continue to database lookup
            logger_1.logger.warn('Redis cache read failed, falling back to database', {
                userId: sanitizedUserId,
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        }
        // Cache miss - fetch from database
        logger_1.logger.debug('User ObjectId cache miss, fetching from database', { userId: sanitizedUserId });
        const user = await user_model_1.UserModel.findOne({ id: sanitizedUserId, isDeleted: false })
            .select('_id')
            .lean();
        if (!user) {
            return null;
        }
        // Validate ObjectId before caching
        const objectIdString = user._id.toString();
        if (!mongoose_1.Types.ObjectId.isValid(objectIdString)) {
            logger_1.logger.error('Invalid ObjectId from database', {
                userId: sanitizedUserId,
                objectId: objectIdString,
            });
            return null;
        }
        // Store in cache for future requests
        try {
            await redis.setex(cacheKey, CACHE_TTL, objectIdString);
            logger_1.logger.debug('User ObjectId cached', { userId: sanitizedUserId, objectId: objectIdString });
        }
        catch (cacheError) {
            // Don't fail if caching fails
            logger_1.logger.warn('Failed to cache user ObjectId, but continuing', {
                userId: sanitizedUserId,
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        }
        return user._id;
    }
    catch (error) {
        logger_1.logger.error('Failed to get user ObjectId:', {
            userId,
            error: error instanceof Error ? error.message : error,
        });
        // Fallback to direct database lookup if cache fails
        try {
            const sanitizedUserId = sanitizeUserId(userId);
            const user = await user_model_1.UserModel.findOne({ id: sanitizedUserId, isDeleted: false })
                .select('_id')
                .lean();
            return user ? user._id : null;
        }
        catch (dbError) {
            logger_1.logger.error('Database fallback also failed:', {
                userId,
                error: dbError instanceof Error ? dbError.message : dbError,
            });
            return null;
        }
    }
};
exports.getUserObjectId = getUserObjectId;
/**
 * Invalidate user ObjectId cache
 * Call this when user is deleted or ID changes
 *
 * @param userId - User's custom string ID
 */
const invalidateUserCache = async (userId) => {
    try {
        const redis = getRedisClient();
        const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
        await redis.del(cacheKey);
        logger_1.logger.debug('User ObjectId cache invalidated', { userId });
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate user cache', {
            userId,
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.invalidateUserCache = invalidateUserCache;
//# sourceMappingURL=userCache.js.map