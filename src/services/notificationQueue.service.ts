import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import {
  Notification,
  NotificationPriority,
  NotificationChannel,
  NotificationResult,
  SmsNotification,
  EmailNotification,
  WhatsAppNotification,
  PushNotification,
} from '../types/notification.types';
import { getTwilioClient } from '../utils/twilio';
import { sendTemplatedEmail } from './email.service';
import { sendWhatsApp } from '../utils/whatsapp';
import { sendPushNotification, sendMulticastPushNotification } from '../utils/fcm';
import { deviceTokenService } from './deviceToken.service';

class PriorityQueue<T extends Notification> {
  private queues: Record<NotificationPriority, T[]> = {
    high: [],
    medium: [],
    low: [],
  };

  enqueue(item: T) {
    this.queues[item.priority].push(item);
  }

  dequeue(): T | undefined {
    if (this.queues.high.length) {
      return this.queues.high.shift();
    }
    if (this.queues.medium.length) {
      return this.queues.medium.shift();
    }
    return this.queues.low.shift();
  }

  isEmpty(): boolean {
    return (
      !this.queues.high.length && !this.queues.medium.length && !this.queues.low.length
    );
  }

  size(): number {
    return this.queues.high.length + this.queues.medium.length + this.queues.low.length;
  }
}

const notificationQueue = new PriorityQueue<Notification>();
let isProcessing = false;
const MAX_RETRIES = 3;
const DEFAULT_MAX_RETRIES = 3;

// Channel enablement checks
const isChannelEnabled = (channel: NotificationChannel): boolean => {
  if (!config.notification.enabled) {
    return false;
  }

  switch (channel) {
    case 'sms':
      return config.sms.enabled;
    case 'email':
      return config.email.enabled;
    case 'whatsapp':
      return config.notification.whatsapp.enabled && config.sms.enabled && !!config.twilio.accountSid; // WhatsApp uses Twilio
    case 'push':
      return config.notification.push.enabled; // Check push notification config
    default:
      return false;
  }
};

// Process SMS notification
const processSms = async (notification: SmsNotification): Promise<NotificationResult> => {
  if (!isChannelEnabled('sms')) {
    logger.info('SMS channel disabled. Notification skipped.', {
      to: notification.to,
      priority: notification.priority,
    });
    return {
      success: false,
      channel: 'sms',
      error: 'SMS channel disabled',
      retryable: false,
    };
  }

  const client = getTwilioClient();
  if (!client) {
    logger.info('SMS mocked send', notification);
    return {
      success: false,
      channel: 'sms',
      error: 'Twilio client not available',
      retryable: false,
    };
  }

  try {
    const message = await client.messages.create({
      body: notification.body,
      from: config.twilio.fromPhone,
      to: notification.to,
    });

    logger.info('SMS sent successfully', {
      messageId: message.sid,
      to: notification.to,
      priority: notification.priority,
    });

    return {
      success: true,
      channel: 'sms',
      messageId: message.sid,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('SMS delivery failed', {
      error: errorMessage,
      to: notification.to,
      priority: notification.priority,
    });

    const retryable = !errorMessage.includes('invalid') && !errorMessage.includes('unsubscribed');

    return {
      success: false,
      channel: 'sms',
      error: errorMessage,
      retryable,
    };
  }
};

// Process Email notification
const processEmail = async (notification: EmailNotification): Promise<NotificationResult> => {
  if (!isChannelEnabled('email')) {
    logger.info('Email channel disabled. Notification skipped.', {
      to: notification.to,
      priority: notification.priority,
    });
    return {
      success: false,
      channel: 'email',
      error: 'Email channel disabled',
      retryable: false,
    };
  }

  try {
    await sendTemplatedEmail({
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
      template: notification.template,
      variables: notification.templateVariables,
    });

    logger.info('Email sent successfully', {
      to: notification.to,
      subject: notification.subject,
      priority: notification.priority,
    });

    return {
      success: true,
      channel: 'email',
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Email delivery failed', {
      error: errorMessage,
      to: notification.to,
      priority: notification.priority,
    });

    return {
      success: false,
      channel: 'email',
      error: errorMessage,
      retryable: true, // Email failures are usually retryable
    };
  }
};

