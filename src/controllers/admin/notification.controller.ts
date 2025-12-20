import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as notificationService from '../../services/common/notification.service';
import { SendNotificationInput, TestNotificationInput } from '../../validations/notification.validation';
import { t } from '../../utils/i18n';

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

