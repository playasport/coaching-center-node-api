/**
 * Get academy dashboard data from cache or null if not found
 */
export declare const getCachedAcademyDashboard: (academyUserId: string) => Promise<any | null>;
/**
 * Cache academy dashboard data
 */
export declare const cacheAcademyDashboard: (academyUserId: string, data: any) => Promise<void>;
/**
 * Invalidate academy dashboard cache
 */
export declare const invalidateAcademyDashboardCache: (academyUserId: string) => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeAcademyDashboardCache: () => Promise<void>;
//# sourceMappingURL=academyDashboardCache.d.ts.map