// Process WhatsApp notification
const processWhatsApp = async (notification: WhatsAppNotification): Promise<NotificationResult> => {
  if (!isChannelEnabled('whatsapp')) {
    logger.info('WhatsApp channel disabled. Notification skipped.', {
      to: notification.to,
      priority: notification.priority,
    });
    return {
      success: false,
      channel: 'whatsapp',
      error: 'WhatsApp channel disabled',
      retryable: false,
    };
  }

  const result = await sendWhatsApp({
    to: notification.to,
    body: notification.body,
  });

  if (result.success) {
    logger.info('WhatsApp sent successfully', {
      messageId: result.messageId,
      to: notification.to,
      priority: notification.priority,
    });
  }

  return {
    success: result.success,
    channel: 'whatsapp',
    messageId: result.messageId,
    error: result.error,
    retryable: result.retryable ?? true, // Default to retryable if not specified
  };
};

// Process Push notification
const processPush = async (notification: PushNotification): Promise<NotificationResult> => {
  try {
    // If specific FCM token is provided, send to that token only
    if (notification.fcmToken) {
      const result = await sendPushNotification({
        token: notification.fcmToken,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        imageUrl: notification.imageUrl,
      });

      return {
        success: result.success,
        channel: 'push',
        messageId: result.messageId,
        error: result.error,
        retryable: result.retryable,
      };
    }

    // Otherwise, get all active device tokens for the user
    const deviceTokens = await deviceTokenService.getUserDeviceTokens(notification.userId);
    const fcmTokens = deviceTokens
      .map((device) => device.fcmToken)
      .filter((token): token is string => !!token);

    if (fcmTokens.length === 0) {
      logger.warn('No active device tokens found for user', {
        userId: notification.userId,
      });
      return {
        success: false,
        channel: 'push',
        error: 'No active device tokens found',
        retryable: false,
      };
    }

    // Send multicast notification
    const result = await sendMulticastPushNotification(
      fcmTokens,
      notification.title,
      notification.body,
      notification.data,
      notification.imageUrl
    );

    logger.info('Push notification sent', {
      userId: notification.userId,
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalTokens: fcmTokens.length,
      priority: notification.priority,
    });

    // Consider successful if at least one token succeeded
    const success = result.successCount > 0;
    const hasFailures = result.failureCount > 0;
    
    return {
      success,
      channel: 'push',
      error: hasFailures ? `${result.failureCount} of ${fcmTokens.length} tokens failed` : undefined,
      retryable: hasFailures && result.successCount === 0, // Only retry if all failed
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Push notification delivery failed', {
      error: errorMessage,
      userId: notification.userId,
      priority: notification.priority,
    });

    return {
      success: false,
      channel: 'push',
      error: errorMessage,
      retryable: true,
    };
  }
};

// Route notification to appropriate processor
const processNotification = async (notification: Notification): Promise<NotificationResult> => {
  switch (notification.channel) {
    case 'sms':
      return processSms(notification);
    case 'email':
      return processEmail(notification);
    case 'whatsapp':
      return processWhatsApp(notification);
    case 'push':
      return processPush(notification);
    default: {
      const channel = (notification as Notification).channel;
      return {
        success: false,
        channel: channel as NotificationChannel,
        error: `Unknown channel: ${channel}`,
        retryable: false,
      };
    }
  }
};

// Main queue processor
const processQueue = async (): Promise<void> => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  while (!notificationQueue.isEmpty()) {
    const notification = notificationQueue.dequeue();
    if (!notification) {
      continue;
    }

    const retryCount = notification.retryCount || 0;
    const maxRetries = notification.maxRetries ?? DEFAULT_MAX_RETRIES;

    try {
      const result = await processNotification(notification);

      if (!result.success && result.retryable && retryCount < maxRetries) {
        // Retry the notification
        const retryNotification: Notification = {
          ...notification,
          retryCount: retryCount + 1,
        };
        notificationQueue.enqueue(retryNotification);
        logger.info('Notification queued for retry', {
          channel: notification.channel,
          priority: notification.priority,
          retryCount: retryCount + 1,
          maxRetries,
        });
      } else if (!result.success) {
        logger.error('Notification failed permanently', {
          channel: notification.channel,
          priority: notification.priority,
          retryCount,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Unexpected error processing notification', {
        channel: notification.channel,
        priority: notification.priority,
        error,
      });

      // Retry on unexpected errors if under max retries
      if (retryCount < maxRetries) {
        const retryNotification: Notification = {
          ...notification,
          retryCount: retryCount + 1,
        };
        notificationQueue.enqueue(retryNotification);
      }
    }
  }

  isProcessing = false;
};

