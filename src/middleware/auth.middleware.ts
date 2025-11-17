import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import { UserModel } from '../models/user.model';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

/**
 * Validate user status and existence
 * This is a critical security check that should run after JWT validation
 */
const validateUserStatus = async (
  userId: string
): Promise<{ valid: boolean; reason?: string }> => {
  try {
    // Input validation - prevent injection attacks
    if (!userId || typeof userId !== 'string' || userId.length > 100) {
      logger.warn('Invalid userId format in security validation', { userId });
      return { valid: false, reason: 'Invalid user ID format' };
    }

    // Sanitize userId - remove any potential dangerous characters
    const sanitizedUserId = userId.trim().replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitizedUserId !== userId) {
      logger.warn('UserId contained invalid characters, sanitized', {
        original: userId,
        sanitized: sanitizedUserId,
      });
    }

    // Check user exists, is active, and not deleted
    const user = await UserModel.findOne({
      id: sanitizedUserId,
      isDeleted: false,
      isActive: true,
    })
      .select('_id isActive isDeleted')
      .lean();

    if (!user) {
      logger.warn('User validation failed - user not found, deleted, or inactive', {
        userId: sanitizedUserId,
      });
      return { valid: false, reason: 'User not found or inactive' };
    }

    return { valid: true };
  } catch (error) {
    logger.error('Error validating user status:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    // Fail secure - deny access on error
    return { valid: false, reason: 'Validation error' };
  }
};

/**
 * Enhanced authentication middleware with security validations
 * - Validates JWT access token
 * - Checks token blacklist
 * - Verifies user still exists and is active
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed - no token provided', {
        ip: clientIp,
        userAgent,
      });
      res.status(401).json({
        success: false,
        message: t('auth.token.noToken'),
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      logger.warn('Authentication failed - token blacklisted', {
        ip: clientIp,
        userAgent,
      });
      res.status(401).json({
        success: false,
        message: t('auth.token.invalidToken'),
      });
      return;
    }

    // Verify JWT access token signature and expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      logger.warn('Authentication failed - invalid or expired token', {
        ip: clientIp,
        userAgent,
        error: error instanceof Error ? error.message : error,
      });
      res.status(401).json({
        success: false,
        message: t('auth.token.invalidToken'),
      });
      return;
    }

    // CRITICAL SECURITY CHECK: Validate user still exists, is active, and not deleted
    // This prevents using tokens for deleted/deactivated users
    const userValidation = await validateUserStatus(decoded.id);

    if (!userValidation.valid) {
      logger.warn('Authentication failed - user validation failed', {
        userId: decoded.id,
        ip: clientIp,
        userAgent,
        reason: userValidation.reason,
      });
      res.status(401).json({
        success: false,
        message: t('auth.token.invalidToken'), // Don't reveal specific reason
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // Log successful authentication (optional, can be disabled in production for performance)
    if (process.env.LOG_AUTH_SUCCESS === 'true') {
      logger.info('Authentication successful', {
        userId: decoded.id,
        ip: clientIp,
      });
    }

    next();
  } catch (error) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    logger.error('Authentication error', {
      ip: clientIp,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(401).json({
      success: false,
      message: t('auth.token.invalidToken'),
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: t('auth.authorization.unauthorized'),
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: t('auth.authorization.forbidden'),
      });
      return;
    }

    next();
  };
};

