"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMulticastPushNotification = exports.sendPushNotification = exports.getFCMClient = void 0;
const messaging_1 = require("firebase-admin/messaging");
const app_1 = require("firebase-admin/app");
const firebase_1 = require("../config/firebase");
const logger_1 = require("./logger");
let messaging = null;
const getFCMClient = () => {
    try {
        // Initialize Firebase Auth to ensure app is initialized
        (0, firebase_1.getFirebaseAuth)();
        if (!(0, app_1.getApps)().length) {
            logger_1.logger.warn('Firebase app not initialized. FCM messaging unavailable.');
            return null;
        }
        if (!messaging) {
            messaging = (0, messaging_1.getMessaging)();
            logger_1.logger.info('FCM messaging client initialized');
        }
        return messaging;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize FCM messaging client', error);
        return null;
    }
};
exports.getFCMClient = getFCMClient;
const sendPushNotification = async (options) => {
    const client = (0, exports.getFCMClient)();
    if (!client) {
        logger_1.logger.info('FCM mocked send', options);
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
                priority: 'high',
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                },
            },
        };
        const response = await client.send(message);
        logger_1.logger.info('Push notification sent successfully', {
            messageId: response,
            token: options.token.substring(0, 20) + '...',
        });
        return { success: true, messageId: response };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Push notification delivery failed', {
            error: errorMessage,
            token: options.token.substring(0, 20) + '...',
        });
        // Check if token is invalid (should not retry)
        const isInvalidToken = error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered';
        return {
            success: false,
            error: errorMessage,
            retryable: !isInvalidToken,
        };
    }
};
exports.sendPushNotification = sendPushNotification;
const sendMulticastPushNotification = async (tokens, title, body, data, imageUrl) => {
    const client = (0, exports.getFCMClient)();
    if (!client) {
        logger_1.logger.info('FCM mocked multicast send', { tokenCount: tokens.length, title, body });
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
                priority: 'high',
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
                }
                else {
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
        logger_1.logger.info('Multicast push notification sent', {
            successCount: response.successCount,
            failureCount: response.failureCount,
            totalCount: tokens.length,
        });
        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Multicast push notification delivery failed', {
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
exports.sendMulticastPushNotification = sendMulticastPushNotification;
//# sourceMappingURL=fcm.js.map