// Public API
export const queueNotification = (notification: Notification): void => {
  const notificationWithId: Notification = {
    ...notification,
    id: notification.id || uuidv4(),
    retryCount: notification.retryCount || 0,
    maxRetries: notification.maxRetries ?? MAX_RETRIES,
  };

  notificationQueue.enqueue(notificationWithId);
  processQueue().catch((error) => logger.error('Notification queue processing error', error));
};

// Convenience methods for each channel
export const queueSms = (
  to: string,
  body: string,
  priority: NotificationPriority = 'medium',
  metadata?: Record<string, unknown>
): void => {
  queueNotification({
    channel: 'sms',
    to,
    body,
    priority,
    metadata,
  });
};

export const queueEmail = (
  to: string,
  subject: string,
  options: {
    html?: string;
    text?: string;
    template?: string;
    templateVariables?: Record<string, unknown>;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
  } = {}
): void => {
  queueNotification({
    channel: 'email',
    to,
    subject,
    html: options.html,
    text: options.text,
    template: options.template,
    templateVariables: options.templateVariables,
    priority: options.priority || 'medium',
    metadata: options.metadata,
  });
};

export const queueWhatsApp = (
  to: string,
  body: string,
  priority: NotificationPriority = 'medium',
  metadata?: Record<string, unknown>
): void => {
  queueNotification({
    channel: 'whatsapp',
    to,
    body,
    priority,
    metadata,
  });
};

export const queuePush = (
  userId: string,
  title: string,
  body: string,
  options: {
    data?: Record<string, string>;
    imageUrl?: string;
    fcmToken?: string;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
  } = {}
): void => {
  queueNotification({
    channel: 'push',
    userId,
    title,
    body,
    data: options.data,
    imageUrl: options.imageUrl,
    fcmToken: options.fcmToken,
    priority: options.priority || 'medium',
    metadata: options.metadata,
  });
};

// Queue multiple channels for the same notification
export const queueMultiChannel = (
  channels: NotificationChannel[],
  notification: {
    sms?: { to: string; body: string };
    email?: { to: string; subject: string; html?: string; text?: string; template?: string; templateVariables?: Record<string, unknown> };
    whatsapp?: { to: string; body: string };
    push?: { userId: string; title: string; body: string; data?: Record<string, string>; imageUrl?: string; fcmToken?: string };
  },
  priority: NotificationPriority = 'medium',
  metadata?: Record<string, unknown>
): void => {
  channels.forEach((channel) => {
    switch (channel) {
      case 'sms':
        if (notification.sms) {
          queueSms(notification.sms.to, notification.sms.body, priority, metadata);
        }
        break;
      case 'email':
        if (notification.email) {
          queueEmail(notification.email.to, notification.email.subject, {
            html: notification.email.html,
            text: notification.email.text,
            template: notification.email.template,
            templateVariables: notification.email.templateVariables,
            priority,
            metadata,
          });
        }
        break;
      case 'whatsapp':
        if (notification.whatsapp) {
          queueWhatsApp(notification.whatsapp.to, notification.whatsapp.body, priority, metadata);
        }
        break;
      case 'push':
        if (notification.push) {
          queuePush(notification.push.userId, notification.push.title, notification.push.body, {
            data: notification.push.data,
            imageUrl: notification.push.imageUrl,
            fcmToken: notification.push.fcmToken,
            priority,
            metadata,
          });
        }
        break;
    }
  });
};

// Get queue status
export const getQueueStatus = (): {
  total: number;
  high: number;
  medium: number;
  low: number;
  isProcessing: boolean;
} => {
  return {
    total: notificationQueue.size(),
    high: notificationQueue['queues'].high.length,
    medium: notificationQueue['queues'].medium.length,
    low: notificationQueue['queues'].low.length,
    isProcessing,
  };
};

// Export types for use in other modules
export type { Notification, NotificationPriority, NotificationChannel, NotificationResult };
