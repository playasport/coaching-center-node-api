export interface AcademyDetailCacheParams {
    /** Raw `id` route param (before DB resolve) */
    requestId: string;
    userId?: string | null;
    userLocation?: {
        latitude: number;
        longitude: number;
    };
    /** Guest responses mask email/phone; must be part of key */
    isUserLoggedIn: boolean;
}
export declare const getCachedAcademyDetail: (params: AcademyDetailCacheParams) => Promise<unknown | null>;
export declare const cacheAcademyDetail: (params: AcademyDetailCacheParams, data: unknown) => Promise<void>;
//# sourceMappingURL=academyDetailCache.d.ts.map