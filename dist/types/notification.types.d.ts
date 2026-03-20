export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationChannel = 'sms' | 'email' | 'whatsapp' | 'push';
export interface BaseNotification {
    id?: string;
    channel: NotificationChannel;
    priority: NotificationPriority;
    metadata?: Record<string, unknown>;
    retryCount?: number;
    maxRetries?: number;
}
export interface SmsNotification extends BaseNotification {
    channel: 'sms';
    to: string;
    body: string;
}
export interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}
export interface EmailNotification extends BaseNotification {
    channel: 'email';
    to: string;
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    templateVariables?: Record<string, unknown>;
    attachments?: EmailAttachment[];
}
/** Meta WhatsApp template name (approved in Business Manager) */
export type WhatsAppTemplateName = 'payment_request' | 'payment_reminder' | 'booking_cancelled' | 'user_payment_verified' | 'booking_rejected';
export interface WhatsAppNotification extends BaseNotification {
    channel: 'whatsapp';
    to: string;
    /** Plain text message (use when template is not set) */
    body?: string;
    /** Meta template message (use when body is not set) */
    template?: {
        name: WhatsAppTemplateName;
        params: Record<string, string>;
    };
}
export interface PushNotification extends BaseNotification {
    channel: 'push';
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    fcmToken?: string;
}
export type Notification = SmsNotification | EmailNotification | WhatsAppNotification | PushNotification;
export interface NotificationResult {
    success: boolean;
    channel: NotificationChannel;
    messageId?: string;
    error?: string;
    retryable?: boolean;
}
//# sourceMappingURL=notification.types.d.ts.map