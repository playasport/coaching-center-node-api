import { Request, Response } from 'express';
import { UserModel } from '../../models/user.model';
import { comparePassword } from '../../utils';
import { generateTokenPair } from '../../utils/jwt';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import * as authService from '../../services/auth.service';
import type {
  AdminLoginInput,
  AdminUpdateProfileInput,
  AdminChangePasswordInput,
} from '../../validations/adminAuth.validation';

/**
 * Admin login
 */
export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: AdminLoginInput = req.body;

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: false })
      .populate('roles', 'name')
      .lean();

    if (!user) {
      throw new ApiError(401, t('auth.login.invalidCredentials'));
    }

    // Check if user has admin role or admin panel permissions
    const userRoles = user.roles as any[];
    const adminRoles = [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN, DefaultRoles.EMPLOYEE, DefaultRoles.AGENT];
    const hasAdminRole = userRoles.some((r: any) => adminRoles.includes(r?.name));

    // If user doesn't have a default admin role, check if they have admin panel permissions
    if (!hasAdminRole) {
      const { PermissionModel } = await import('../../models/permission.model');
      const { Section } = await import('../../enums/section.enum');
      
      // Get role IDs (handle both _id from lean() and id from toJSON())
      const { Types } = await import('mongoose');
      const roleIds = userRoles
        .map((r: any) => {
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
        throw new ApiError(403, t('auth.authorization.forbidden'));
      }

      // Check if user has any admin panel permissions (dashboard, permission, user, role, coaching_center, etc.)
      const adminSections = [
        Section.DASHBOARD,
        Section.PERMISSION,
        Section.USER,
        Section.ROLE,
        Section.COACHING_CENTER,
      ];

      const hasAdminPermission = await PermissionModel.exists({
        role: { $in: roleIds },
        section: { $in: adminSections },
        isActive: true,
      });

      if (!hasAdminPermission) {
        throw new ApiError(403, t('auth.authorization.forbidden'));
      }
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, t('auth.account.inactive'));
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, t('auth.login.invalidCredentials'));
    }

    // Get role name (prefer super_admin > admin > employee > agent)
    let roleName = DefaultRoles.USER;
    if (userRoles.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN)) {
      roleName = DefaultRoles.SUPER_ADMIN;
    } else if (userRoles.some((r: any) => r?.name === DefaultRoles.ADMIN)) {
      roleName = DefaultRoles.ADMIN;
    } else if (userRoles.some((r: any) => r?.name === DefaultRoles.EMPLOYEE)) {
      roleName = DefaultRoles.EMPLOYEE;
    } else if (userRoles.some((r: any) => r?.name === DefaultRoles.AGENT)) {
      roleName = DefaultRoles.AGENT;
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(
      {
        id: user.id,
        email: user.email,
        role: roleName,
      },
      'web'
    );

    const response = new ApiResponse(
      200,
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: userRoles.map((r: any) => r?.name),
        },
        accessToken,
        refreshToken,
      },
      t('auth.login.success')
    );

    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin login error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get admin profile
 */
export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const user = await UserModel.findOne({ id: req.user.id, isDeleted: false })
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    const response = new ApiResponse(200, { user }, t('admin.profile.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Get admin profile error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update admin profile
 */
export const updateAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const updateData: AdminUpdateProfileInput = req.body;

    const user = await UserModel.findOneAndUpdate(
      { id: req.user.id, isDeleted: false },
      {
        $set: {
          ...(updateData.firstName && { firstName: updateData.firstName }),
          ...(updateData.lastName !== undefined && { lastName: updateData.lastName || null }),
          ...(updateData.mobile && { mobile: updateData.mobile }),
        },
      },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('roles', 'name description')
      .lean();

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    const response = new ApiResponse(200, { user }, t('admin.profile.updated'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Update admin profile error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Change admin password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { currentPassword, newPassword }: AdminChangePasswordInput = req.body;

    const user = await UserModel.findOne({ id: req.user.id, isDeleted: false }).select('password');

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ApiError(400, t('auth.password.currentPasswordIncorrect'));
    }

    // Update password
    const { hashPassword } = await import('../../utils/password');
    const hashedPassword = await hashPassword(newPassword);

    await UserModel.updateOne(
      { id: req.user.id },
      { $set: { password: hashedPassword } }
    );

    const response = new ApiResponse(200, null, t('auth.password.changed'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Change admin password error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Refresh admin access token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };

    if (!token) {
      throw new ApiError(400, t('auth.token.noToken'));
    }

    // Verify refresh token and get user ID
    const { verifyRefreshToken } = await import('../../utils/jwt');
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      throw new ApiError(401, t('auth.token.invalidToken'));
    }

    // Check if user exists and has admin role
    const user = await UserModel.findOne({ id: decoded.id, isDeleted: false, isActive: true })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user) {
      throw new ApiError(401, t('auth.token.invalidToken'));
    }

    // Verify user has admin role or admin panel permissions
    const userRoles = user.roles as any[];
    const adminRoles = [DefaultRoles.SUPER_ADMIN, DefaultRoles.ADMIN, DefaultRoles.EMPLOYEE, DefaultRoles.AGENT];
    const hasAdminRole = userRoles.some((r: any) => adminRoles.includes(r?.name));

    // If user doesn't have a default admin role, check if they have admin panel permissions
    if (!hasAdminRole) {
      const { PermissionModel } = await import('../../models/permission.model');
      const { Section } = await import('../../enums/section.enum');
      const { Types } = await import('mongoose');
      
      // Get role IDs (handle both _id from lean() and id from toJSON())
      const roleIds = userRoles
        .map((r: any) => {
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
        throw new ApiError(403, t('auth.authorization.forbidden'));
      }

      // Check if user has any admin panel permissions (dashboard, permission, user, role, coaching_center, etc.)
      const adminSections = [
        Section.DASHBOARD,
        Section.PERMISSION,
        Section.USER,
        Section.ROLE,
        Section.COACHING_CENTER,
      ];

      const hasAdminPermission = await PermissionModel.exists({
        role: { $in: roleIds },
        section: { $in: adminSections },
        isActive: true,
      });

      if (!hasAdminPermission) {
        throw new ApiError(403, t('auth.authorization.forbidden'));
      }
    }

    // Use the auth service refreshToken function to get new tokens
    const result = await authService.refreshToken(token);

    const response = new ApiResponse(
      200,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      t('auth.token.refreshed')
    );

    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin refresh token error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Logout admin - blacklist current tokens
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const { refreshToken } = req.body as { refreshToken?: string };

    await authService.logout(req.user.id, accessToken, refreshToken);

    const response = new ApiResponse(200, null, t('auth.logout.success'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin logout error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Logout admin from all devices - blacklist all user tokens
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    await authService.logoutAll(req.user.id);

    const response = new ApiResponse(200, null, t('auth.logout.allSuccess'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin logout all error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
