import { Types } from 'mongoose';
/**
 * Get user ObjectId from cache or database
 * This optimizes the lookup from string ID to ObjectId
 * Includes security validations to prevent cache poisoning
 *
 * @param userId - User's custom string ID
 * @returns User's MongoDB ObjectId or null if not found
 */
export declare const getUserObjectId: (userId: string) => Promise<Types.ObjectId | null>;
/**
 * Invalidate user ObjectId cache
 * Call this when user is deleted or ID changes
 *
 * @param userId - User's custom string ID
 */
export declare const invalidateUserCache: (userId: string) => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeUserCache: () => Promise<void>;
//# sourceMappingURL=userCache.d.ts.map