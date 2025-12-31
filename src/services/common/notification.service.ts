import { Types } from 'mongoose';
import { NotificationModel, Notification, NotificationRecipientType } from '../../models/notification.model';
import { NotificationChannel, NotificationPriority } from '../../types/notification.types';
import { UserModel } from '../../models/user.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { getUserObjectId } from '../../utils/userCache';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { config } from '../../config/env';
import { queueMultiChannel } from './notificationQueue.service';

export interface CreateNotificationInput {
  recipientType: NotificationRecipientType;
  recipientId?: string; // User ID or Academy ID (custom string ID) - optional when recipientType is 'role'
  roles?: string[]; // Array of role names (for role-based notifications) - required when recipientType is 'role'
  title: string;
  body: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedNotificationsResult {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  unreadCount: number;
}

/**
 * Get recipient ObjectId based on recipient type and custom ID
 */
const getRecipientObjectId = async (
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<Types.ObjectId | null> => {
  try {
    if (recipientType === 'user') {
      return await getUserObjectId(recipientId);
    } else {
      // For academy, find by custom ID
      const center = await CoachingCenterModel.findOne({ id: recipientId, is_deleted: false })
        .select('_id user')
        .lean();
      if (center) {
        // Return the user ObjectId who owns the academy
        return center.user as Types.ObjectId;
      }
      return null;
    }
  } catch (error) {
    logger.error('Failed to get recipient ObjectId:', error);
    return null;
  }
};

/**
 * Get user details for sending notifications
 */
const getUserDetails = async (recipientObjectId: Types.ObjectId): Promise<{
  email?: string;
  mobile?: string;
  userId: string;
} | null> => {
  try {
    const user = await UserModel.findById(recipientObjectId)
      .select('id email mobile')
      .lean();
    
    if (!user) return null;
    
    return {
      email: user.email,
      mobile: user.mobile || undefined,
      userId: user.id,
    };
  } catch (error) {
    logger.error('Failed to get user details:', error);
    return null;
  }
};

/**
 * Create and send notification
 */
export const createAndSendNotification = async (
  input: CreateNotificationInput
): Promise<Notification> => {
  try {
    // Validate input based on recipientType
    if (input.recipientType === 'role') {
      if (!input.roles || input.roles.length === 0) {
        throw new ApiError(400, 'Roles are required when recipientType is "role"');
      }
    } else {
      if (!input.recipientId) {
        throw new ApiError(400, 'RecipientId is required when recipientType is not "role"');
      }
    }

    let recipientObjectId: Types.ObjectId | null = null;
    let recipientTypeRef: string | undefined = undefined;

    // Get recipient ObjectId only if not role-based
    if (input.recipientType !== 'role') {
      recipientObjectId = await getRecipientObjectId(input.recipientType, input.recipientId!);
      if (!recipientObjectId) {
        throw new ApiError(404, t('notification.recipientNotFound'));
      }

      // recipientTypeRef is always 'User' since we store the user ObjectId
      // (for academy, we store the academy owner's user ObjectId)
      recipientTypeRef = 'User';
    }

    // Create notification in database
    const notificationData: any = {
      recipientType: input.recipientType,
      title: input.title,
      body: input.body,
      channels: input.channels || ['push'],
      priority: input.priority || 'medium',
      data: input.data || null,
      imageUrl: input.imageUrl || null,
      metadata: input.metadata || null,
      isRead: false,
      sent: false,
    };

    if (input.recipientType === 'role') {
      notificationData.roles = input.roles;
    } else {
      notificationData.recipientId = recipientObjectId;
      notificationData.recipientTypeRef = recipientTypeRef;
    }

    const notification = new NotificationModel(notificationData);
    await notification.save();

    // For role-based notifications, we don't send immediately to specific users
    // Instead, users will fetch notifications based on their roles
    if (input.recipientType === 'role') {
      // Mark as sent (it's available for users with matching roles to fetch)
      notification.sent = true;
      notification.sentAt = new Date();
      await notification.save();
      return notification.toObject();
    }

    // Get user details for sending (only for user/academy notifications)
    const userDetails = await getUserDetails(recipientObjectId!);
    if (!userDetails) {
      notification.error = 'User details not found';
      await notification.save();
      throw new ApiError(404, t('notification.userDetailsNotFound'));
    }

    // Send notifications through specified channels
    const channels = input.channels || ['push'];
    const channelData: any = {
      push: {
        userId: userDetails.userId,
        title: input.title,
        body: input.body,
        data: input.data ? Object.fromEntries(
          Object.entries(input.data).map(([k, v]) => [k, String(v)])
        ) : undefined,
        imageUrl: input.imageUrl,
      },
    };

    // Add SMS if mobile is available
    if (channels.includes('sms') && userDetails.mobile) {
      channelData.sms = {
        to: userDetails.mobile,
        body: input.body,
      };
    }

    // Add Email if email is available
    if (channels.includes('email') && userDetails.email) {
      channelData.email = {
        to: userDetails.email,
        subject: input.title,
        html: `<p>${input.body}</p>`,
        text: input.body,
      };
    }

    // Add WhatsApp if mobile is available
    if (channels.includes('whatsapp') && userDetails.mobile) {
      channelData.whatsapp = {
        to: userDetails.mobile,
        body: input.body,
      };
    }

    // Queue notifications
    try {
      queueMultiChannel(
        channels,
        channelData,
        input.priority || 'medium',
        {
          notificationId: notification.id,
          recipientType: input.recipientType,
          recipientId: input.recipientId,
          ...input.metadata,
        }
      );

      // Mark as sent (queued successfully)
      notification.sent = true;
      notification.sentAt = new Date();
      await notification.save();
    } catch (sendError) {
      logger.error('Failed to queue notification:', sendError);
      notification.error = sendError instanceof Error ? sendError.message : 'Failed to queue notification';
      await notification.save();
    }

    return notification.toObject();
  } catch (error) {
    logger.error('Failed to create and send notification:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.create.failed'));
  }
};

/**
 * Get notifications for a recipient
 */
export const getNotifications = async (
  recipientType: NotificationRecipientType,
  recipientId: string,
  page: number = 1,
  limit: number = 10,
  isRead?: boolean
): Promise<PaginatedNotificationsResult> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Get recipient ObjectId
    const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
    if (!recipientObjectId) {
      throw new ApiError(404, t('notification.recipientNotFound'));
    }

