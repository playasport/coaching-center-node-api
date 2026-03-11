import { Notification, NotificationRecipientType } from '../../models/notification.model';
import { NotificationChannel, NotificationPriority } from '../../types/notification.types';
export interface CreateNotificationInput {
    recipientType: NotificationRecipientType;
    recipientId?: string;
    roles?: string[];
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
 * Create and send notification
 */
export declare const createAndSendNotification: (input: CreateNotificationInput) => Promise<Notification>;
/**
 * Get notifications for a recipient
 */
export declare const getNotifications: (recipientType: NotificationRecipientType, recipientId: string, page?: number, limit?: number, isRead?: boolean) => Promise<PaginatedNotificationsResult>;
/**
 * Mark notification as read
 */
export declare const markAsRead: (notificationId: string, recipientType: NotificationRecipientType, recipientId: string) => Promise<Notification>;
/**
 * Mark notification as unread
 */
export declare const markAsUnread: (notificationId: string, recipientType: NotificationRecipientType, recipientId: string) => Promise<Notification>;
/**
 * Mark all notifications as read
 */
export declare const markAllAsRead: (recipientType: NotificationRecipientType, recipientId: string) => Promise<{
    count: number;
}>;
/**
 * Delete notification
 */
export declare const deleteNotification: (notificationId: string, recipientType: NotificationRecipientType, recipientId: string) => Promise<void>;
/**
 * Get unread count
 */
export declare const getUnreadCount: (recipientType: NotificationRecipientType, recipientId: string) => Promise<number>;
/**
 * Get notifications by user roles (for role-based notifications) and optionally user-based notifications
 */
export declare const getNotificationsByRoles: (userRoles: string[], // Array of role names
page?: number, limit?: number, isRead?: boolean, userId?: string) => Promise<PaginatedNotificationsResult>;
/**
 * Get unread count by user roles and optionally user-based notifications
 */
export declare const getUnreadCountByRoles: (userRoles: string[], userId?: string) => Promise<number>;
/**
 * Mark notification as read by notification ID and user roles (or user ID for user-based notifications)
 */
export declare const markAsReadByRoles: (notificationId: string, userRoles: string[], userId?: string) => Promise<Notification>;
//# sourceMappingURL=notification.service.d.ts.map