import { Notification, NotificationPriority, NotificationChannel, NotificationResult, EmailAttachment } from '../../types/notification.types';
import type { WhatsAppTemplateName } from '../../types/notification.types';
export declare const queueNotification: (notification: Notification) => void;
export declare const queueSms: (to: string, body: string, priority?: NotificationPriority, metadata?: Record<string, unknown>) => void;
export declare const queueEmail: (to: string, subject: string, options?: {
    html?: string;
    text?: string;
    template?: string;
    templateVariables?: Record<string, unknown>;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
    attachments?: EmailAttachment[];
}) => void;
export declare const queueWhatsApp: (to: string, body: string, priority?: NotificationPriority, metadata?: Record<string, unknown>) => void;
/**
 * Queue a Meta WhatsApp template message.
 * Params: payment_request → userName, academyName, bookingId, paymentUrl, numberOfHours, buttonUrlParameter; payment_reminder → batchName, academyName, hoursLeft, bookingId, paymentLink, buttonUrlParameter; booking_cancelled → batchName, academyName, bookingId, cancelReason; user_payment_verified → userName, bookingId, batchName, sportName, centerName, participants, startDate, startTime, endTime, currency, amount; booking_rejected → batchName, centerName, bookingId, rejectionReason.
 */
export declare const queueWhatsAppTemplate: (to: string, templateName: WhatsAppTemplateName, params: Record<string, string>, priority?: NotificationPriority, metadata?: Record<string, unknown>) => void;
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
/**
 * Wait for notification queue to drain (for scripts that exit after queuing).
 * Polls until queue is empty and processing finished, or maxWaitMs reached.
 */
export declare const waitForQueueDrain: (maxWaitMs?: number) => Promise<void>;
export declare const getQueueStatus: () => {
    total: number;
    high: number;
    medium: number;
    low: number;
    isProcessing: boolean;
};
export type { Notification, NotificationPriority, NotificationChannel, NotificationResult };
//# sourceMappingURL=notificationQueue.service.d.ts.map