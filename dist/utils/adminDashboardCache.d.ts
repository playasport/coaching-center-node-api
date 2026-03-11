/**
 * Get admin dashboard stats from cache or null if not found
 */
export declare const getCachedAdminDashboardStats: () => Promise<any | null>;
/**
 * Cache admin dashboard stats
 */
export declare const cacheAdminDashboardStats: (data: any) => Promise<void>;
/**
 * Invalidate admin dashboard cache (e.g. when critical data changes)
 */
export declare const invalidateAdminDashboardCache: () => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeAdminDashboardCache: () => Promise<void>;
//# sourceMappingURL=adminDashboardCache.d.ts.map