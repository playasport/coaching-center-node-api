import { Request, Response } from 'express';
import { PermissionModel } from '../../models/permission.model';
import { RoleModel } from '../../models/role.model';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { Types } from 'mongoose';
import {
  invalidatePermissionCache,
  getRolePermissions,
} from '../../services/permission.service';
import { getAllSections, getAllActions } from '../../services/admin.service';
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
  BulkUpdatePermissionsInput,
} from '../../validations/permission.validation';

/**
 * Get all permissions
 * Super Admin sees all, others see only their role's permissions
 */
export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Check if user is super admin
    const { UserModel } = await import('../../models/user.model');
    const user = await UserModel.findOne({
      id: req.user.id,
    })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    const userRoles = user?.roles as any[];
    const isSuperAdmin = userRoles?.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (!isSuperAdmin) {
      // Others see only permissions for their roles
      const roleIds = userRoles?.map((r: any) =>
        r?._id instanceof Types.ObjectId ? r._id : new Types.ObjectId(r?._id)
      ) || [];
      query = { role: { $in: roleIds } };
    }

    const total = await PermissionModel.countDocuments(query);
    const permissions = await PermissionModel.find(query)
      .populate('role', 'name description')
      .sort({ role: 1, section: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    const response = new ApiResponse(
      200,
      {
        permissions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      t('admin.permissions.retrieved')
    );
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get permissions error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get permission by ID
 */
export const getPermissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid permission ID');
    }

    const permission = await PermissionModel.findById(id)
      .populate('role', 'name description')
      .lean();

    if (!permission) {
      throw new ApiError(404, t('admin.permissions.notFound'));
    }

    const response = new ApiResponse(200, { permission }, t('admin.permissions.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get permission by ID error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create permission (Super Admin only)
 */
export const createPermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreatePermissionInput = req.body;

    // Check if role exists
    const role = await RoleModel.findById(data.role);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    // Check if permission already exists for this role and section
    const existing = await PermissionModel.findOne({
      role: data.role,
      section: data.section,
    });

    if (existing) {
      throw new ApiError(400, 'Permission already exists for this role and section');
    }

    // Create permission
    const permission = new PermissionModel(data);
    await permission.save();

    // Invalidate cache
    await invalidatePermissionCache(data.role);

    const populated = await PermissionModel.findById(permission._id)
      .populate('role', 'name description')
      .lean();

    const response = new ApiResponse(201, { permission: populated }, t('admin.permissions.created'));
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Create permission error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update permission (Super Admin only)
 */
export const updatePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdatePermissionInput = req.body;

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid permission ID');
    }

    const permission = await PermissionModel.findById(id);
    if (!permission) {
      throw new ApiError(404, t('admin.permissions.notFound'));
    }

    // Update permission
    Object.assign(permission, data);
    await permission.save();

    // Invalidate cache
    await invalidatePermissionCache(permission.role);

    const populated = await PermissionModel.findById(permission._id)
      .populate('role', 'name description')
      .lean();

    const response = new ApiResponse(200, { permission: populated }, t('admin.permissions.updated'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Update permission error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete permission (Super Admin only)
 */
export const deletePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid permission ID');
    }

    const permission = await PermissionModel.findById(id);
    if (!permission) {
      throw new ApiError(404, t('admin.permissions.notFound'));
    }

    const roleId = permission.role;

    // Delete permission
    await PermissionModel.findByIdAndDelete(id);

    // Invalidate cache
    await invalidatePermissionCache(roleId);

    const response = new ApiResponse(200, null, t('admin.permissions.deleted'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Delete permission error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get permissions by role
 */
export const getPermissionsByRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleId } = req.params;

    if (!Types.ObjectId.isValid(roleId)) {
      throw new ApiError(400, 'Invalid role ID');
    }

    // Check if role exists
    const role = await RoleModel.findById(roleId);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    const permissions = await getRolePermissions(roleId);

    const response = new ApiResponse(200, { role, permissions }, t('admin.permissions.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get permissions by role error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Bulk update permissions for a role (Super Admin only)
 */
export const bulkUpdatePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: BulkUpdatePermissionsInput = req.body;

    // Check if role exists
    const role = await RoleModel.findById(data.role);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    // Delete existing permissions for this role
    await PermissionModel.deleteMany({ role: data.role });

    // Create new permissions
    await PermissionModel.insertMany(
      data.permissions.map((perm) => ({
        role: data.role,
        section: perm.section,
        actions: perm.actions,
        isActive: perm.isActive,
      }))
    );

    // Invalidate cache
    await invalidatePermissionCache(data.role);

    const populated = await PermissionModel.find({ role: data.role })
      .populate('role', 'name description')
      .lean();

    const response = new ApiResponse(200, { permissions: populated }, t('admin.permissions.bulkUpdated'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Bulk update permissions error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get available sections
 */
export const getAvailableSections = async (_req: Request, res: Response): Promise<void> => {
  try {
    const sections = getAllSections();
    const response = new ApiResponse(200, { sections }, t('admin.sections.retrieved'));
    res.json(response);
  } catch (error) {
    logger.error('Get available sections error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get available actions
 */
export const getAvailableActions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const actions = getAllActions();
    const response = new ApiResponse(200, { actions }, t('admin.actions.retrieved'));
    res.json(response);
  } catch (error) {
    logger.error('Get available actions error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get current user's permissions (simplified format for frontend)
 */
export const getMyPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { getUserPermissions } = await import('../../services/permission.service');
    const permissions = await getUserPermissions(req.user.id);

    // Transform to simplified format: { section: [actions] }
    const simplified: Record<string, string[]> = {};
    permissions.forEach((perm) => {
      if (perm.isActive) {
        simplified[perm.section] = perm.actions;
      }
    });

    const response = new ApiResponse(200, { permissions: simplified }, t('admin.permissions.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get my permissions error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
