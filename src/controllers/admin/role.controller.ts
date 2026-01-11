import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { RoleModel } from '../../models/role.model';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { AdminUserModel } from '../../models/adminUser.model';
import type { CreateRoleInput, UpdateRoleInput } from '../../validations/role.validation';
import { Types } from 'mongoose';
import * as roleService from '../../services/admin/role.service';

/**
 * Get all roles (admin - Super Admin only)
 */
export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await roleService.getAllRoles(page, limit);

    const response = new ApiResponse(
      200,
      result,
      'Roles retrieved successfully'
    );
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get all roles error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get role by ID (admin - Super Admin only)
 */
export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid role ID');
    }

    const role = await RoleModel.findById(id).lean();

    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    const response = new ApiResponse(200, { role }, 'Role retrieved successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get role by ID error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create role (admin - Super Admin only)
 */
export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: CreateRoleInput = req.body;

    // Check if role name already exists
    const existingRole = await RoleModel.findOne({ name: data.name });
    if (existingRole) {
      throw new ApiError(400, 'Role name already exists');
    }

    // Prevent creating default roles
    const defaultRoleNames = Object.values(DefaultRoles);
    if (defaultRoleNames.includes(data.name as any)) {
      throw new ApiError(400, 'Cannot create default system roles');
    }

    // Create role
    const role = await RoleModel.create({
      name: data.name,
      description: data.description ?? null,
      visibleToRoles: data.visibleToRoles ?? null,
    });

    logger.info(`Admin created role: ${role.name} (${role._id})`);

    const response = new ApiResponse(201, { role }, 'Role created successfully');
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Create role error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update role (admin - Super Admin only)
 */
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data: UpdateRoleInput = req.body;

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid role ID');
    }

    const role = await RoleModel.findById(id);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    // Prevent modifying default roles (except description and visibleToRoles)
    const defaultRoleNames = Object.values(DefaultRoles);
    if (defaultRoleNames.includes(role.name as any)) {
      // Only allow updating description and visibleToRoles for default roles
      if (data.description !== undefined) {
        role.description = data.description ?? null;
      }
      if (data.visibleToRoles !== undefined) {
        role.visibleToRoles = data.visibleToRoles ?? null;
      }
    } else {
      // For non-default roles, allow all updates
      if (data.description !== undefined) {
        role.description = data.description ?? null;
      }
      if (data.visibleToRoles !== undefined) {
        role.visibleToRoles = data.visibleToRoles ?? null;
      }
    }

    await role.save();

    logger.info(`Admin updated role: ${role.name} (${role._id})`);

    const response = new ApiResponse(200, { role }, 'Role updated successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Update role error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete role (admin - Super Admin only)
 */
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid role ID');
    }

    const role = await RoleModel.findById(id);
    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    // Prevent deleting default roles
    const defaultRoleNames = Object.values(DefaultRoles);
    if (defaultRoleNames.includes(role.name as any)) {
      throw new ApiError(400, 'Cannot delete default system roles');
    }

    // Check if any admin users have this role
    const usersWithRole = await AdminUserModel.countDocuments({
      roles: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (usersWithRole > 0) {
      throw new ApiError(400, `Cannot delete role. ${usersWithRole} user(s) are assigned to this role`);
    }

    // Delete role
    await RoleModel.findByIdAndDelete(id);

    logger.info(`Admin deleted role: ${role.name} (${id})`);

    const response = new ApiResponse(200, null, 'Role deleted successfully');
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Delete role error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
