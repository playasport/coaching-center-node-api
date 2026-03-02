/**
 * Token blacklist service using Redis
 * Stores blacklisted tokens until they expire
 */
/**
 * Blacklist a token until it expires
 * @param token - JWT token to blacklist
 * @param expiresIn - Expiration time in seconds (optional, will extract from token if not provided)
 */
export declare const blacklistToken: (token: string, expiresIn?: number) => Promise<void>;
/**
 * Blacklist a JTI (JWT ID) so that both the access and refresh token sharing it are invalidated.
 * @param jti - The jti claim from the token
 * @param expiresIn - TTL in seconds (should cover the longest-lived token in the pair)
 */
export declare const blacklistJti: (jti: string, expiresIn?: number) => Promise<void>;
/**
 * Check if a token is blacklisted
 * Checks: specific token → JTI → user-level blacklist
 * @param token - JWT token to check
 * @returns true if token is blacklisted, false otherwise
 */
export declare const isTokenBlacklisted: (token: string) => Promise<boolean>;
/**
 * Blacklist all tokens for a user (logout from all devices)
 * This sets a user-level blacklist flag that invalidates all tokens for that user
 * @param userId - User ID
 */
export declare const blacklistUserTokens: (userId: string) => Promise<void>;
/**
 * Check if a user is blacklisted (logout from all devices)
 * @param userId - User ID
 * @returns true if user is blacklisted, false otherwise
 */
export declare const isUserBlacklisted: (userId: string) => Promise<boolean>;
/**
 * Clear user-level blacklist (allow user to login again after logout all)
 * This should be called when user successfully logs in
 * @param userId - User ID
 */
export declare const clearUserBlacklist: (userId: string) => Promise<void>;
/**
 * Close Redis connection (for graceful shutdown)
 */
export declare const closeTokenBlacklist: () => Promise<void>;
//# sourceMappingURL=tokenBlacklist.d.ts.map