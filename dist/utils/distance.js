"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistances = exports.calculateDistance = exports.getBoundingBox = exports.calculateHaversineDistance = void 0;
const env_1 = require("../config/env");
const logger_1 = require("./logger");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
/**
 * Cache key prefix for distance calculations
 */
const CACHE_KEY_PREFIX = 'distance:';
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value) => {
    return Math.round(value * 100) / 100;
};
/**
 * Calculate distance using Haversine formula (fallback)
 * Returns distance in kilometers (rounded to 2 decimal places)
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return roundToTwoDecimals(R * c);
};
exports.calculateHaversineDistance = calculateHaversineDistance;
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
const getBoundingBox = (latitude, longitude, radiusKm, bufferFactor = 1.5 // 1.5x buffer to ensure we don't miss nearby records
) => {
    // Earth's radius in kilometers
    const R = 6371;
    // Apply buffer factor to ensure we don't miss records at the edges
    const adjustedRadius = radiusKm * bufferFactor;
    // Convert radius to degrees (approximate)
    const latDelta = adjustedRadius / R * (180 / Math.PI);
    const lonDelta = adjustedRadius / (R * Math.cos(latitude * Math.PI / 180)) * (180 / Math.PI);
    return {
        minLat: latitude - latDelta,
        maxLat: latitude + latDelta,
        minLon: longitude - lonDelta,
        maxLon: longitude + lonDelta,
    };
};
exports.getBoundingBox = getBoundingBox;
/**
 * Generate cache key for distance calculation
 */
const getCacheKey = (lat1, lon1, lat2, lon2) => {
    // Round coordinates to 3 decimal places (~110 meters) for higher cache hit rate in search apps
    const roundedLat1 = Math.round(lat1 * 1000) / 1000;
    const roundedLon1 = Math.round(lon1 * 1000) / 1000;
    const roundedLat2 = Math.round(lat2 * 1000) / 1000;
    const roundedLon2 = Math.round(lon2 * 1000) / 1000;
    return `${CACHE_KEY_PREFIX}${roundedLat1},${roundedLon1}:${roundedLat2},${roundedLon2}`;
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
const calculateDistance = async (originLat, originLon, destLat, destLon) => {
    try {
        // Check cache first
        const redis = getRedisClient();
        const cacheKey = getCacheKey(originLat, originLon, destLat, destLon);
        if (redis) {
            try {
                const cachedDistance = await redis.get(cacheKey);
                if (cachedDistance) {
                    const distance = parseFloat(cachedDistance);
                    if (!isNaN(distance) && distance >= 0) {
                        logger_1.logger.debug('Distance cache hit', { cacheKey, distance });
                        return roundToTwoDecimals(distance);
                    }
                }
            }
            catch (cacheError) {
                logger_1.logger.warn('Failed to read from distance cache', { error: cacheError });
            }
        }
        // Try Google Maps API if configured
        const googleMapsApiKey = env_1.config.location.googleMapsApiKey;
        if (googleMapsApiKey) {
            try {
                const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
                url.searchParams.append('origins', `${originLat},${originLon}`);
                url.searchParams.append('destinations', `${destLat},${destLon}`);
                url.searchParams.append('key', googleMapsApiKey);
                url.searchParams.append('units', 'metric');
                const response = await fetch(url.toString());
                const data = await response.json();
                if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
                    const distanceInMeters = data.rows[0].elements[0].distance.value;
                    const distanceInKm = roundToTwoDecimals(distanceInMeters / 1000);
                    // Cache the result
                    if (redis && distanceInKm >= 0) {
                        try {
                            await redis.setex(cacheKey, CACHE_TTL, distanceInKm.toString());
                            logger_1.logger.debug('Distance cached from Google Maps API', { cacheKey, distance: distanceInKm });
                        }
                        catch (cacheError) {
                            logger_1.logger.warn('Failed to cache distance', { error: cacheError });
                        }
                    }
                    return distanceInKm;
                }
                else {
                    logger_1.logger.warn('Google Maps API returned error, using Haversine fallback', {
                        status: data.status,
                        error: data.error_message,
                    });
                }
            }
            catch (apiError) {
                logger_1.logger.warn('Google Maps API request failed, using Haversine fallback', {
                    error: apiError instanceof Error ? apiError.message : apiError,
                });
            }
        }
        // Fallback to Haversine formula (do NOT cache - only Google Maps API results are cached)
        const distance = (0, exports.calculateHaversineDistance)(originLat, originLon, destLat, destLon);
        return roundToTwoDecimals(distance);
    }
    catch (error) {
        logger_1.logger.error('Distance calculation error, using Haversine fallback', {
            error: error instanceof Error ? error.message : error,
        });
        // Final fallback to Haversine
        return (0, exports.calculateHaversineDistance)(originLat, originLon, destLat, destLon);
    }
};
exports.calculateDistance = calculateDistance;
/**
 * Calculate distances for multiple destinations from a single origin
 * Uses batch processing for efficiency
 *
 * @param originLat - Origin latitude
 * @param originLon - Origin longitude
 * @param destinations - Array of {latitude, longitude} coordinates
 * @returns Array of distances in kilometers (same order as destinations)
 */
