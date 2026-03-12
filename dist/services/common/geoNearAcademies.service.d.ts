/**
 * GeoNear-based nearest academies with road distance enrichment
 *
 * Flow:
 * 1. MongoDB $geoNear → top N academies by spherical distance (fast)
 * 2. calculateDistances (Redis cache + Google Maps API) → road distance
 * 3. Filter by radius, sort by road distance
 * 4. Return final result
 */
export interface GeoNearAcademyResult {
    academy: any;
    sphericalDistanceKm: number;
    roadDistanceKm: number;
}
/**
 * Get nearby academies using $geoNear, then enrich with Google Maps road distance
 * Falls back to empty array if location.geo is not populated (run migrate:coaching-center-geo)
 *
 * @param userLocation - User's latitude/longitude
 * @param options - maxRadiusKm, extraQuery, limit
 * @returns Academies with roadDistanceKm, sorted by road distance
 */
export declare const getNearbyAcademiesWithRoadDistance: (userLocation: {
    latitude: number;
    longitude: number;
}, options?: {
    maxRadiusKm?: number;
    limit?: number;
    extraQuery?: Record<string, any>;
}) => Promise<GeoNearAcademyResult[]>;
//# sourceMappingURL=geoNearAcademies.service.d.ts.map