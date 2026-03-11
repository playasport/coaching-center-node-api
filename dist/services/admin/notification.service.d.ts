import { Types } from 'mongoose';
import { NotificationRecipientType } from '../../models/notification.model';
import { NotificationChannel, NotificationPriority } from '../../types/notification.types';
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
export declare const getAllNotifications: (params?: GetAdminNotificationsParams) => Promise<AdminPaginatedNotificationsResult>;
//# sourceMappingURL=notification.service.d.ts.map