/**
 * Get countries from cache or null if not found
 */
export declare const getCachedCountries: () => Promise<any[] | null>;
/**
 * Cache countries
 */
export declare const cacheCountries: (countries: any[]) => Promise<void>;
/**
 * Get states from cache or null if not found
 */
export declare const getCachedStates: (countryCode: string) => Promise<any[] | null>;
/**
 * Cache states for a country
 */
export declare const cacheStates: (countryCode: string, states: any[]) => Promise<void>;
/**
 * Get cities from cache or null if not found
 */
export declare const getCachedCities: (stateId: string) => Promise<any[] | null>;
/**
 * Cache cities for a state
 */
export declare const cacheCities: (stateId: string, cities: any[]) => Promise<void>;
/**
 * Invalidate location cache (call when location data is updated)
 */
export declare const invalidateLocationCache: (type: "countries" | "states" | "cities", identifier?: string) => Promise<void>;
/**
 * Invalidate all location caches (use with caution)
 */
export declare const invalidateAllLocationCache: () => Promise<void>;
//# sourceMappingURL=locationCache.d.ts.map