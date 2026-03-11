"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePermissionCache = exports.invalidateAllPermissionCache = exports.invalidatePermissionCache = exports.getRolePermissions = exports.getUserPermissions = exports.checkPermission = exports.hasPermission = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const mongoose_1 = require("mongoose");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const permission_model_1 = require("../../models/permission.model");
const adminUser_model_1 = require("../../models/adminUser.model");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
// Redis connection for permission caching
let redisClient = null;
/**
 * Get or create Redis client for permission caching
 */
const getRedisClient = () => {
    if (!redisClient) {
        redisClient = new ioredis_1.default({
            host: env_1.config.redis.host,
            port: env_1.config.redis.port,
            password: env_1.config.redis.password,
            db: env_1.config.redis.db.permissionCache,
            ...env_1.config.redis.connection,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        redisClient.on('error', (err) => {
            logger_1.logger.error('Redis permission cache client error:', err);
        });
        redisClient.on('connect', () => {
            logger_1.logger.info('Redis permission cache client connected');
        });
    }
    return redisClient;
};
/**
 * Cache key prefix for permissions
 */
const CACHE_KEY_PREFIX = 'permission:';
const CACHE_TTL = 60 * 60; // 1 hour
/**
 * Generate cache key for permission lookup
 */
const getCacheKey = (roleId, section, action) => {
    return `${CACHE_KEY_PREFIX}${roleId}:${section}:${action}`;
};
/**
 * Generate cache key for all role permissions
 */
const getRolePermissionsCacheKey = (roleId) => {
    return `${CACHE_KEY_PREFIX}role:${roleId}`;
};
/**
 * Check if a role has a specific permission
 * @param roleId - Role ObjectId or string
 * @param section - Section name
 * @param action - Action name
 * @returns True if permission exists and is active
 */
const hasPermission = async (roleId, section, action) => {
    try {
        const roleIdStr = roleId instanceof mongoose_1.Types.ObjectId ? roleId.toString() : roleId;
        const cacheKey = getCacheKey(roleIdStr, section, action);
        const redis = getRedisClient();
        // Try cache first
        try {
            const cached = await redis.get(cacheKey);
            if (cached !== null) {
                return cached === 'true';
            }
        }
        catch (cacheError) {
            logger_1.logger.warn('Permission cache read failed, falling back to database', {
                roleId: roleIdStr,
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        }
        // Cache miss - check database
        const permission = await permission_model_1.PermissionModel.findOne({
            role: roleId,
            section,
            actions: action,
            isActive: true,
        }).lean();
        const hasPerm = !!permission;
        // Cache the result
        try {
            await redis.setex(cacheKey, CACHE_TTL, hasPerm ? 'true' : 'false');
        }
        catch (cacheError) {
            logger_1.logger.warn('Failed to cache permission, but continuing', {
                roleId: roleIdStr,
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        }
        return hasPerm;
    }
    catch (error) {
        logger_1.logger.error('Error checking permission:', {
            roleId,
            section,
            action,
            error: error instanceof Error ? error.message : error,
        });
        return false; // Fail secure - deny access on error
    }
};
exports.hasPermission = hasPermission;
/**
 * Check if a user has a specific permission
 * @param userId - User's string ID
 * @param section - Section name
 * @param action - Action name
 * @returns True if user has permission
 */
const checkPermission = async (userId, section, action) => {
    try {
        // Get user with roles
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: userId, isDeleted: false, isActive: true })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user || !user.roles || user.roles.length === 0) {
            return false;
        }
        // Check if user has super_admin role (bypass all checks)
        const userRoles = user.roles;
        const hasSuperAdmin = userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN);
        if (hasSuperAdmin) {
            return true;
        }
        // Check permissions for all user roles
        for (const role of userRoles) {
            if (role?._id) {
                const roleId = role._id instanceof mongoose_1.Types.ObjectId ? role._id : new mongoose_1.Types.ObjectId(role._id);
                const hasPerm = await (0, exports.hasPermission)(roleId, section, action);
                if (hasPerm) {
                    return true;
                }
            }
        }
        return false;
    }
    catch (error) {
        logger_1.logger.error('Error checking user permission:', {
            userId,
            section,
            action,
            error: error instanceof Error ? error.message : error,
        });
        return false;
    }
};
exports.checkPermission = checkPermission;
/**
 * Get all permissions for a user
 * @param userId - User's string ID
 * @returns Array of permissions
 */
const getUserPermissions = async (userId) => {
    try {
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: userId, isDeleted: false, isActive: true })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user || !user.roles || user.roles.length === 0) {
            return [];
        }
        // Check if user has super_admin role
        const userRoles = user.roles;
        const hasSuperAdmin = userRoles.some((r) => r?.name === defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN);
        if (hasSuperAdmin) {
            // Super admin has all permissions - return all sections with all actions
            const allSections = Object.values(section_enum_1.Section);
            const allActions = Object.values(section_enum_2.Action);
            return allSections.flatMap((section) => allActions.map((action) => ({
                section,
                actions: [action],
            })));
        }
        // Get permissions for all user roles
        const roleIds = userRoles
            .map((r) => (r?._id instanceof mongoose_1.Types.ObjectId ? r._id : new mongoose_1.Types.ObjectId(r?._id)))
            .filter((id) => id);
        const permissions = await permission_model_1.PermissionModel.find({
            role: { $in: roleIds },
            isActive: true,
        }).lean();
        return permissions;
    }
    catch (error) {
        logger_1.logger.error('Error getting user permissions:', {
            userId,
            error: error instanceof Error ? error.message : error,
        });
        return [];
    }
};
exports.getUserPermissions = getUserPermissions;
/**
 * Get all permissions for a role
 * @param roleId - Role ObjectId or string
 * @returns Array of permissions
 */
