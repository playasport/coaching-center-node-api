import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  jti?: string; // JWT ID for token blacklisting
  type?: 'access' | 'refresh'; // Token type
  deviceId?: string; // Device ID for device-specific tokens
  deviceType?: 'web' | 'android' | 'ios'; // Device type
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token (short-lived, 15 minutes)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  const { jti, type, ...tokenPayload } = payload;
  return jwt.sign(
    {
      ...tokenPayload,
      type: 'access',
      jti: jti || `${payload.id}-${Date.now()}`,
    },
    config.jwt.secret as jwt.Secret,
    {
      expiresIn: config.jwt.accessTokenExpiresIn as jwt.SignOptions['expiresIn'],
    }
  );
};

/**
 * Generate refresh token (long-lived)
 * For mobile apps (android/ios), uses longer expiry (default 90 days)
 * For web, uses standard expiry (default 7 days)
 */
export const generateRefreshToken = (
  payload: TokenPayload,
  deviceType?: 'web' | 'android' | 'ios'
): string => {
  const { jti, type, ...tokenPayload } = payload;
  
  // Use longer expiry for mobile apps
  const expiresIn = 
    deviceType === 'android' || deviceType === 'ios'
      ? config.jwt.mobileRefreshTokenExpiresIn
      : config.jwt.refreshTokenExpiresIn;
  
  return jwt.sign(
    {
      ...tokenPayload,
      type: 'refresh',
      jti: jti || `${payload.id}-${Date.now()}-refresh`,
      deviceType: deviceType || 'web',
      deviceId: payload.deviceId,
    },
    config.jwt.refreshSecret as jwt.Secret,
    {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    }
  );
};

/**
 * Generate both access and refresh tokens
 * @param payload - Token payload
 * @param deviceType - Device type for determining refresh token expiry (web uses 7d, mobile uses 90d)
 * @param deviceId - Optional device ID for device-specific tokens
 */
export const generateTokenPair = (
  payload: TokenPayload,
  deviceType?: 'web' | 'android' | 'ios',
  deviceId?: string
): TokenPair => {
  const jti = `${payload.id}-${Date.now()}`;
  return {
    accessToken: generateAccessToken({ ...payload, jti }),
    refreshToken: generateRefreshToken(
      { ...payload, jti, deviceId, deviceType },
      deviceType
    ),
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as TokenPayload;
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret as jwt.Secret) as TokenPayload;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateTokenPair instead
 */
export const generateToken = (payload: TokenPayload): string => {
  return generateAccessToken(payload);
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken instead
 */
export const verifyToken = (token: string): TokenPayload => {
  return verifyAccessToken(token);
};

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
export const generateTempRegistrationToken = (mobile: string): string => {
  return jwt.sign(
    {
      mobile,
      type: 'registration',
    },
    config.jwt.secret as jwt.Secret,
    {
      expiresIn: '30m', // 30 minutes
    }
  );
};

/**
 * Verify temporary registration token
 */
export const verifyTempRegistrationToken = (token: string): TempTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as TempTokenPayload;
    if (decoded.type !== 'registration') {
      throw new Error('Invalid token type');
    }
    if (!decoded.mobile) {
      throw new Error('Mobile number missing in token');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired temporary registration token');
  }
};

