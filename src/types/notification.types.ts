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

export interface WhatsAppNotification extends BaseNotification {
  channel: 'whatsapp';
  to: string;
  body: string;
}

export interface PushNotification extends BaseNotification {
  channel: 'push';
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  fcmToken?: string; // Optional: if provided, send to specific token instead of all user tokens
}

export type Notification = SmsNotification | EmailNotification | WhatsAppNotification | PushNotification;

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}
