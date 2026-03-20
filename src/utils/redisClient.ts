import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';

/**
 * Single shared Redis connection per logical DB (see `config.redis.db`).
 * Avoids creating duplicate TCP connections from home cache, user cache, distance, etc.
 */
const clientsByDb = new Map<number, Redis>();

function getRedisForDb(db: number, label: string): Redis {
  let client = clientsByDb.get(db);
  if (!client) {
    client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db,
      ...config.redis.connection,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    client.on('error', (err) => {
      logger.error(`Redis [${label} db=${db}]`, err);
    });
    client.on('connect', () => {
      logger.info(`Redis connected [${label} db=${db}]`);
    });
    clientsByDb.set(db, client);
  }
  return client;
}

export const getRedisUserCache = (): Redis =>
  getRedisForDb(config.redis.db.userCache, 'userCache');

export const getRedisTokenBlacklist = (): Redis =>
  getRedisForDb(config.redis.db.tokenBlacklist, 'tokenBlacklist');

export const getRedisRateLimit = (): Redis =>
  getRedisForDb(config.redis.db.rateLimit, 'rateLimit');

export const getRedisPermissionCache = (): Redis =>
  getRedisForDb(config.redis.db.permissionCache, 'permissionCache');

/** Advanced: use only if you add a new DB in config */
export const getRedisForConfiguredDb = (db: number, label: string): Redis =>
  getRedisForDb(db, label);

/**
 * Graceful shutdown: quit all shared clients (call once from server teardown).
 */
export const closeAllRedisConnections = async (): Promise<void> => {
  for (const [db, client] of clientsByDb) {
    try {
      await client.quit();
      logger.info(`Redis connection closed (db=${db})`);
    } catch (error) {
      logger.warn(`Redis quit failed (db=${db})`, error);
    }
  }
  clientsByDb.clear();
};
