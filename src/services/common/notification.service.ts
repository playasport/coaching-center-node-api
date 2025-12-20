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
  recipientId: string; // User ID or Academy ID (custom string ID)
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
    // Get recipient ObjectId
    const recipientObjectId = await getRecipientObjectId(input.recipientType, input.recipientId);
    if (!recipientObjectId) {
      throw new ApiError(404, t('notification.recipientNotFound'));
    }

    // recipientTypeRef is always 'User' since we store the user ObjectId
    // (for academy, we store the academy owner's user ObjectId)
    const recipientTypeRef = 'User';

    // Create notification in database
    const notification = new NotificationModel({
      recipientType: input.recipientType,
      recipientId: recipientObjectId,
      recipientTypeRef,
      title: input.title,
      body: input.body,
      channels: input.channels || ['push'],
      priority: input.priority || 'medium',
      data: input.data || null,
      imageUrl: input.imageUrl || null,
      metadata: input.metadata || null,
      isRead: false,
      sent: false,
    });

    await notification.save();

    // Get user details for sending
    const userDetails = await getUserDetails(recipientObjectId);
    if (!userDetails) {
      notification.error = 'User details not found';
      await notification.save();
      throw new ApiError(404, t('notification.userDetailsNotFound'));
    }

    // Send notifications through specified channels
    const channels = input.channels || ['push'];
    const notificationData: any = {
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
      notificationData.sms = {
        to: userDetails.mobile,
        body: input.body,
      };
    }

    // Add Email if email is available
    if (channels.includes('email') && userDetails.email) {
      notificationData.email = {
        to: userDetails.email,
        subject: input.title,
        html: `<p>${input.body}</p>`,
        text: input.body,
      };
    }

    // Add WhatsApp if mobile is available
    if (channels.includes('whatsapp') && userDetails.mobile) {
      notificationData.whatsapp = {
        to: userDetails.mobile,
        body: input.body,
      };
    }

    // Queue notifications
    try {
      queueMultiChannel(
        channels,
        notificationData,
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

