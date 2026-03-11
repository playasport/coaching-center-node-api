"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const adminUser_model_1 = require("../models/adminUser.model");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
const i18n_1 = require("../utils/i18n");
const logger_1 = require("../utils/logger");
/**
 * Admin roles that can access admin panel
 */
const ADMIN_ROLES = [
    defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN,
    defaultRoles_enum_1.DefaultRoles.ADMIN,
    defaultRoles_enum_1.DefaultRoles.EMPLOYEE,
    defaultRoles_enum_1.DefaultRoles.AGENT,
];
/**
 * Middleware to require admin role
 * Ensures user is authenticated and has an admin role
 */
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.unauthorized'),
            });
            return;
        }
        // Get user with roles from database
        const user = await adminUser_model_1.AdminUserModel.findOne({
            id: req.user.id,
            isDeleted: false,
            isActive: true,
        })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            res.status(401).json({
                success: false,
                message: (0, i18n_1.t)('auth.authorization.unauthorized'),
            });
            return;
        }
        // Check if user has any admin role
        const userRoles = user.roles;
        const hasAdminRole = userRoles.some((r) => ADMIN_ROLES.includes(r?.name));
        // If user doesn't have a default admin role, check if they have admin panel permissions
        if (!hasAdminRole) {
            const { PermissionModel } = await Promise.resolve().then(() => __importStar(require('../models/permission.model')));
            const { Section } = await Promise.resolve().then(() => __importStar(require('../enums/section.enum')));
            const { Types } = await Promise.resolve().then(() => __importStar(require('mongoose')));
            // Get role IDs (handle both _id from lean() and id from toJSON())
            const roleIds = userRoles
                .map((r) => {
                if (r?._id) {
                    return r._id instanceof Types.ObjectId ? r._id : new Types.ObjectId(r._id);
                }
                if (r?.id) {
                    return new Types.ObjectId(r.id);
                }
                return null;
            })
                .filter(Boolean);
            if (roleIds.length === 0) {
                logger_1.logger.warn('Admin access denied - user has no roles', {
                    userId: req.user.id,
                });
                res.status(403).json({
                    success: false,
                    message: (0, i18n_1.t)('auth.authorization.forbidden'),
                });
                return;
            }
            // Check if user has any admin panel permissions (dashboard, permission, user, role, coaching_center, etc.)
            const adminSections = [
                Section.DASHBOARD,
                Section.PERMISSION,
                Section.USER,
                Section.ROLE,
                Section.COACHING_CENTER,
                Section.COACHING_CENTER_RATINGS,
            ];
            const hasAdminPermission = await PermissionModel.exists({
                role: { $in: roleIds },
                section: { $in: adminSections },
                isActive: true,
            });
            if (!hasAdminPermission) {
                logger_1.logger.warn('Admin access denied - user does not have admin permissions', {
                    userId: req.user.id,
                    userRoles: userRoles.map((r) => r?.name),
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
        logger_1.logger.error('Error in requireAdmin middleware:', {
            userId: req.user?.id,
            error: error instanceof Error ? error.message : error,
        });
        res.status(500).json({
            success: false,
            message: (0, i18n_1.t)('auth.authorization.error'),
        });
    }
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=admin.middleware.js.map