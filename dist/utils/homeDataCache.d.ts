export interface HomeDataCacheParams {
    userId?: string;
    userLocation?: {
        latitude: number;
        longitude: number;
    };
    radius?: number;
}
/**
 * Get home data from cache or null if not found
 */
export declare const getCachedHomeData: (params: HomeDataCacheParams) => Promise<any | null>;
/**
 * Cache home data
 */
export declare const cacheHomeData: (params: HomeDataCacheParams, data: any) => Promise<void>;
export interface CachedGlobalHomeData {
    popularSports: any[];
    popularReels: any[];
    topCities: any[];
}
/**
 * Get cached global home data (popularSports, popularReels, topCities)
 */
export declare const getCachedGlobalHomeData: () => Promise<CachedGlobalHomeData | null>;
/**
 * Cache global home data
 */
export declare const cacheGlobalHomeData: (data: CachedGlobalHomeData) => Promise<void>;
export interface AcademyListCacheParams {
    page: number;
    limit: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    userId?: string;
    city?: string;
    state?: string;
    sportId?: string;
    sportIds?: string;
    gender?: string;
    forDisabled?: boolean;
    minAge?: number;
    maxAge?: number;
}
export declare const getCachedAcademyList: (params: AcademyListCacheParams) => Promise<any | null>;
export declare const cacheAcademyList: (params: AcademyListCacheParams, data: any) => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeHomeDataCache: () => Promise<void>;
//# sourceMappingURL=homeDataCache.d.ts.map