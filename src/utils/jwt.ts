import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  jti?: string; // JWT ID for token blacklisting
  type?: 'access' | 'refresh'; // Token type
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
 * Generate refresh token (long-lived, 7 days)
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const { jti, type, ...tokenPayload } = payload;
  return jwt.sign(
    {
      ...tokenPayload,
      type: 'refresh',
      jti: jti || `${payload.id}-${Date.now()}-refresh`,
    },
    config.jwt.refreshSecret as jwt.Secret,
    {
      expiresIn: config.jwt.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
    }
  );
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: TokenPayload): TokenPair => {
  const jti = `${payload.id}-${Date.now()}`;
  return {
    accessToken: generateAccessToken({ ...payload, jti }),
    refreshToken: generateRefreshToken({ ...payload, jti }),
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

