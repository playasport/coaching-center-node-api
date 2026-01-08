import { RoleModel } from '../../models/role.model';
import { UserModel } from '../../models/user.model';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { Types } from 'mongoose';

// Simple in-memory cache for role IDs (roles don't change often, so cache for longer)
let roleCache: {
  userRoleId: Types.ObjectId | null;
  academyRoleId: Types.ObjectId | null;
  timestamp: number;
} | null = null;

// Cache for 1 hour (roles rarely change, so longer cache is safe)
const ROLE_CACHE_TTL = 300 * 60 * 1000; // 5 hours

// Flag to prevent multiple simultaneous fetches
let isFetchingRoles = false;
let fetchPromise: Promise<{ userRoleId: Types.ObjectId | null; academyRoleId: Types.ObjectId | null }> | null = null;

/**
 * Get user and academy role IDs with caching (optimized for performance)
 * This is used frequently in user queries, so caching significantly improves performance
 */
export const getRoleIds = async (): Promise<{ userRoleId: Types.ObjectId | null; academyRoleId: Types.ObjectId | null }> => {
  const now = Date.now();
  
  // Return cached roles if still valid (fast path - no DB query)
  if (roleCache && (now - roleCache.timestamp) < ROLE_CACHE_TTL) {
    return {
      userRoleId: roleCache.userRoleId,
      academyRoleId: roleCache.academyRoleId,
    };
  }
  
  // If already fetching, wait for that promise instead of creating a new query
  if (isFetchingRoles && fetchPromise) {
    return fetchPromise;
  }
  
  // Fetch roles from database (only if cache expired and not already fetching)
  isFetchingRoles = true;
  fetchPromise = (async () => {
    try {
      // Use parallel findOne calls for better performance (faster than find with $in for just 2 items)
      // Since 'name' has a unique index, findOne is very fast
      const [userRole, academyRole] = await Promise.all([
        RoleModel.findOne({ name: DefaultRoles.USER }).select('_id').lean(),
        RoleModel.findOne({ name: DefaultRoles.ACADEMY }).select('_id').lean(),
      ]);
      
      const userRoleId = userRole?._id ? new Types.ObjectId(userRole._id.toString()) : null;
      const academyRoleId = academyRole?._id ? new Types.ObjectId(academyRole._id.toString()) : null;
      
      // Update cache
      roleCache = {
        userRoleId,
        academyRoleId,
        timestamp: Date.now(),
      };
      
      return { userRoleId, academyRoleId };
    } finally {
      isFetchingRoles = false;
      fetchPromise = null;
    }
  })();
  
  return fetchPromise;
};

/**
 * Pre-load role cache on server startup (optional optimization)
 */
export const preloadRoleCache = async (): Promise<void> => {
  try {
    await getRoleIds();
    logger.info('Role cache preloaded successfully');
  } catch (error) {
    logger.warn('Failed to preload role cache, will load on first request', error);
  }
};

/**
 * Get all roles visible to the logged-in user based on their role
 * @param userRole - The role ID of the logged-in user
 * @returns Array of roles that the user can view with system-defined flag and user count
 */
export const getRolesByUser = async (userRole: string): Promise<any[]> => {
  try {
    let roles;
    
    // SUPER_ADMIN can see all roles
    if (userRole === DefaultRoles.SUPER_ADMIN) {
      roles = await RoleModel.find({}).select('_id name description').sort({ name: 1 }).lean();
    }
    // ADMIN can see all roles
    else if (userRole === DefaultRoles.ADMIN) {
      roles = await RoleModel.find({}).select('_id name description').sort({ name: 1 }).lean();
    }
    // For other roles, filter based on visibleToRoles
    else {
      const allRoles = await RoleModel.find({}).sort({ name: 1 }).lean();
      
      const visibleRoles = allRoles.filter((role) => {
        // If visibleToRoles is null or empty, only SUPER_ADMIN and ADMIN can see it
        if (!role.visibleToRoles || role.visibleToRoles.length === 0) {
          return false; // Regular users can't see roles with null visibleToRoles
        }

        // Check if user's role is in the visibleToRoles array
        return role.visibleToRoles.includes(userRole);
      });

      // Preserve _id for user count query, but also include id for response
      roles = visibleRoles.map((role) => ({
        _id: role._id, // Preserve ObjectId for user count query
        id: role._id?.toString(),
        name: role.name,
        description: role.description,
      }));
    }

    // Get all default role names for system-defined check
    const defaultRoleNames = Object.values(DefaultRoles);

    // Transform to include id, system-defined flag, and user count
    const rolesWithMetadata = await Promise.all(
      roles.map(async (role: any) => {
        // Get role ID - handle both ObjectId and string cases
        const roleId = role._id?.toString() || role.id;
        const roleObjectId = role._id || new Types.ObjectId(roleId);
        const roleName = role.name;

        // Check if role is system-defined
        const isSystemDefined = defaultRoleNames.includes(roleName as DefaultRoles);

        // Count users with this role (users where roles array contains this role _id)
        const userCount = await UserModel.countDocuments({
          roles: roleObjectId, // Use ObjectId for proper MongoDB query
          isDeleted: false, // Only count active (non-deleted) users
        });

        return {
          id: roleId,
          name: roleName,
          description: role.description,
          isSystemDefined,
          userCount,
        };
      })
    );

    return rolesWithMetadata;
  } catch (error) {
    logger.error('Failed to fetch roles:', error);
    throw new ApiError(500, t('role.list.failed') || 'Failed to fetch roles');
  }
};

/**
 * Get all roles with pagination and metadata (admin only - for internal use)
 * @param page - Page number (default: 1)
 * @param limit - Number of records per page (default: 10)
 * @returns Object with roles array (including isSystemDefined and userCount) and pagination info
 */
export const getAllRoles = async (page: number = 1, limit: number = 10): Promise<{
  roles: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}> => {
  try {
    const skip = (page - 1) * limit;
    const total = await RoleModel.countDocuments({});
    
    const roles = await RoleModel.find({})
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get all default role names for system-defined check
    const defaultRoleNames = Object.values(DefaultRoles);

    // Transform to include id, system-defined flag, and user count
    const rolesWithMetadata = await Promise.all(
      roles.map(async (role: any) => {
        const roleId = role._id?.toString();
        const roleObjectId = role._id;
        const roleName = role.name;

        // Check if role is system-defined
        const isSystemDefined = defaultRoleNames.includes(roleName as DefaultRoles);

        // Count users with this role (users where roles array contains this role _id)
        const userCount = await UserModel.countDocuments({
          roles: roleObjectId, // Use ObjectId for proper MongoDB query
          isDeleted: false, // Only count active (non-deleted) users
        });

        return {
          id: roleId,
          name: roleName,
          description: role.description,
          visibleToRoles: role.visibleToRoles,
          isSystemDefined,
          userCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      roles: rolesWithMetadata,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch all roles:', error);
    throw new ApiError(500, t('role.list.failed') || 'Failed to fetch roles');
  }
};