const calculateDistances = async (originLat, originLon, destinations) => {
    try {
        // Check cache for all destinations
        const redis = getRedisClient();
        const cachedDistances = [];
        const uncachedIndices = [];
        if (redis) {
            for (let i = 0; i < destinations.length; i++) {
                const dest = destinations[i];
                const cacheKey = getCacheKey(originLat, originLon, dest.latitude, dest.longitude);
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached) {
                        const distance = parseFloat(cached);
                        if (!isNaN(distance) && distance >= 0) {
                            cachedDistances[i] = roundToTwoDecimals(distance);
                            continue;
                        }
                    }
                }
                catch (cacheError) {
                    logger_1.logger.warn('Failed to read from distance cache', { error: cacheError });
                }
                uncachedIndices.push(i);
                cachedDistances[i] = null;
            }
        }
        else {
            // No cache available, mark all as uncached
            for (let i = 0; i < destinations.length; i++) {
                uncachedIndices.push(i);
                cachedDistances[i] = null;
            }
        }
        // If all distances are cached, return them (already rounded)
        if (uncachedIndices.length === 0) {
            return cachedDistances.map(d => roundToTwoDecimals(d));
        }
        // Try Google Maps API for uncached distances
        const googleMapsApiKey = env_1.config.location.googleMapsApiKey;
        if (googleMapsApiKey && uncachedIndices.length > 0) {
            try {
                // Google Maps API supports up to 25 destinations per request
                const batchSize = 25;
                const uncachedDestinations = uncachedIndices.map((idx) => destinations[idx]);
                for (let i = 0; i < uncachedDestinations.length; i += batchSize) {
                    const batch = uncachedDestinations.slice(i, i + batchSize);
                    const destinationsStr = batch.map((d) => `${d.latitude},${d.longitude}`).join('|');
                    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
                    url.searchParams.append('origins', `${originLat},${originLon}`);
                    url.searchParams.append('destinations', destinationsStr);
                    url.searchParams.append('key', googleMapsApiKey);
                    url.searchParams.append('units', 'metric');
                    const response = await fetch(url.toString());
                    const data = await response.json();
                    if (data.status === 'OK' && data.rows?.[0]?.elements) {
                        const elements = data.rows[0].elements;
                        for (let j = 0; j < elements.length && i + j < uncachedDestinations.length; j++) {
                            const element = elements[j];
                            const dest = batch[j];
                            const originalIndex = uncachedIndices[i + j];
                            if (element.status === 'OK' && element.distance) {
                                const distanceInKm = roundToTwoDecimals(element.distance.value / 1000);
                                cachedDistances[originalIndex] = distanceInKm;
                                if (redis) {
                                    const cacheKey = getCacheKey(originLat, originLon, dest.latitude, dest.longitude);
                                    try {
                                        await redis.setex(cacheKey, CACHE_TTL, distanceInKm.toString());
                                    }
                                    catch (cacheError) {
                                        logger_1.logger.warn('Failed to cache distance', { error: cacheError });
                                    }
                                }
                            }
                            else {
                                const distance = (0, exports.calculateHaversineDistance)(originLat, originLon, dest.latitude, dest.longitude);
                                cachedDistances[originalIndex] = roundToTwoDecimals(distance);
                            }
                        }
                    }
                }
            }
            catch (apiError) {
                logger_1.logger.warn('Google Maps API batch request failed, using Haversine fallback', {
                    error: apiError instanceof Error ? apiError.message : apiError,
                });
            }
        }
        // Fill in any remaining uncached distances with Haversine
        for (const idx of uncachedIndices) {
            if (cachedDistances[idx] === null) {
                const dest = destinations[idx];
                cachedDistances[idx] = (0, exports.calculateHaversineDistance)(originLat, originLon, dest.latitude, dest.longitude);
            }
        }
        return cachedDistances.map(d => roundToTwoDecimals(d));
    }
    catch (error) {
        logger_1.logger.error('Batch distance calculation error, using Haversine fallback', {
            error: error instanceof Error ? error.message : error,
        });
        // Fallback: calculate all using Haversine
        return destinations.map((dest) => roundToTwoDecimals((0, exports.calculateHaversineDistance)(originLat, originLon, dest.latitude, dest.longitude)));
    }
};
exports.calculateDistances = calculateDistances;
//# sourceMappingURL=distance.js.map