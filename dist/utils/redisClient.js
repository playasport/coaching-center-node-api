"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAllRedisConnections = exports.getRedisForConfiguredDb = exports.getRedisPermissionCache = exports.getRedisRateLimit = exports.getRedisTokenBlacklist = exports.getRedisUserCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
/**
 * Single shared Redis connection per logical DB (see `config.redis.db`).
 * Avoids creating duplicate TCP connections from home cache, user cache, distance, etc.
 */
const clientsByDb = new Map();
function getRedisForDb(db, label) {
    let client = clientsByDb.get(db);
    if (!client) {
        client = new ioredis_1.default({
            host: env_1.config.redis.host,
            port: env_1.config.redis.port,
            password: env_1.config.redis.password,
            db,
            ...env_1.config.redis.connection,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        client.on('error', (err) => {
            logger_1.logger.error(`Redis [${label} db=${db}]`, err);
        });
        client.on('connect', () => {
            logger_1.logger.info(`Redis connected [${label} db=${db}]`);
        });
        clientsByDb.set(db, client);
    }
    return client;
}
const getRedisUserCache = () => getRedisForDb(env_1.config.redis.db.userCache, 'userCache');
exports.getRedisUserCache = getRedisUserCache;
const getRedisTokenBlacklist = () => getRedisForDb(env_1.config.redis.db.tokenBlacklist, 'tokenBlacklist');
exports.getRedisTokenBlacklist = getRedisTokenBlacklist;
const getRedisRateLimit = () => getRedisForDb(env_1.config.redis.db.rateLimit, 'rateLimit');
exports.getRedisRateLimit = getRedisRateLimit;
const getRedisPermissionCache = () => getRedisForDb(env_1.config.redis.db.permissionCache, 'permissionCache');
exports.getRedisPermissionCache = getRedisPermissionCache;
/** Advanced: use only if you add a new DB in config */
const getRedisForConfiguredDb = (db, label) => getRedisForDb(db, label);
exports.getRedisForConfiguredDb = getRedisForConfiguredDb;
/**
 * Graceful shutdown: quit all shared clients (call once from server teardown).
 */
const closeAllRedisConnections = async () => {
    for (const [db, client] of clientsByDb) {
        try {
            await client.quit();
            logger_1.logger.info(`Redis connection closed (db=${db})`);
        }
        catch (error) {
            logger_1.logger.warn(`Redis quit failed (db=${db})`, error);
        }
    }
    clientsByDb.clear();
};
exports.closeAllRedisConnections = closeAllRedisConnections;
//# sourceMappingURL=redisClient.js.map