import { Notification, NotificationPriority, NotificationChannel, NotificationResult } from '../types/notification.types';
export declare const queueNotification: (notification: Notification) => void;
export declare const queueSms: (to: string, body: string, priority?: NotificationPriority, metadata?: Record<string, unknown>) => void;
export declare const queueEmail: (to: string, subject: string, options?: {
    html?: string;
    text?: string;
    template?: string;
    templateVariables?: Record<string, unknown>;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
}) => void;
export declare const queueWhatsApp: (to: string, body: string, priority?: NotificationPriority, metadata?: Record<string, unknown>) => void;
export declare const queuePush: (userId: string, title: string, body: string, options?: {
    data?: Record<string, string>;
    imageUrl?: string;
    fcmToken?: string;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
}) => void;
export declare const queueMultiChannel: (channels: NotificationChannel[], notification: {
    sms?: {
        to: string;
        body: string;
    };
    email?: {
        to: string;
        subject: string;
        html?: string;
        text?: string;
        template?: string;
        templateVariables?: Record<string, unknown>;
    };
    whatsapp?: {
        to: string;
        body: string;
    };
    push?: {
        userId: string;
        title: string;
        body: string;
        data?: Record<string, string>;
        imageUrl?: string;
        fcmToken?: string;
    };
}, priority?: NotificationPriority, metadata?: Record<string, unknown>) => void;
export declare const getQueueStatus: () => {
    total: number;
    high: number;
    medium: number;
    low: number;
    isProcessing: boolean;
};
export type { Notification, NotificationPriority, NotificationChannel, NotificationResult };
//# sourceMappingURL=notificationQueue.service.d.ts.map