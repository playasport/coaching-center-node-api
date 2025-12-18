import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { DefaultRoles } from '../enums/defaultRoles.enum';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

/**
 * Admin roles that can access admin panel
 */
const ADMIN_ROLES = [
  DefaultRoles.SUPER_ADMIN,
  DefaultRoles.ADMIN,
  DefaultRoles.EMPLOYEE,
  DefaultRoles.AGENT,
];

/**
 * Middleware to require admin role
 * Ensures user is authenticated and has an admin role
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: t('auth.authorization.unauthorized'),
      });
      return;
    }

    // Get user with roles from database
    const user = await UserModel.findOne({
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
        message: t('auth.authorization.unauthorized'),
      });
      return;
    }

    // Check if user has any admin role
    const userRoles = user.roles as any[];
    const hasAdminRole = userRoles.some((r: any) => ADMIN_ROLES.includes(r?.name));

    // If user doesn't have a default admin role, check if they have admin panel permissions
    if (!hasAdminRole) {
      const { PermissionModel } = await import('../models/permission.model');
      const { Section } = await import('../enums/section.enum');
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
        logger.warn('Admin access denied - user has no roles', {
          userId: req.user.id,
        });
        res.status(403).json({
          success: false,
          message: t('auth.authorization.forbidden'),
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
      ];

      const hasAdminPermission = await PermissionModel.exists({
        role: { $in: roleIds },
        section: { $in: adminSections },
        isActive: true,
      });

      if (!hasAdminPermission) {
        logger.warn('Admin access denied - user does not have admin permissions', {
          userId: req.user.id,
          userRoles: userRoles.map((r: any) => r?.name),
        });
        res.status(403).json({
          success: false,
          message: t('auth.authorization.forbidden'),
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in requireAdmin middleware:', {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({
      success: false,
      message: t('auth.authorization.error'),
    });
  }
};
