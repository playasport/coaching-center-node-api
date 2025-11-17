import { RoleModel, DefaultRoles } from '../models/role.model';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';

/**
 * Get all roles visible to the logged-in user based on their role
 * @param userRole - The role ID of the logged-in user
 * @returns Array of roles that the user can view
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

      // Select only name and description fields
      roles = visibleRoles.map((role) => ({
        id: role._id?.toString(),
        name: role.name,
        description: role.description,
      }));
    }

    // Transform to include id field and exclude unwanted fields
    return roles.map((role: any) => ({
      id: role._id?.toString() || role.id,
      name: role.name,
      description: role.description,
    }));
  } catch (error) {
    logger.error('Failed to fetch roles:', error);
    throw new ApiError(500, t('role.list.failed') || 'Failed to fetch roles');
  }
};

/**
 * Get all roles (admin only - for internal use)
 */
export const getAllRoles = async (): Promise<any[]> => {
  try {
    const roles = await RoleModel.find({}).sort({ name: 1 });
    return roles;
  } catch (error) {
    logger.error('Failed to fetch all roles:', error);
    throw new ApiError(500, t('role.list.failed') || 'Failed to fetch roles');
  }
};

