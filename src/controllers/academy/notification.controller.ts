import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as notificationService from '../../services/common/notification.service';
import { t } from '../../utils/i18n';

/**
 * Get notifications for academy
 */
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

    const result = await notificationService.getNotifications(
      'academy',
      req.user.id,
      page,
      limit,
      isRead
    );

    // Remove roles, priority, and channels from notifications
    const filteredNotifications = result.notifications.map((notification: any) => {
      const { roles, priority, channels, ...rest } = notification;
      return rest;
    });

    const filteredResult = {
      ...result,
      notifications: filteredNotifications,
    };

    const response = new ApiResponse(200, filteredResult, t('notification.list.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread count for academy
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

    const count = await notificationService.getUnreadCount('academy', req.user.id);

    const response = new ApiResponse(200, { count }, t('notification.unreadCount.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
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

    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, 'academy', req.user.id);

    // Remove roles, priority, and channels from notification
    const { roles, priority, channels, ...filteredNotification } = notification as any;

    const response = new ApiResponse(200, filteredNotification, t('notification.markRead.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as unread
 */
export const markAsUnread = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { id } = req.params;

    const notification = await notificationService.markAsUnread(id, 'academy', req.user.id);

    // Remove roles, priority, and channels from notification
    const { roles, priority, channels, ...filteredNotification } = notification as any;

    const response = new ApiResponse(200, filteredNotification, t('notification.markUnread.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const result = await notificationService.markAllAsRead('academy', req.user.id);

    const response = new ApiResponse(200, result, t('notification.markAllRead.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { id } = req.params;

    await notificationService.deleteNotification(id, 'academy', req.user.id);

    const response = new ApiResponse(200, null, t('notification.delete.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

