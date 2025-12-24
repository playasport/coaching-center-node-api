import { Types } from 'mongoose';
import { NotificationModel, NotificationRecipientType } from '../../models/notification.model';
import { NotificationChannel, NotificationPriority } from '../../types/notification.types';
import { getUserObjectId } from '../../utils/userCache';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { config } from '../../config/env';
import { UserModel } from '../../models/user.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';

export interface GetAdminNotificationsParams {
  page?: number;
  limit?: number;
  recipientType?: NotificationRecipientType;
  recipientId?: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  sent?: boolean;
  isRead?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminNotificationListItem {
  id: string;
  recipientType: NotificationRecipientType;
  recipientId: Types.ObjectId;
  recipient?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string | null;
    center_name?: string;
  };
  title: string;
  body: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  data?: Record<string, unknown>;
  imageUrl?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  sent: boolean;
  sentAt?: Date | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaginatedNotificationsResult {
  notifications: AdminNotificationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

/**
 * Get all notifications for admin with filters and pagination
 */
export const getAllNotifications = async (
  params: GetAdminNotificationsParams = {}
): Promise<AdminPaginatedNotificationsResult> => {
  try {
    const query: any = {};

    // Filter by recipient type if provided
    if (params.recipientType) {
      query.recipientType = params.recipientType;
    }

    // Filter by recipient ID if provided
    if (params.recipientId) {
      const recipientObjectId = await getUserObjectId(params.recipientId);
      if (recipientObjectId) {
        query.recipientId = recipientObjectId;
      } else {
        // If not found as user, return empty result
        return {
          notifications: [],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
          },
        };
      }
    }

    // Filter by channels if provided
    if (params.channels && params.channels.length > 0) {
      query.channels = { $in: params.channels };
    }

    // Filter by priority if provided
    if (params.priority) {
      query.priority = params.priority;
    }

    // Filter by sent status if provided
    if (params.sent !== undefined) {
      query.sent = params.sent;
    }

    // Filter by read status if provided
    if (params.isRead !== undefined) {
      query.isRead = params.isRead;
    }

    // Search by title or body
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { title: searchRegex },
        { body: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(config.pagination.maxLimit, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Execute query
    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .populate({
          path: 'recipientId',
          select: 'id firstName lastName email mobile',
          model: 'User',
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
    ]);

    // Transform notifications to include recipient info
    const transformedNotifications: AdminNotificationListItem[] = await Promise.all(
      notifications.map(async (notification: any) => {
        let recipient: AdminNotificationListItem['recipient'] | undefined;

        if (notification.recipientId) {
          if (notification.recipientType === 'user') {
            // User recipient
            const user = await UserModel.findById(notification.recipientId)
              .select('id firstName lastName email mobile')
              .lean();
            if (user) {
              recipient = {
                id: user.id,
                firstName: user.firstName || undefined,
                lastName: user.lastName || undefined,
                email: user.email || undefined,
                mobile: user.mobile ?? null,
              };
            }
          } else if (notification.recipientType === 'academy') {
            // Academy recipient - find the academy by the user ObjectId
            const center = await CoachingCenterModel.findOne({ user: notification.recipientId, is_deleted: false })
              .select('id center_name')
              .lean();
            if (center) {
              recipient = {
                id: center.id,
                center_name: center.center_name,
              };
            }
          }
        }

        return {
          id: notification.id,
          recipientType: notification.recipientType,
          recipientId: notification.recipientId,
          recipient,
          title: notification.title,
          body: notification.body,
          channels: notification.channels,
          priority: notification.priority,
          data: notification.data || undefined,
          imageUrl: notification.imageUrl || undefined,
          isRead: notification.isRead,
          readAt: notification.readAt || undefined,
          sent: notification.sent,
          sentAt: notification.sentAt || undefined,
          error: notification.error || undefined,
          metadata: notification.metadata || undefined,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      notifications: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      },
    };
  } catch (error) {
    logger.error('Failed to get notifications for admin', { params, error });
    throw new ApiError(500, 'Failed to get notifications');
  }
};

