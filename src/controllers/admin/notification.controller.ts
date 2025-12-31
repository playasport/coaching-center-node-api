import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as notificationService from '../../services/common/notification.service';
import * as adminNotificationService from '../../services/admin/notification.service';
import { SendNotificationInput, TestNotificationInput } from '../../validations/notification.validation';
import { NotificationChannel } from '../../types/notification.types';
import { t } from '../../utils/i18n';
import { UserModel } from '../../models/user.model';

/**
 * Send notification from admin panel
 */
export const sendNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const input: SendNotificationInput = req.body;

    // Auto-populate metadata with admin information
    const metadata = {
      source: 'admin_panel',
      adminId: req.user.id,
      ...(input.metadata || {}), // Merge with any metadata provided in request
    };

    const notification = await notificationService.createAndSendNotification({
      ...input,
      imageUrl: input.imageUrl ?? undefined, // Convert null to undefined
      metadata,
    });

    const response = new ApiResponse(201, notification, t('notification.send.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Test notification (sends a test notification)
 */
export const testNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const input: TestNotificationInput = req.body;

    // Auto-populate metadata with admin information
    const metadata = {
      source: 'admin_panel',
      adminId: req.user.id,
    };

    const testNotificationData: notificationService.CreateNotificationInput = {
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      title: 'Test Notification',
      body: 'This is a test notification sent from the admin panel.',
      channels: input.channels || ['push'],
      priority: 'medium',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      metadata,
    };

    const notification = await notificationService.createAndSendNotification(testNotificationData);

    const response = new ApiResponse(201, notification, 'Test notification sent successfully');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all notifications for admin
 */
export const getAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const {
      recipientType,
      recipientId,
      channels,
      priority,
      sent,
      isRead,
      search,
      sortBy,
      sortOrder,
    } = req.query;

    const params: adminNotificationService.GetAdminNotificationsParams = {
      page,
      limit,
      recipientType: recipientType as any,
      recipientId: recipientId as string,
      channels: channels ? (Array.isArray(channels) ? channels as NotificationChannel[] : [channels as NotificationChannel]) : undefined,
      priority: priority as any,
      sent: sent === 'true' ? true : sent === 'false' ? false : undefined,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminNotificationService.getAllNotifications(params);

    const response = new ApiResponse(200, result, 'Notifications retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin's own notifications (by roles)
 */
export const getMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get user's roles from database
    const user = await UserModel.findOne({ id: req.user.id })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user) {
      throw new ApiError(404, t('user.notFound'));
    }

    // Extract role names from populated roles
    const userRoles = (user.roles || []) as any[];
    const roleNames = userRoles
      .map((r: any) => r?.name)
      .filter((name: string | undefined): name is string => !!name);

    if (roleNames.length === 0) {
      // If user has no roles, return empty result
      const response = new ApiResponse(
        200,
        {
          notifications: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          unreadCount: 0,
        },
        t('notification.list.success')
      );
      res.json(response);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

    // Get notifications by user's roles (and user-based notifications)
    const result = await notificationService.getNotificationsByRoles(
      roleNames,
      page,
      limit,
      isRead,
      req.user.id
    );

    const response = new ApiResponse(200, result, t('notification.list.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread count for admin (by roles)
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get user's roles from database
    const user = await UserModel.findOne({ id: req.user.id })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user) {
      throw new ApiError(404, t('user.notFound'));
    }

    // Extract role names from populated roles
    const userRoles = (user.roles || []) as any[];
    const roleNames = userRoles
      .map((r: any) => r?.name)
      .filter((name: string | undefined): name is string => !!name);

    if (roleNames.length === 0) {
      const response = new ApiResponse(200, { count: 0 }, t('notification.unreadCount.success'));
      res.json(response);
      return;
    }

    const count = await notificationService.getUnreadCountByRoles(roleNames, req.user.id);

    const response = new ApiResponse(200, { count }, t('notification.unreadCount.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read (admin - by roles)
 */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get user's roles from database
    const user = await UserModel.findOne({ id: req.user.id })
      .select('roles')
      .populate('roles', 'name')
      .lean();

    if (!user) {
      throw new ApiError(404, t('user.notFound'));
    }

    // Extract role names from populated roles
    const userRoles = (user.roles || []) as any[];
    const roleNames = userRoles
      .map((r: any) => r?.name)
      .filter((name: string | undefined): name is string => !!name);

    if (roleNames.length === 0) {
      throw new ApiError(404, t('notification.notFound'));
    }

    const { id } = req.params;

    const notification = await notificationService.markAsReadByRoles(id, roleNames, req.user.id);

    const response = new ApiResponse(200, notification, t('notification.markRead.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

