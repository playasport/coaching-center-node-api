"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAllLocationCache = exports.invalidateLocationCache = exports.cacheCities = exports.getCachedCities = exports.cacheStates = exports.getCachedStates = exports.cacheCountries = exports.getCachedCountries = void 0;
const logger_1 = require("./logger");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
/**
 * Cache key prefixes
 */
const CACHE_KEY_PREFIX = {
    countries: 'location:countries',
    states: 'location:states:',
    cities: 'location:cities:',
};
/**
 * Cache TTL in seconds
 */
const CACHE_TTL = {
    countries: 3600, // 1 hour - countries rarely change
    states: 1800, // 30 minutes - states change occasionally
    cities: 1800, // 30 minutes - cities change occasionally
};
/**
 * Get countries from cache or null if not found
 */
const getCachedCountries = async () => {
    try {
        const redis = getRedisClient();
        const cached = await redis.get(CACHE_KEY_PREFIX.countries);
        if (cached) {
            logger_1.logger.debug('Location cache hit: countries');
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get countries from cache', error);
        return null;
    }
};
exports.getCachedCountries = getCachedCountries;
/**
 * Cache countries
 */
const cacheCountries = async (countries) => {
    try {
        const redis = getRedisClient();
        if (!countries || countries.length === 0)
            return;
        await redis.setex(CACHE_KEY_PREFIX.countries, CACHE_TTL.countries, JSON.stringify(countries));
        logger_1.logger.debug('Countries cached', { count: countries.length });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache countries', error);
    }
};
exports.cacheCountries = cacheCountries;
/**
 * Get states from cache or null if not found
 */
const getCachedStates = async (countryCode) => {
    try {
        const redis = getRedisClient();
        const cacheKey = `${CACHE_KEY_PREFIX.states}${countryCode}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Location cache hit: states', { countryCode });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get states from cache', { countryCode, error });
        return null;
    }
};
exports.getCachedStates = getCachedStates;
/**
 * Cache states for a country
 */
const cacheStates = async (countryCode, states) => {
    try {
        const redis = getRedisClient();
        if (!states || states.length === 0)
            return;
        const cacheKey = `${CACHE_KEY_PREFIX.states}${countryCode}`;
        await redis.setex(cacheKey, CACHE_TTL.states, JSON.stringify(states));
        logger_1.logger.debug('States cached', { countryCode, count: states.length });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache states', { countryCode, error });
    }
};
exports.cacheStates = cacheStates;
/**
 * Get cities from cache or null if not found
 */
const getCachedCities = async (stateId) => {
    try {
        const redis = getRedisClient();
        const cacheKey = `${CACHE_KEY_PREFIX.cities}${stateId}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            logger_1.logger.debug('Location cache hit: cities', { stateId });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get cities from cache', { stateId, error });
        return null;
    }
};
exports.getCachedCities = getCachedCities;
/**
 * Cache cities for a state
 */
const cacheCities = async (stateId, cities) => {
    try {
        const redis = getRedisClient();
        if (!cities || cities.length === 0)
            return;
        const cacheKey = `${CACHE_KEY_PREFIX.cities}${stateId}`;
        await redis.setex(cacheKey, CACHE_TTL.cities, JSON.stringify(cities));
        logger_1.logger.debug('Cities cached', { stateId, count: cities.length });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache cities', { stateId, error });
    }
};
exports.cacheCities = cacheCities;
/**
 * Invalidate location cache (call when location data is updated)
 */
const invalidateLocationCache = async (type, identifier) => {
    try {
        const redis = getRedisClient();
        if (type === 'countries') {
            await redis.del(CACHE_KEY_PREFIX.countries);
            logger_1.logger.debug('Countries cache invalidated');
        }
        else if (type === 'states' && identifier) {
            const cacheKey = `${CACHE_KEY_PREFIX.states}${identifier}`;
            await redis.del(cacheKey);
            logger_1.logger.debug('States cache invalidated', { countryCode: identifier });
        }
        else if (type === 'cities' && identifier) {
            const cacheKey = `${CACHE_KEY_PREFIX.cities}${identifier}`;
            await redis.del(cacheKey);
            logger_1.logger.debug('Cities cache invalidated', { stateId: identifier });
        }
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate location cache', { type, identifier, error });
    }
};
exports.invalidateLocationCache = invalidateLocationCache;
/**
 * Invalidate all location caches (use with caution)
 */
const invalidateAllLocationCache = async () => {
    try {
        const redis = getRedisClient();
        const keys = await redis.keys(`${CACHE_KEY_PREFIX.countries}*`);
        const statesKeys = await redis.keys(`${CACHE_KEY_PREFIX.states}*`);
        const citiesKeys = await redis.keys(`${CACHE_KEY_PREFIX.cities}*`);
        const allKeys = [...keys, ...statesKeys, ...citiesKeys];
        if (allKeys.length > 0) {
            await redis.del(...allKeys);
            logger_1.logger.debug('All location caches invalidated', { count: allKeys.length });
        }
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate all location caches', error);
    }
};
exports.invalidateAllLocationCache = invalidateAllLocationCache;
//# sourceMappingURL=locationCache.js.map