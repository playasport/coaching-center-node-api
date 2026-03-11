"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = void 0;
const permission_service_1 = require("../services/admin/permission.service");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
const user_model_1 = require("../models/user.model");
const i18n_1 = require("../utils/i18n");
const logger_1 = require("../utils/logger");
/**
 * Check if user has super admin role
 */
const isSuperAdmin = async (userId) => {
    try {
        const user = await user_model_1.UserModel.findOne({ id: userId, isDeleted: false, isActive: true })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user || !user.roles) {
            return false;
        }
        const userRoles = user.roles;
        return userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN);
    }
    catch (error) {
        logger_1.logger.error('Error checking super admin status:', {
            userId,
            error: error instanceof Error ? error.message : error,
        });
        return false;
    }
};
/**
 * Middleware to require a specific permission
 * Super Admin bypasses all permission checks
 *
 * @param section - Section name
 * @param action - Action name
 */
const requirePermission = (section, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: (0, i18n_1.t)('auth.authorization.unauthorized'),
                });
                return;
            }
            // Super Admin bypass
            const isSuper = await isSuperAdmin(req.user.id);
            if (isSuper) {
                next();
                return;
            }
            // Check permission
            const hasPerm = await (0, permission_service_1.checkPermission)(req.user.id, section, action);
            if (!hasPerm) {
                logger_1.logger.warn('Permission denied', {
                    userId: req.user.id,
                    section,
                    action,
                });
                res.status(403).json({
                    success: false,
                    message: (0, i18n_1.t)('auth.authorization.forbidden'),
                });
                return;
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Error in requirePermission middleware:', {
                userId: req.user?.id,
                section,
                action,
                error: error instanceof Error ? error.message : error,
            });
            res.status(500).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.error'),
            });
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Middleware to require any of the specified permissions
 * Super Admin bypasses all permission checks
 *
 * @param section - Section name
 * @param actions - Array of action names (user needs at least one)
 */
const requireAnyPermission = (section, actions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: (0, i18n_1.t)('auth.authorization.unauthorized'),
                });
                return;
            }
            // Super Admin bypass
            const isSuper = await isSuperAdmin(req.user.id);
            if (isSuper) {
                next();
                return;
            }
            // Check if user has any of the required permissions
            let hasAnyPerm = false;
            for (const action of actions) {
                const hasPerm = await (0, permission_service_1.checkPermission)(req.user.id, section, action);
                if (hasPerm) {
                    hasAnyPerm = true;
                    break;
                }
            }
            if (!hasAnyPerm) {
                logger_1.logger.warn('Permission denied - none of the required actions granted', {
                    userId: req.user.id,
                    section,
                    actions,
                });
                res.status(403).json({
                    success: false,
                    message: (0, i18n_1.t)('auth.authorization.forbidden'),
                });
                return;
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Error in requireAnyPermission middleware:', {
                userId: req.user?.id,
                section,
                actions,
                error: error instanceof Error ? error.message : error,
            });
            res.status(500).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.error'),
            });
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
/**
 * Middleware to require all of the specified permissions
 * Super Admin bypasses all permission checks
 *
 * @param section - Section name
 * @param actions - Array of action names (user needs all)
 */
const requireAllPermissions = (section, actions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: (0, i18n_1.t)('auth.authorization.unauthorized'),
                });
                return;
            }
            // Super Admin bypass
            const isSuper = await isSuperAdmin(req.user.id);
            if (isSuper) {
                next();
                return;
            }
            // Check if user has all required permissions
            for (const action of actions) {
                const hasPerm = await (0, permission_service_1.checkPermission)(req.user.id, section, action);
                if (!hasPerm) {
                    logger_1.logger.warn('Permission denied - missing required action', {
                        userId: req.user.id,
                        section,
                        action,
                        requiredActions: actions,
                    });
                    res.status(403).json({
                        success: false,
                        message: (0, i18n_1.t)('auth.authorization.forbidden'),
                    });
                    return;
                }
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Error in requireAllPermissions middleware:', {
                userId: req.user?.id,
                section,
                actions,
                error: error instanceof Error ? error.message : error,
            });
            res.status(500).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.error'),
            });
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
//# sourceMappingURL=permission.middleware.js.map