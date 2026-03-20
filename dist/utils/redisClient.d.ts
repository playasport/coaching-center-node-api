import Redis from 'ioredis';
export declare const getRedisUserCache: () => Redis;
export declare const getRedisTokenBlacklist: () => Redis;
export declare const getRedisRateLimit: () => Redis;
export declare const getRedisPermissionCache: () => Redis;
/** Advanced: use only if you add a new DB in config */
export declare const getRedisForConfiguredDb: (db: number, label: string) => Redis;
/**
 * Graceful shutdown: quit all shared clients (call once from server teardown).
 */
export declare const closeAllRedisConnections: () => Promise<void>;
//# sourceMappingURL=redisClient.d.ts.map