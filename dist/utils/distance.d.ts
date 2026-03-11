/**
 * Calculate distance using Haversine formula (fallback)
 * Returns distance in kilometers (rounded to 2 decimal places)
 */
export declare const calculateHaversineDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
/**
 * Calculate bounding box for approximate radius filtering
 * Returns {minLat, maxLat, minLon, maxLon}
 *
 * This creates a rectangular bounding box around a point to pre-filter
 * locations before calculating exact distances. The bounding box includes
 * a buffer factor to ensure we don't miss nearby records that are just
 * outside the circular radius but inside the rectangular box.
 *
 * @param latitude - Center point latitude
 * @param longitude - Center point longitude
 * @param radiusKm - Search radius in kilometers
 * @param bufferFactor - Multiplier for bounding box size (default: 1.414 for diagonal coverage)
 * @returns Bounding box coordinates
 */
export declare const getBoundingBox: (latitude: number, longitude: number, radiusKm: number, bufferFactor?: number) => {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
};
/**
 * Calculate distance using Google Maps Distance Matrix API with caching
 * Falls back to Haversine formula if API fails or is not configured
 *
 * @param originLat - Origin latitude
 * @param originLon - Origin longitude
 * @param destLat - Destination latitude
 * @param destLon - Destination longitude
 * @returns Distance in kilometers
 */
export declare const calculateDistance: (originLat: number, originLon: number, destLat: number, destLon: number) => Promise<number>;
/**
 * Calculate distances for multiple destinations from a single origin
 * Uses batch processing for efficiency
 *
 * @param originLat - Origin latitude
 * @param originLon - Origin longitude
 * @param destinations - Array of {latitude, longitude} coordinates
 * @returns Array of distances in kilometers (same order as destinations)
 */
export declare const calculateDistances: (originLat: number, originLon: number, destinations: Array<{
    latitude: number;
    longitude: number;
}>) => Promise<number[]>;
//# sourceMappingURL=distance.d.ts.map