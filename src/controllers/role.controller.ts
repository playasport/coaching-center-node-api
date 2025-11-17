import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as roleService from '../services/role.service';

/**
 * Get list of roles visible to the logged-in user
 */
export const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.role) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const roles = await roleService.getRolesByUser(req.user.role);

    const response = new ApiResponse(
      200,
      { roles, count: roles.length },
      t('role.list.success') || 'Roles retrieved successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

