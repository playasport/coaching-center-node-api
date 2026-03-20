"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheAcademyDetail = exports.getCachedAcademyDetail = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("./logger");
const redisClient_1 = require("./redisClient");
const getRedisClient = () => (0, redisClient_1.getRedisUserCache)();
const CACHE_KEY_PREFIX = 'academy:detail:v1:';
/** Same as home data — balance freshness vs load */
const CACHE_TTL = 5 * 60;
const roundCoord = (n) => Math.round(n * 1000) / 1000;
/** Stable key segment for any :id format (UUID / ObjectId / custom) */
const hashRequestId = (rawId) => crypto_1.default.createHash('sha256').update(String(rawId).trim()).digest('hex').slice(0, 32);
const buildKey = (params) => {
    const idPart = hashRequestId(params.requestId);
    const userPart = params.userId ? `u:${params.userId}` : 'anon';
    const authPart = params.isUserLoggedIn ? 'auth' : 'guest';
    if (!params.userLocation) {
        return `${CACHE_KEY_PREFIX}${idPart}:${userPart}:${authPart}:no-loc`;
    }
    const lat = roundCoord(params.userLocation.latitude);
    const lon = roundCoord(params.userLocation.longitude);
    return `${CACHE_KEY_PREFIX}${idPart}:${userPart}:${authPart}:loc:${lat}:${lon}`;
};
const getCachedAcademyDetail = async (params) => {
    try {
        const redis = getRedisClient();
        const key = buildKey(params);
        const cached = await redis.get(key);
        if (cached) {
            logger_1.logger.debug('Academy detail cache hit', {
                hasUser: !!params.userId,
                hasLocation: !!params.userLocation,
            });
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        logger_1.logger.warn('Failed to get academy detail from cache', { error });
        return null;
    }
};
exports.getCachedAcademyDetail = getCachedAcademyDetail;
const cacheAcademyDetail = async (params, data) => {
    try {
        const redis = getRedisClient();
        if (data == null)
            return;
        const key = buildKey(params);
        await redis.setex(key, CACHE_TTL, JSON.stringify(data));
        logger_1.logger.debug('Academy detail cached', {
            hasUser: !!params.userId,
            hasLocation: !!params.userLocation,
        });
    }
    catch (error) {
        logger_1.logger.warn('Failed to cache academy detail', { error });
    }
};
exports.cacheAcademyDetail = cacheAcademyDetail;
//# sourceMappingURL=academyDetailCache.js.map