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
 * Supports both MongoDB ObjectId and custom UUID string
 */
const getRecipientObjectId = async (
  recipientType: NotificationRecipientType,
  recipientId: string
): Promise<Types.ObjectId | null> => {
  try {
    if (recipientType === 'user') {
      // Check if recipientId is a valid MongoDB ObjectId (24 hex characters)
      if (Types.ObjectId.isValid(recipientId) && recipientId.length === 24) {
        // Try to find user by MongoDB _id first
        const user = await UserModel.findOne({ _id: new Types.ObjectId(recipientId), isDeleted: false })
          .select('_id')
          .lean();
        if (user) {
          return user._id as Types.ObjectId;
        }
      }
      
      // If not found by _id or not a valid ObjectId, treat as custom UUID and use getUserObjectId
      return await getUserObjectId(recipientId);
    } else {
      // For academy, we can receive either:
      // 1. A user ID (most common case - when academy user requests their notifications)
      // 2. An academy ID (less common - when sending to specific academy)
      
      // First, try to find User by custom ID or ObjectId (most common case)
      let userObjectId: Types.ObjectId | null = null;
      
      // Check if recipientId is a valid MongoDB ObjectId
      if (Types.ObjectId.isValid(recipientId) && recipientId.length === 24) {
        // Try to find user by MongoDB _id
        const user = await UserModel.findOne({ _id: new Types.ObjectId(recipientId), isDeleted: false })
          .select('_id')
          .lean();
        if (user) {
          userObjectId = user._id as Types.ObjectId;
        }
      }
      
      // If not found by _id, try custom UUID using getUserObjectId (more robust with caching)
      if (!userObjectId) {
        userObjectId = await getUserObjectId(recipientId);
      }
      
      // If we found a user, verify they own at least one academy
      if (userObjectId) {
        const userAcademies = await CoachingCenterModel.findOne({
          user: userObjectId,
          is_deleted: false
        }).select('_id').lean();
        
        if (userAcademies) {
          return userObjectId;
        }
      }
      
      // If not found as User, try to find CoachingCenter by custom ID (UUID)
      // This handles the case where someone passes an academy ID directly
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
 * Get notifications by user roles (for role-based notifications) and optionally user-based notifications
 */
export const getNotificationsByRoles = async (
  userRoles: string[], // Array of role names
  page: number = 1,
  limit: number = 10,
  isRead?: boolean,
  userId?: string // Optional user ID to also include user-based notifications
): Promise<PaginatedNotificationsResult> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Build query for role-based notifications
    const roleQuery: any = {
      recipientType: 'role',
      roles: { $in: userRoles || [] }, // Match if any of the user's roles are in the notification's roles array
    };

    // Build query for user-based notifications (if userId provided)
    let userQuery: any = null;
    if (userId) {
      const recipientObjectId = await getRecipientObjectId('user', userId);
      if (recipientObjectId) {
        userQuery = {
          recipientType: 'user',
          recipientId: recipientObjectId,
        };
      }
    }

    // Combine queries using $or if both exist, otherwise use the single query
    const baseQuery: any = userQuery
      ? { $or: [roleQuery, userQuery] }
      : roleQuery;

    if (isRead !== undefined) {
      if (baseQuery.$or) {
        // Apply isRead filter to both parts of the $or query
        baseQuery.$or = baseQuery.$or.map((q: any) => ({ ...q, isRead }));
      } else {
        baseQuery.isRead = isRead;
      }
    }

    // Build unread query (always filter for unread notifications)
    let unreadQuery: any;
    if (baseQuery.$or) {
      unreadQuery = {
        $or: baseQuery.$or.map((q: any) => ({ ...q, isRead: false })),
      };
    } else {
      unreadQuery = { ...baseQuery, isRead: false };
    }

    // Get total count and unread count
    const [total, unreadCount, notifications] = await Promise.all([
      NotificationModel.countDocuments(baseQuery),
      NotificationModel.countDocuments(unreadQuery),
      NotificationModel.find(baseQuery)
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
 * Get unread count by user roles and optionally user-based notifications
 */
export const getUnreadCountByRoles = async (
  userRoles: string[],
  userId?: string // Optional user ID to also include user-based notifications
): Promise<number> => {
  try {
    // Build query for role-based notifications
    const roleQuery: any = {
      recipientType: 'role',
      roles: { $in: userRoles || [] },
      isRead: false,
    };

    // Build query for user-based notifications (if userId provided)
    let userQuery: any = null;
    if (userId) {
      const recipientObjectId = await getRecipientObjectId('user', userId);
      if (recipientObjectId) {
        userQuery = {
          recipientType: 'user',
          recipientId: recipientObjectId,
          isRead: false,
        };
      }
    }

    // Combine queries using $or if both exist, otherwise use the single query
    const query = userQuery
      ? { $or: [roleQuery, userQuery] }
      : roleQuery;

    return await NotificationModel.countDocuments(query);
  } catch (error) {
    logger.error('Failed to get unread count by roles:', error);
    return 0;
  }
};

/**
 * Mark notification as read by notification ID and user roles (or user ID for user-based notifications)
 */
export const markAsReadByRoles = async (
  notificationId: string,
  userRoles: string[],
  userId?: string
): Promise<Notification> => {
  try {
    // First, find the notification by ID (try both id field and _id)
    let notification = await NotificationModel.findOne({
      id: notificationId,
    });

    // If not found by id field, try by _id (MongoDB ObjectId)
    if (!notification && Types.ObjectId.isValid(notificationId)) {
      try {
        notification = await NotificationModel.findById(new Types.ObjectId(notificationId));
      } catch (error) {
        // Invalid ObjectId format, continue
        logger.debug('Notification ID is not a valid ObjectId', { notificationId });
      }
    }

    if (!notification) {
      logger.warn('Notification not found', {
        notificationId,
        userRoles,
        userId,
        triedById: true,
        triedByObjectId: Types.ObjectId.isValid(notificationId),
      });
      throw new ApiError(404, t('notification.notFound'));
    }

    // Check if it's a role-based notification
    if (notification.recipientType === 'role') {
      if (!userRoles || userRoles.length === 0) {
        logger.warn('User has no roles to match notification', {
          notificationId,
          notificationRoles: notification.roles,
        });
        throw new ApiError(404, t('notification.notFound'));
      }

      // Verify the notification is for one of the user's roles
      const hasMatchingRole = notification.roles?.some(role => userRoles.includes(role));
      if (!hasMatchingRole) {
        logger.warn('User roles do not match notification roles', {
          notificationId,
          userRoles,
          notificationRoles: notification.roles,
        });
        throw new ApiError(404, t('notification.notFound'));
      }
    } else if (notification.recipientType === 'user') {
      // For user-based notifications, verify it's for this user
      if (!userId) {
        logger.warn('User ID not provided for user-based notification', {
          notificationId,
          recipientId: notification.recipientId,
        });
        throw new ApiError(404, t('notification.notFound'));
      }

      const recipientObjectId = await getRecipientObjectId('user', userId);
      if (!recipientObjectId || !notification.recipientId?.equals(recipientObjectId)) {
        logger.warn('User ID does not match notification recipient', {
          notificationId,
          userId,
          recipientObjectId,
          notificationRecipientId: notification.recipientId,
        });
        throw new ApiError(404, t('notification.notFound'));
      }
    } else {
      // Academy or other recipient types not supported for admin
      logger.warn('Notification recipient type not supported for admin', {
        notificationId,
        recipientType: notification.recipientType,
      });
      throw new ApiError(404, t('notification.notFound'));
    }

    // Mark as read if not already read
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