const getRolePermissions = async (roleId) => {
    try {
        const roleIdObj = roleId instanceof mongoose_1.Types.ObjectId ? roleId : new mongoose_1.Types.ObjectId(roleId);
        const cacheKey = getRolePermissionsCacheKey(roleIdObj.toString());
        const redis = getRedisClient();
        // Try cache first
        try {
            const cached = await redis.get(cacheKey);
            if (cached !== null) {
                return JSON.parse(cached);
            }
        }
        catch (cacheError) {
            logger_1.logger.warn('Role permissions cache read failed, falling back to database', {
                roleId: roleIdObj.toString(),
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        }
        // Cache miss - fetch from database
        const permissions = await permission_model_1.PermissionModel.find({
            role: roleIdObj,
            isActive: true,
        }).lean();
        // Cache the result
        try {
            await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));
        }
        catch (cacheError) {
            logger_1.logger.warn('Failed to cache role permissions, but continuing', {
                roleId: roleIdObj.toString(),
                error: cacheError instanceof Error ? cacheError.message : cacheError,
            });
        }
        return permissions;
    }
    catch (error) {
        logger_1.logger.error('Error getting role permissions:', {
            roleId,
            error: error instanceof Error ? error.message : error,
        });
        return [];
    }
};
exports.getRolePermissions = getRolePermissions;
/**
 * Invalidate permission cache for a role
 * @param roleId - Role ObjectId or string
 */
const invalidatePermissionCache = async (roleId) => {
    try {
        const roleIdStr = roleId instanceof mongoose_1.Types.ObjectId ? roleId.toString() : roleId;
        const redis = getRedisClient();
        // Invalidate role permissions cache
        const roleCacheKey = getRolePermissionsCacheKey(roleIdStr);
        await redis.del(roleCacheKey);
        // Invalidate all permission caches for this role (pattern match)
        const pattern = `${CACHE_KEY_PREFIX}${roleIdStr}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        logger_1.logger.debug('Permission cache invalidated', { roleId: roleIdStr });
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate permission cache', {
            roleId,
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.invalidatePermissionCache = invalidatePermissionCache;
/**
 * Invalidate all permission caches
 */
const invalidateAllPermissionCache = async () => {
    try {
        const redis = getRedisClient();
        const pattern = `${CACHE_KEY_PREFIX}*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        logger_1.logger.debug('All permission caches invalidated');
    }
    catch (error) {
        logger_1.logger.warn('Failed to invalidate all permission caches', {
            error: error instanceof Error ? error.message : error,
        });
    }
};
exports.invalidateAllPermissionCache = invalidateAllPermissionCache;
/**
 * Close Redis connection (for graceful shutdown)
 */
const closePermissionCache = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('Redis permission cache client closed');
    }
};
exports.closePermissionCache = closePermissionCache;
//# sourceMappingURL=permission.service.js.map