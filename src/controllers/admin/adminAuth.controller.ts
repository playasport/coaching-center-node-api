import { Request, Response } from 'express';
import { UserModel } from '../../models/user.model';
import { comparePassword } from '../../utils';
import { generateTokenPair } from '../../utils/jwt';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import * as authService from '../../services/client/auth.service';
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

    // Verify password first (before checking permissions to avoid revealing if email exists)
    // This prevents information disclosure about whether an email is registered
    let isPasswordValid = false;
    if (user) {
      isPasswordValid = await comparePassword(password, user.password);
    }

    // If user doesn't exist or password is invalid, throw generic error
    // This ensures we don't reveal whether the email exists in the system
    if (!user || !isPasswordValid) {
      throw new ApiError(401, t('auth.login.invalidCredentials'));
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, t('auth.account.inactive'));
    }

    // Check if user has admin role or admin panel permissions (only after password verification)
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

    // Clear user-level blacklist if it exists (user is logging in again after logout all)
    const { clearUserBlacklist } = await import('../../utils/tokenBlacklist');
    await clearUserBlacklist(user.id);

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
          profileImage: user.profileImage || null,
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

    // Check if refresh token is blacklisted (including user-level blacklist from logout all)
    const { isTokenBlacklisted } = await import('../../utils/tokenBlacklist');
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new ApiError(401, t('auth.token.invalidToken'));
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
    logger.error('Admin logout all error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
    });
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update admin profile image
 */
export const updateAdminProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    if (!req.file) {
      throw new ApiError(400, t('validation.file.required'));
    }

    const user = await UserModel.findOne({ id: req.user.id, isDeleted: false }).lean();

    if (!user) {
      throw new ApiError(404, t('auth.user.notFound'));
    }

    // Import S3 utilities
    const { uploadFileToS3, deleteFileFromS3 } = await import('../../services/common/s3.service');

    try {
      logger.info('Starting admin profile image upload', {
        userId: user.id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });

      // Upload new image to S3 and delete old image in parallel
      const imageUrlPromise = uploadFileToS3({
        file: req.file,
        folder: 'users',
        userId: user.id,
      });

      // Delete old profile image in background (don't block upload)
      if (user.profileImage) {
        deleteFileFromS3(user.profileImage)
          .then(() => {
            logger.info('Old admin profile image deleted', { oldImageUrl: user.profileImage });
          })
          .catch((deleteError) => {
            logger.warn('Failed to delete old admin profile image, continuing with upload', deleteError);
            // Don't fail the upload if deletion fails
          });
      }

      // Wait for upload to complete
      const imageUrl = await imageUrlPromise;

      // Update user profile image
      const updatedUser = await UserModel.findOneAndUpdate(
        { id: req.user.id },
        { $set: { profileImage: imageUrl } },
        { new: true, runValidators: true }
      )
        .select('-password')
        .populate('roles', 'name description')
        .lean();

      if (!updatedUser) {
        throw new ApiError(500, t('errors.internalServerError'));
      }

      logger.info('Admin profile image uploaded successfully', { imageUrl, userId: user.id });

      const response = new ApiResponse(
        200,
        {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            profileImage: updatedUser.profileImage,
            roles: (updatedUser.roles as any[]).map((r: any) => r?.name),
          },
        },
        t('admin.profile.imageUpdated')
      );
      res.json(response);
    } catch (error: any) {
      logger.error('Failed to upload admin profile image', {
        error: error?.message || error,
        stack: error?.stack,
        userId: user.id,
        fileName: req.file?.originalname,
      });
      throw new ApiError(500, error?.message || t('auth.profile.imageUploadFailed'));
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Update admin profile image error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
