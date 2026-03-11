/**
 * Get coaching centers list from cache or null if not found
 */
export declare const getCachedCoachingCentersList: (page: number, limit: number, search?: string, status?: string, isActive?: boolean, centerId?: string) => Promise<any | null>;
/**
 * Cache coaching centers list
 */
export declare const cacheCoachingCentersList: (page: number, limit: number, search: string | undefined, status: string | undefined, isActive: boolean | undefined, centerId: string | undefined, data: any) => Promise<void>;
/**
 * Invalidate coaching centers list cache
 * Call this when coaching centers are created, updated, or deleted
 */
export declare const invalidateCoachingCentersListCache: () => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeCoachingCenterCache: () => Promise<void>;
//# sourceMappingURL=coachingCenterCache.d.ts.map