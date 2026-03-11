export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    jti?: string;
    type?: 'access' | 'refresh';
    deviceId?: string;
    deviceType?: 'web' | 'android' | 'ios';
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
/**
 * Generate access token (short-lived, 15 minutes)
 */
export declare const generateAccessToken: (payload: TokenPayload) => string;
/**
 * Generate refresh token (long-lived)
 * For mobile apps (android/ios), uses longer expiry (default 90 days)
 * For web, uses standard expiry (default 7 days)
 */
export declare const generateRefreshToken: (payload: TokenPayload, deviceType?: "web" | "android" | "ios") => string;
/**
 * Generate both access and refresh tokens
 * @param payload - Token payload
 * @param deviceType - Device type for determining refresh token expiry (web uses 7d, mobile uses 90d)
 * @param deviceId - Optional device ID for device-specific tokens
 */
export declare const generateTokenPair: (payload: TokenPayload, deviceType?: "web" | "android" | "ios", deviceId?: string) => TokenPair;
/**
 * Verify access token
 */
export declare const verifyAccessToken: (token: string) => TokenPayload;
/**
 * Verify refresh token
 */
export declare const verifyRefreshToken: (token: string) => TokenPayload;
/**
 * Legacy function for backward compatibility
 * @deprecated Use generateTokenPair instead
 */
export declare const generateToken: (payload: TokenPayload) => string;
/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken instead
 */
export declare const verifyToken: (token: string) => TokenPayload;
/**
 * Temporary token payload for registration
 */
export interface TempTokenPayload {
    mobile: string;
    type: 'registration';
    iat: number;
    exp: number;
}
/**
 * Generate temporary registration token (30 minutes expiry)
 * Used when user verifies OTP but doesn't exist yet
 */
export declare const generateTempRegistrationToken: (mobile: string) => string;
/**
 * Verify temporary registration token
 */
export declare const verifyTempRegistrationToken: (token: string) => TempTokenPayload;
//# sourceMappingURL=jwt.d.ts.map