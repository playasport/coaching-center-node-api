import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getApps } from 'firebase-admin/app';
import { getFirebaseAuth } from '../config/firebase';
import { logger } from './logger';

let messaging: Messaging | null = null;

export const getFCMClient = (): Messaging | null => {
  try {
    // Initialize Firebase Auth to ensure app is initialized
    getFirebaseAuth();

    if (!getApps().length) {
      logger.warn('Firebase app not initialized. FCM messaging unavailable.');
      return null;
    }

    if (!messaging) {
      messaging = getMessaging();
      logger.info('FCM messaging client initialized');
    }

    return messaging;
  } catch (error) {
    logger.error('Failed to initialize FCM messaging client', error);
    return null;
  }
};

export interface SendPushNotificationOptions {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export const sendPushNotification = async (
  options: SendPushNotificationOptions
): Promise<{ success: boolean; messageId?: string; error?: string; retryable?: boolean }> => {
  const client = getFCMClient();

  if (!client) {
    logger.info('FCM mocked send', options);
    return { success: false, error: 'FCM client not available' };
  }

  try {
    const message = {
      token: options.token,
      notification: {
        title: options.title,
        body: options.body,
        ...(options.imageUrl && { imageUrl: options.imageUrl }),
      },
      data: options.data || {},
      android: {
        priority: 'high' as const,
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
      },
    };

    const response = await client.send(message);
    logger.info('Push notification sent successfully', {
      messageId: response,
      token: options.token.substring(0, 20) + '...',
    });

    return { success: true, messageId: response };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Push notification delivery failed', {
      error: errorMessage,
      token: options.token.substring(0, 20) + '...',
    });

    // Check if token is invalid (should not retry)
    const isInvalidToken =
      error?.code === 'messaging/invalid-registration-token' ||
      error?.code === 'messaging/registration-token-not-registered';

    return {
      success: false,
      error: errorMessage,
      retryable: !isInvalidToken,
    };
  }
};

export interface MulticastPushResult {
  successCount: number;
  failureCount: number;
  responses: Array<{ token: string; success: boolean; messageId?: string; error?: string }>;
}

export const sendMulticastPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string
): Promise<MulticastPushResult> => {
  const client = getFCMClient();

  if (!client) {
    logger.info('FCM mocked multicast send', { tokenCount: tokens.length, title, body });
    return {
      successCount: 0,
      failureCount: tokens.length,
      responses: tokens.map((token) => ({
        token,
        success: false,
        error: 'FCM client not available',
      })),
    };
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  try {
    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: data || {},
      android: {
        priority: 'high' as const,
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
      },
    };

    const response = await client.sendEachForMulticast({
      tokens,
      ...message,
    });

    const responses = tokens.map((token, index) => {
      if (index < response.responses.length) {
        const resp = response.responses[index];
        if (resp.success) {
          return {
            token,
            success: true,
            messageId: resp.messageId,
          };
        } else {
          return {
            token,
            success: false,
            error: resp.error?.message || 'Unknown error',
          };
        }
      }
      return {
        token,
        success: false,
        error: 'No response received',
      };
    });

    logger.info('Multicast push notification sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalCount: tokens.length,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Multicast push notification delivery failed', {
      error: errorMessage,
      tokenCount: tokens.length,
    });

    return {
      successCount: 0,
      failureCount: tokens.length,
      responses: tokens.map((token) => ({
        token,
        success: false,
        error: errorMessage,
      })),
    };
  }
};