    // Build query
    const query: any = {
      recipientType,
      recipientId: recipientObjectId,
    };

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    // Get total count and unread count
    const [total, unreadCount, notifications] = await Promise.all([
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({
        ...query,
        isRead: false,
      }),
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      notifications: notifications as Notification[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      unreadCount,
    };
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.list.failed'));
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (
  notificationId: string,
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<Notification> => {
  try {
    const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
    if (!recipientObjectId) {
      throw new ApiError(404, t('notification.recipientNotFound'));
    }

    const notification = await NotificationModel.findOne({
      id: notificationId,
      recipientType,
      recipientId: recipientObjectId,
    });

    if (!notification) {
      throw new ApiError(404, t('notification.notFound'));
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification.toObject();
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.markRead.failed'));
  }
};

/**
 * Mark notification as unread
 */
export const markAsUnread = async (
  notificationId: string,
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<Notification> => {
  try {
    const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
    if (!recipientObjectId) {
      throw new ApiError(404, t('notification.recipientNotFound'));
    }

    const notification = await NotificationModel.findOne({
      id: notificationId,
      recipientType,
      recipientId: recipientObjectId,
    });

    if (!notification) {
      throw new ApiError(404, t('notification.notFound'));
    }

    if (notification.isRead) {
      notification.isRead = false;
      notification.readAt = null;
      await notification.save();
    }

    return notification.toObject();
  } catch (error) {
    logger.error('Failed to mark notification as unread:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.markUnread.failed'));
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<{ count: number }> => {
  try {
    const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
    if (!recipientObjectId) {
      throw new ApiError(404, t('notification.recipientNotFound'));
    }

    const result = await NotificationModel.updateMany(
      {
        recipientType,
        recipientId: recipientObjectId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return { count: result.modifiedCount };
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.markAllRead.failed'));
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (
  notificationId: string,
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<void> => {
  try {
    const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
    if (!recipientObjectId) {
      throw new ApiError(404, t('notification.recipientNotFound'));
    }

    const notification = await NotificationModel.findOne({
      id: notificationId,
      recipientType,
      recipientId: recipientObjectId,
    });

    if (!notification) {
      throw new ApiError(404, t('notification.notFound'));
    }

    await NotificationModel.deleteOne({ _id: notification._id });
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.delete.failed'));
  }
};

/**
 * Get unread count
 */
export const getUnreadCount = async (
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<number> => {
  try {
    const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
    if (!recipientObjectId) {
      return 0;
    }

    return await NotificationModel.countDocuments({
      recipientType,
      recipientId: recipientObjectId,
      isRead: false,
    });
  } catch (error) {
    logger.error('Failed to get unread count:', error);
    return 0;
  }
};

/**
 * Get notifications by user roles (for role-based notifications)
 */
export const getNotificationsByRoles = async (
  userRoles: string[], // Array of role names
  page: number = 1,
  limit: number = 10,
  isRead?: boolean
): Promise<PaginatedNotificationsResult> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    if (!userRoles || userRoles.length === 0) {
      return {
        notifications: [],
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        unreadCount: 0,
      };
    }

    // Build query for role-based notifications
    const query: any = {
      recipientType: 'role',
      roles: { $in: userRoles }, // Match if any of the user's roles are in the notification's roles array
    };

    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    // Get total count and unread count
    const [total, unreadCount, notifications] = await Promise.all([
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({
        ...query,
        isRead: false,
      }),
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      notifications: notifications as Notification[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      unreadCount,
    };
  } catch (error) {
    logger.error('Failed to get notifications by roles:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.list.failed'));
  }
};

/**
 * Get unread count by user roles
 */
export const getUnreadCountByRoles = async (userRoles: string[]): Promise<number> => {
  try {
    if (!userRoles || userRoles.length === 0) {
      return 0;
    }

    return await NotificationModel.countDocuments({
      recipientType: 'role',
      roles: { $in: userRoles },
      isRead: false,
    });
  } catch (error) {
    logger.error('Failed to get unread count by roles:', error);
    return 0;
  }
};

/**
 * Mark notification as read by notification ID and user roles
 */
export const markAsReadByRoles = async (
  notificationId: string,
  userRoles: string[]
): Promise<Notification> => {
  try {
    if (!userRoles || userRoles.length === 0) {
      throw new ApiError(404, t('notification.notFound'));
    }

    const notification = await NotificationModel.findOne({
      id: notificationId,
      recipientType: 'role',
      roles: { $in: userRoles }, // Ensure the notification is for one of the user's roles
    });

    if (!notification) {
      throw new ApiError(404, t('notification.notFound'));
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification.toObject();
  } catch (error) {
    logger.error('Failed to mark notification as read by roles:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('notification.markRead.failed'));
  }
};

