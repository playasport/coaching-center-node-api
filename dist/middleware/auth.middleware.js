"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const tokenBlacklist_1 = require("../utils/tokenBlacklist");
const user_model_1 = require("../models/user.model");
const adminUser_model_1 = require("../models/adminUser.model");
const i18n_1 = require("../utils/i18n");
const logger_1 = require("../utils/logger");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
/**
 * Validate user status and existence
 * This is a critical security check that should run after JWT validation
 */
const validateUserStatus = async (userId) => {
    try {
        // Input validation - prevent injection attacks
        if (!userId || typeof userId !== 'string' || userId.length > 100) {
            logger_1.logger.warn('Invalid userId format in security validation', { userId });
            return { valid: false, reason: 'Invalid user ID format' };
        }
        // Sanitize userId - remove any potential dangerous characters
        const sanitizedUserId = userId.trim().replace(/[^a-zA-Z0-9\-_]/g, '');
        if (sanitizedUserId !== userId) {
            logger_1.logger.warn('UserId contained invalid characters, sanitized', {
                original: userId,
                sanitized: sanitizedUserId,
            });
        }
        // Check user exists, is active, and not deleted
        // First check AdminUser table (for admin users), then User table (for client/academy users)
        let user = await adminUser_model_1.AdminUserModel.findOne({
            id: sanitizedUserId,
            isDeleted: false,
            isActive: true,
        })
            .select('_id isActive isDeleted')
            .lean();
        // If not found in AdminUser, check User table
        if (!user) {
            user = await user_model_1.UserModel.findOne({
                id: sanitizedUserId,
                isDeleted: false,
                isActive: true,
            })
                .select('_id isActive isDeleted')
                .lean();
        }
        if (!user) {
            logger_1.logger.warn('User validation failed - user not found, deleted, or inactive', {
                userId: sanitizedUserId,
            });
            return { valid: false, reason: 'User not found or inactive' };
        }
        return { valid: true };
    }
    catch (error) {
        logger_1.logger.error('Error validating user status:', {
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
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.logger.warn('Authentication failed - no token provided', {
                ip: clientIp,
                userAgent,
            });
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.token.noToken'),
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Check if token is blacklisted
        const isBlacklisted = await (0, tokenBlacklist_1.isTokenBlacklisted)(token);
        if (isBlacklisted) {
            logger_1.logger.warn('Authentication failed - token blacklisted', {
                ip: clientIp,
                userAgent,
            });
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.token.invalidToken'),
            });
            return;
        }
        // Verify JWT access token signature and expiration
        let decoded;
        try {
            decoded = (0, jwt_1.verifyAccessToken)(token);
        }
        catch (error) {
            logger_1.logger.warn('Authentication failed - invalid or expired token', {
                ip: clientIp,
                userAgent,
                error: error instanceof Error ? error.message : error,
            });
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.token.invalidToken'),
            });
            return;
        }
        // CRITICAL SECURITY CHECK: Validate user still exists, is active, and not deleted
        // This prevents using tokens for deleted/deactivated users
        const userValidation = await validateUserStatus(decoded.id);
        if (!userValidation.valid) {
            logger_1.logger.warn('Authentication failed - user validation failed', {
                userId: decoded.id,
                ip: clientIp,
                userAgent,
                reason: userValidation.reason,
            });
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.token.invalidToken'), // Don't reveal specific reason
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
            logger_1.logger.info('Authentication successful', {
                userId: decoded.id,
                ip: clientIp,
            });
        }
        next();
    }
    catch (error) {
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        logger_1.logger.error('Authentication error', {
            ip: clientIp,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(401).json({
            success: false,
            message: (0, i18n_1.t)('auth.token.invalidToken'),
        });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.unauthorized'),
            });
            return;
        }
        // Check if user's role matches any of the required roles
        let hasPermission = roles.includes(req.user.role);
        // If permission not found, check database roles array for User model (academy, student, guardian, etc.)
        if (!hasPermission) {
            try {
                const user = await user_model_1.UserModel.findOne({ id: req.user.id })
                    .select('userType roles')
                    .populate('roles', 'name')
                    .lean();
                if (user) {
                    const userRoles = user.roles;
                    // Check if user has any of the required roles in roles array
                    if (userRoles && userRoles.some((r) => roles.includes(r?.name))) {
                        hasPermission = true;
                    }
                    // Special handling: If role is "user" and we're checking for STUDENT/GUARDIAN,
                    // we need to check the userType from the database
                    if (!hasPermission && req.user.role === defaultRoles_enum_1.DefaultRoles.USER) {
                        // Check if userType matches any of the required roles (student/guardian)
                        if (user.userType && roles.includes(user.userType)) {
                            hasPermission = true;
                        }
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Error checking user permissions:', {
                    userId: req.user.id,
                    error: error instanceof Error ? error.message : error,
                });
            }
        }
        if (!hasPermission) {
            res.status(403).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.forbidden'),
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Optional authentication middleware for public routes
 * Sets req.user if token is valid, but doesn't fail if token is missing or invalid
 * Useful for routes that work both with and without authentication
 */
const optionalAuthenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // If no auth header, continue without setting user
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Check if token is blacklisted
        const isBlacklisted = await (0, tokenBlacklist_1.isTokenBlacklisted)(token);
        if (isBlacklisted) {
            next();
            return;
        }
        // Verify JWT access token signature and expiration
        let decoded;
        try {
            decoded = (0, jwt_1.verifyAccessToken)(token);
        }
        catch (error) {
            // Invalid token, continue without user
            next();
            return;
        }
        // Validate user status
        const userValidation = await validateUserStatus(decoded.id);
        if (!userValidation.valid) {
            next();
            return;
        }
        // Set user info if valid
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        // On any error, continue without user
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=auth.middleware.js.map