import Redis from 'ioredis';
import { Types } from 'mongoose';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PermissionModel, Permission } from '../models/permission.model';
import { UserModel } from '../models/user.model';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';
import { DefaultRoles } from '../enums/defaultRoles.enum';

// Redis connection for permission caching
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for permission caching
 */
const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db.permissionCache,
      ...config.redis.connection,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis permission cache client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis permission cache client connected');
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
const getCacheKey = (roleId: string, section: string, action: string): string => {
  return `${CACHE_KEY_PREFIX}${roleId}:${section}:${action}`;
};

/**
 * Generate cache key for all role permissions
 */
const getRolePermissionsCacheKey = (roleId: string): string => {
  return `${CACHE_KEY_PREFIX}role:${roleId}`;
};

/**
 * Check if a role has a specific permission
 * @param roleId - Role ObjectId or string
 * @param section - Section name
 * @param action - Action name
 * @returns True if permission exists and is active
 */
export const hasPermission = async (
  roleId: string | Types.ObjectId,
  section: Section,
  action: Action
): Promise<boolean> => {
  try {
    const roleIdStr = roleId instanceof Types.ObjectId ? roleId.toString() : roleId;
    const cacheKey = getCacheKey(roleIdStr, section, action);
    const redis = getRedisClient();

    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return cached === 'true';
      }
    } catch (cacheError) {
      logger.warn('Permission cache read failed, falling back to database', {
        roleId: roleIdStr,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    // Cache miss - check database
    const permission = await PermissionModel.findOne({
      role: roleId,
      section,
      actions: action,
      isActive: true,
    }).lean();

    const hasPerm = !!permission;

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, hasPerm ? 'true' : 'false');
    } catch (cacheError) {
      logger.warn('Failed to cache permission, but continuing', {
        roleId: roleIdStr,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    return hasPerm;
  } catch (error) {
    logger.error('Error checking permission:', {
      roleId,
      section,
      action,
      error: error instanceof Error ? error.message : error,
    });
    return false; // Fail secure - deny access on error
  }
};

/**
 * Check if a user has a specific permission
 * @param userId - User's string ID
 * @param section - Section name
 * @param action - Action name
 * @returns True if user has permission
 */
export const checkPermission = async (
  userId: string,
  section: Section,
  action: Action
): Promise<boolean> => {
  try {
    // Get user with roles
    const user = await UserModel.findOne({ id: userId, isDeleted: false, isActive: true })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    // Check if user has super_admin role (bypass all checks)
    const userRoles = user.roles as any[];
    const hasSuperAdmin = userRoles.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);
    if (hasSuperAdmin) {
      return true;
    }

    // Check permissions for all user roles
    for (const role of userRoles) {
      if (role?._id) {
        const roleId = role._id instanceof Types.ObjectId ? role._id : new Types.ObjectId(role._id);
        const hasPerm = await hasPermission(roleId, section, action);
        if (hasPerm) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error('Error checking user permission:', {
      userId,
      section,
      action,
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
};

/**
 * Get all permissions for a user
 * @param userId - User's string ID
 * @returns Array of permissions
 */
export const getUserPermissions = async (userId: string): Promise<Permission[]> => {
  try {
    const user = await UserModel.findOne({ id: userId, isDeleted: false, isActive: true })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user || !user.roles || user.roles.length === 0) {
      return [];
    }

    // Check if user has super_admin role
    const userRoles = user.roles as any[];
    const hasSuperAdmin = userRoles.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);
    if (hasSuperAdmin) {
      // Super admin has all permissions - return all sections with all actions
      const allSections = Object.values(Section);
      const allActions = Object.values(Action);
      return allSections.flatMap((section) =>
        allActions.map((action) => ({
          section,
          actions: [action],
        } as any))
      );
    }

    // Get permissions for all user roles
    const roleIds = userRoles
      .map((r: any) => (r?._id instanceof Types.ObjectId ? r._id : new Types.ObjectId(r?._id)))
      .filter((id) => id);

    const permissions = await PermissionModel.find({
      role: { $in: roleIds },
      isActive: true,
    }).lean();

    return permissions as Permission[];
  } catch (error) {
    logger.error('Error getting user permissions:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    return [];
  }
};

/**
 * Get all permissions for a role
 * @param roleId - Role ObjectId or string
 * @returns Array of permissions
 */
export const getRolePermissions = async (roleId: string | Types.ObjectId): Promise<Permission[]> => {
  try {
    const roleIdObj = roleId instanceof Types.ObjectId ? roleId : new Types.ObjectId(roleId);
    const cacheKey = getRolePermissionsCacheKey(roleIdObj.toString());
    const redis = getRedisClient();

    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn('Role permissions cache read failed, falling back to database', {
        roleId: roleIdObj.toString(),
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    // Cache miss - fetch from database
    const permissions = await PermissionModel.find({
      role: roleIdObj,
      isActive: true,
    }).lean();

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));
    } catch (cacheError) {
      logger.warn('Failed to cache role permissions, but continuing', {
        roleId: roleIdObj.toString(),
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    return permissions as Permission[];
  } catch (error) {
    logger.error('Error getting role permissions:', {
      roleId,
      error: error instanceof Error ? error.message : error,
    });
    return [];
  }
};

/**
 * Invalidate permission cache for a role
 * @param roleId - Role ObjectId or string
 */
export const invalidatePermissionCache = async (roleId: string | Types.ObjectId): Promise<void> => {
  try {
    const roleIdStr = roleId instanceof Types.ObjectId ? roleId.toString() : roleId;
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

    logger.debug('Permission cache invalidated', { roleId: roleIdStr });
  } catch (error) {
    logger.warn('Failed to invalidate permission cache', {
      roleId,
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * Invalidate all permission caches
 */
export const invalidateAllPermissionCache = async (): Promise<void> => {
  try {
    const redis = getRedisClient();
    const pattern = `${CACHE_KEY_PREFIX}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    logger.debug('All permission caches invalidated');
  } catch (error) {
    logger.warn('Failed to invalidate all permission caches', {
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * Close Redis connection (for graceful shutdown)
 */
export const closePermissionCache = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis permission cache client closed');
  }
};
