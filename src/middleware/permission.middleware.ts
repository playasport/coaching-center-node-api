import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '../services/admin/permission.service';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';
import { DefaultRoles } from '../enums/defaultRoles.enum';
import { UserModel } from '../models/user.model';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

/**
 * Check if user has super admin role
 */
const isSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    const user = await UserModel.findOne({ id: userId, isDeleted: false, isActive: true })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user || !user.roles) {
      return false;
    }

    const userRoles = user.roles as any[];
    return userRoles.some((r: any) => r?.name === DefaultRoles.SUPER_ADMIN);
  } catch (error) {
    logger.error('Error checking super admin status:', {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
};

/**
 * Middleware to require a specific permission
 * Super Admin bypasses all permission checks
 * 
 * @param section - Section name
 * @param action - Action name
 */
export const requirePermission = (section: Section, action: Action) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: t('auth.authorization.unauthorized'),
        });
        return;
      }

      // Super Admin bypass
      const isSuper = await isSuperAdmin(req.user.id);
      if (isSuper) {
        next();
        return;
      }

      // Check permission
      const hasPerm = await checkPermission(req.user.id, section, action);
      if (!hasPerm) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          section,
          action,
        });
        res.status(403).json({
          success: false,
          message: t('auth.authorization.forbidden'),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error in requirePermission middleware:', {
        userId: req.user?.id,
        section,
        action,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({
        success: false,
        message: t('auth.authorization.error'),
      });
    }
  };
};

/**
 * Middleware to require any of the specified permissions
 * Super Admin bypasses all permission checks
 * 
 * @param section - Section name
 * @param actions - Array of action names (user needs at least one)
 */
export const requireAnyPermission = (section: Section, actions: Action[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: t('auth.authorization.unauthorized'),
        });
        return;
      }

      // Super Admin bypass
      const isSuper = await isSuperAdmin(req.user.id);
      if (isSuper) {
        next();
        return;
      }

      // Check if user has any of the required permissions
      let hasAnyPerm = false;
      for (const action of actions) {
        const hasPerm = await checkPermission(req.user.id, section, action);
        if (hasPerm) {
          hasAnyPerm = true;
          break;
        }
      }

      if (!hasAnyPerm) {
        logger.warn('Permission denied - none of the required actions granted', {
          userId: req.user.id,
          section,
          actions,
        });
        res.status(403).json({
          success: false,
          message: t('auth.authorization.forbidden'),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error in requireAnyPermission middleware:', {
        userId: req.user?.id,
        section,
        actions,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({
        success: false,
        message: t('auth.authorization.error'),
      });
    }
  };
};

/**
 * Middleware to require all of the specified permissions
 * Super Admin bypasses all permission checks
 * 
 * @param section - Section name
 * @param actions - Array of action names (user needs all)
 */
export const requireAllPermissions = (section: Section, actions: Action[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: t('auth.authorization.unauthorized'),
        });
        return;
      }

      // Super Admin bypass
      const isSuper = await isSuperAdmin(req.user.id);
      if (isSuper) {
        next();
        return;
      }

      // Check if user has all required permissions
      for (const action of actions) {
        const hasPerm = await checkPermission(req.user.id, section, action);
        if (!hasPerm) {
          logger.warn('Permission denied - missing required action', {
            userId: req.user.id,
            section,
            action,
            requiredActions: actions,
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
      logger.error('Error in requireAllPermissions middleware:', {
        userId: req.user?.id,
        section,
        actions,
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({
        success: false,
        message: t('auth.authorization.error'),
      });
    }
  };
};
