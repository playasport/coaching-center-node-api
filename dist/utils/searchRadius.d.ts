/** Default search radius in km — `DEFAULT_SEARCH_RADIUS_KM` env */
export declare const DEFAULT_SEARCH_RADIUS_KM: number;
/** Max allowed radius in km — `MAX_SEARCH_RADIUS_KM` env */
export declare const MAX_SEARCH_RADIUS_KM: number;
export declare function parseRadiusKmFromQuery(raw: unknown): number | undefined;
export declare function assertValidRadiusKmIfProvided(radius: number | undefined, errorMessage: string): void;
export declare function resolveSearchRadiusKm(radius: number | undefined | null): number;
//# sourceMappingURL=searchRadius.d.ts.map