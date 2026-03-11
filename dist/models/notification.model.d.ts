import { HydratedDocument, Types } from 'mongoose';
import { NotificationChannel, NotificationPriority } from '../types/notification.types';
export type NotificationRecipientType = 'user' | 'academy' | 'role';
export interface Notification {
    id: string;
    recipientType: NotificationRecipientType;
    recipientId?: Types.ObjectId;
    recipientTypeRef?: string;
    roles?: string[];
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
export type NotificationDocument = HydratedDocument<Notification>;
export declare const NotificationModel: import("mongoose").Model<Notification, {}, {}, {}, import("mongoose").Document<unknown, {}, Notification, {}, {}> & Notification & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=notification.model.d.ts.map