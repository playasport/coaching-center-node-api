"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueStatus = exports.queueMultiChannel = exports.queuePush = exports.queueWhatsApp = exports.queueEmail = exports.queueSms = exports.queueNotification = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
const env_1 = require("../../config/env");
const twilio_1 = require("../../utils/twilio");
const email_service_1 = require("./email.service");
const whatsapp_1 = require("../../utils/whatsapp");
const fcm_1 = require("../../utils/fcm");
const deviceToken_service_1 = require("./deviceToken.service");
const settings_service_1 = require("./settings.service");
class PriorityQueue {
    constructor() {
        this.queues = {
            high: [],
            medium: [],
            low: [],
        };
    }
    enqueue(item) {
        this.queues[item.priority].push(item);
    }
    dequeue() {
        if (this.queues.high.length) {
            return this.queues.high.shift();
        }
        if (this.queues.medium.length) {
            return this.queues.medium.shift();
        }
        return this.queues.low.shift();
    }
    isEmpty() {
        return (!this.queues.high.length && !this.queues.medium.length && !this.queues.low.length);
    }
    size() {
        return this.queues.high.length + this.queues.medium.length + this.queues.low.length;
    }
}
const notificationQueue = new PriorityQueue();
let isProcessing = false;
const MAX_RETRIES = 3;
const DEFAULT_MAX_RETRIES = 3;
// Channel enablement checks (checks settings first, then env fallback)
const isChannelEnabled = async (channel) => {
    // Check global notification enabled from settings first, then env
    const notificationEnabled = await (0, settings_service_1.getConfigWithPriority)('notifications.enabled', env_1.config.notification.enabled) ?? env_1.config.notification.enabled;
    if (!notificationEnabled) {
        return false;
    }
    switch (channel) {
        case 'sms': {
            return await (0, settings_service_1.getSmsEnabled)();
        }
        case 'email': {
            const emailConfig = await (0, settings_service_1.getEmailConfig)();
            return emailConfig.enabled;
        }
        case 'whatsapp': {
            const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
            return cfg.enabled && !!cfg.phoneNumberId && !!cfg.accessToken;
        }
        case 'push': {
            const pushEnabled = await (0, settings_service_1.getConfigWithPriority)('notifications.push.enabled', env_1.config.notification.push.enabled) ?? env_1.config.notification.push.enabled;
            return pushEnabled;
        }
        default:
            return false;
    }
};
// Process SMS notification
const processSms = async (notification) => {
    if (!(await isChannelEnabled('sms'))) {
        logger_1.logger.info('SMS channel disabled. Notification skipped.', {
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
    const client = await (0, twilio_1.getTwilioClient)();
    if (!client) {
        logger_1.logger.info('SMS mocked send', notification);
        return {
            success: false,
            channel: 'sms',
            error: 'Twilio client not available',
            retryable: false,
        };
    }
    // Get from phone number from settings first, then env
    const credentials = await (0, settings_service_1.getSmsCredentials)();
    const fromPhone = credentials.fromPhone || env_1.config.twilio.fromPhone;
    try {
        logger_1.logger.info('Attempting to send SMS', {
            from: fromPhone,
            to: notification.to,
            hasFromPhone: !!fromPhone,
        });
        const message = await client.messages.create({
            body: notification.body,
            from: fromPhone,
            to: notification.to,
        });
        logger_1.logger.info('SMS sent successfully', {
            messageId: message.sid,
            to: notification.to,
            priority: notification.priority,
        });
        return {
            success: true,
            channel: 'sms',
            messageId: message.sid,
        };
    }
    catch (error) {
        // Extract detailed error information from Twilio error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = error?.code || error?.status || 'unknown';
        const errorDetails = error?.moreInfo || error?.details || {};
        const twilioMessage = error?.message || errorMessage;
        logger_1.logger.error('SMS delivery failed', {
            error: errorMessage,
            errorCode,
            twilioMessage,
            errorDetails,
            to: notification.to,
            from: fromPhone || 'unknown',
            priority: notification.priority,
        });
        // "Authenticate" errors are usually credential issues and should not be retried
        const retryable = !errorMessage.includes('invalid') &&
            !errorMessage.includes('unsubscribed') &&
            !errorMessage.includes('Authenticate') &&
            errorCode !== 20003; // Twilio error code for authentication failure
        return {
            success: false,
            channel: 'sms',
            error: errorMessage,
            retryable,
        };
    }
};
// Process Email notification
const processEmail = async (notification) => {
    if (!(await isChannelEnabled('email'))) {
        logger_1.logger.info('Email channel disabled. Notification skipped.', {
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
        await (0, email_service_1.sendTemplatedEmail)({
            to: notification.to,
            subject: notification.subject,
            html: notification.html,
            text: notification.text,
            template: notification.template,
            variables: notification.templateVariables,
            attachments: notification.attachments,
        });
        logger_1.logger.info('Email sent successfully', {
            to: notification.to,
            subject: notification.subject,
            priority: notification.priority,
        });
        return {
            success: true,
            channel: 'email',
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Email delivery failed', {
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
const processWhatsApp = async (notification) => {
    if (!(await isChannelEnabled('whatsapp'))) {
        logger_1.logger.info('WhatsApp channel disabled. Notification skipped.', {
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
    const result = await (0, whatsapp_1.sendWhatsApp)({
        to: notification.to,
        body: notification.body,
    });
    if (result.success) {
        logger_1.logger.info('WhatsApp sent successfully', {
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
const processPush = async (notification) => {
    try {
        // If specific FCM token is provided, send to that token only
        if (notification.fcmToken) {
            const result = await (0, fcm_1.sendPushNotification)({
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
        const deviceTokens = await deviceToken_service_1.deviceTokenService.getUserDeviceTokens(notification.userId);
        const fcmTokens = deviceTokens
            .map((device) => device.fcmToken)
            .filter((token) => !!token);
        if (fcmTokens.length === 0) {
            logger_1.logger.warn('No active device tokens found for user', {
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
        const result = await (0, fcm_1.sendMulticastPushNotification)(fcmTokens, notification.title, notification.body, notification.data, notification.imageUrl);
        logger_1.logger.info('Push notification sent', {
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('Push notification delivery failed', {
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
const processNotification = async (notification) => {
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
            const channel = notification.channel;
            return {
                success: false,
                channel: channel,
                error: `Unknown channel: ${channel}`,
                retryable: false,
            };
        }
    }
};
// Main queue processor
const processQueue = async () => {
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
                const retryNotification = {
                    ...notification,
                    retryCount: retryCount + 1,
                };
                notificationQueue.enqueue(retryNotification);
                logger_1.logger.info('Notification queued for retry', {
                    channel: notification.channel,
                    priority: notification.priority,
                    retryCount: retryCount + 1,
                    maxRetries,
                });
            }
            else if (!result.success) {
                logger_1.logger.error('Notification failed permanently', {
                    channel: notification.channel,
                    priority: notification.priority,
                    retryCount,
                    error: result.error,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Unexpected error processing notification', {
                channel: notification.channel,
                priority: notification.priority,
                error,
            });
            // Retry on unexpected errors if under max retries
            if (retryCount < maxRetries) {
                const retryNotification = {
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
const queueNotification = (notification) => {
    const notificationWithId = {
        ...notification,
        id: notification.id || (0, uuid_1.v4)(),
        retryCount: notification.retryCount || 0,
        maxRetries: notification.maxRetries ?? MAX_RETRIES,
    };
    notificationQueue.enqueue(notificationWithId);
    processQueue().catch((error) => logger_1.logger.error('Notification queue processing error', error));
};
exports.queueNotification = queueNotification;
// Convenience methods for each channel
const queueSms = (to, body, priority = 'medium', metadata) => {
    (0, exports.queueNotification)({
        channel: 'sms',
        to,
        body,
        priority,
        metadata,
    });
};
exports.queueSms = queueSms;
const queueEmail = (to, subject, options = {}) => {
    (0, exports.queueNotification)({
        channel: 'email',
        to,
        subject,
        html: options.html,
        text: options.text,
        template: options.template,
        templateVariables: options.templateVariables,
        priority: options.priority || 'medium',
        metadata: options.metadata,
        attachments: options.attachments,
    });
};
exports.queueEmail = queueEmail;
const queueWhatsApp = (to, body, priority = 'medium', metadata) => {
    (0, exports.queueNotification)({
        channel: 'whatsapp',
        to,
        body,
        priority,
        metadata,
    });
};
exports.queueWhatsApp = queueWhatsApp;
const queuePush = (userId, title, body, options = {}) => {
    (0, exports.queueNotification)({
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
exports.queuePush = queuePush;
// Queue multiple channels for the same notification
const queueMultiChannel = (channels, notification, priority = 'medium', metadata) => {
    channels.forEach((channel) => {
        switch (channel) {
            case 'sms':
                if (notification.sms) {
                    (0, exports.queueSms)(notification.sms.to, notification.sms.body, priority, metadata);
                }
                break;
            case 'email':
                if (notification.email) {
                    (0, exports.queueEmail)(notification.email.to, notification.email.subject, {
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
                    (0, exports.queueWhatsApp)(notification.whatsapp.to, notification.whatsapp.body, priority, metadata);
                }
                break;
            case 'push':
                if (notification.push) {
                    (0, exports.queuePush)(notification.push.userId, notification.push.title, notification.push.body, {
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
exports.queueMultiChannel = queueMultiChannel;
// Get queue status
const getQueueStatus = () => {
    return {
        total: notificationQueue.size(),
        high: notificationQueue['queues'].high.length,
        medium: notificationQueue['queues'].medium.length,
        low: notificationQueue['queues'].low.length,
        isProcessing,
    };
};
exports.getQueueStatus = getQueueStatus;
//# sourceMappingURL=notificationQueue.service.js.map