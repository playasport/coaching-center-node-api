"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingConfirmationCenterSms = exports.sendBookingConfirmationUserSms = exports.sendOtpSms = exports.sendSms = exports.queueSms = void 0;
const env_1 = require("../../config/env");
const twilio_1 = require("../../utils/twilio");
const logger_1 = require("../../utils/logger");
const settings_service_1 = require("./settings.service");
class PriorityQueue {
    constructor() {
        this.queues = {
            high: [],
            medium: [],
            low: [],
        };
    }
    enqueue(message) {
        this.queues[message.priority].push(message);
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
        return !this.queues.high.length && !this.queues.medium.length && !this.queues.low.length;
    }
}
const smsQueue = new PriorityQueue();
let isProcessing = false;
const isSmsEnabled = async () => {
    try {
        return await (0, settings_service_1.getSmsEnabled)();
    }
    catch (error) {
        logger_1.logger.error('Failed to check SMS enabled status, using env fallback', error);
        return env_1.config.sms.enabled;
    }
};
const processQueue = async () => {
    if (isProcessing) {
        return;
    }
    if (!(await isSmsEnabled())) {
        logger_1.logger.info('SMS service disabled. Clearing queue.');
        while (!smsQueue.isEmpty()) {
            smsQueue.dequeue();
        }
        return;
    }
    isProcessing = true;
    while (!smsQueue.isEmpty()) {
        const message = smsQueue.dequeue();
        if (!message) {
            continue;
        }
        const client = await (0, twilio_1.getTwilioClient)();
        if (!client) {
            logger_1.logger.info('SMS mocked send', message);
            continue;
        }
        try {
            // Get from phone number from settings first, then env
            const credentials = await (0, settings_service_1.getSmsCredentials)();
            const fromPhone = credentials.fromPhone || env_1.config.twilio.fromPhone;
            await client.messages.create({
                body: message.body,
                from: fromPhone,
                to: message.to,
            });
            logger_1.logger.info('SMS sent successfully', {
                to: message.to,
                priority: message.priority,
            });
        }
        catch (error) {
            logger_1.logger.error('SMS delivery failed', {
                to: message.to,
                priority: message.priority,
                error,
            });
            if (message.priority === 'high') {
                smsQueue.enqueue(message);
            }
        }
    }
    isProcessing = false;
};
const queueSms = (to, body, priority = 'medium', metadata) => {
    smsQueue.enqueue({ to, body, priority, metadata });
    processQueue().catch((error) => logger_1.logger.error('SMS queue processing error', error));
};
exports.queueSms = queueSms;
const sendSms = async (to, body, priority = 'medium', metadata) => {
    if (!(await isSmsEnabled())) {
        logger_1.logger.info('SMS service disabled. Message skipped.', { to, body, priority });
        return;
    }
    (0, exports.queueSms)(to, body, priority, metadata);
};
exports.sendSms = sendSms;
const sendOtpSms = async (mobile, otp) => {
    if (!(await isSmsEnabled())) {
        logger_1.logger.info('SMS OTP not sent. Service disabled.', { mobile });
        return 'SMS delivery disabled. OTP not sent.';
    }
    const { getOtpSms } = await Promise.resolve().then(() => __importStar(require('./notificationMessages')));
    await (0, exports.sendSms)(mobile, getOtpSms({ otp }), 'high', { type: 'otp' });
    return 'OTP queued for delivery';
};
exports.sendOtpSms = sendOtpSms;
const sendBookingConfirmationUserSms = async (mobile, data) => {
    if (!mobile) {
        logger_1.logger.warn('User mobile number not available for SMS', { bookingId: data.bookingId });
        return;
    }
    const userName = data.userName || 'User';
    const message = `Dear ${userName}, your booking ${data.bookingId} for ${data.batchName} (${data.sportName}) at ${data.centerName} has been confirmed. Participants: ${data.participants}. Start Date: ${data.startDate}, Time: ${data.startTime}-${data.endTime}. Amount Paid: ${data.currency} ${data.amount.toFixed(2)}. Thank you for choosing PlayAsport!`;
    await (0, exports.sendSms)(mobile, message, 'high', {
        type: 'booking_confirmation',
        bookingId: data.bookingId,
        recipient: 'user',
    });
};
exports.sendBookingConfirmationUserSms = sendBookingConfirmationUserSms;
const sendBookingConfirmationCenterSms = async (mobile, data) => {
    if (!mobile) {
        logger_1.logger.warn('Coaching center mobile number not available for SMS', {
            bookingId: data.bookingId,
        });
        return;
    }
    const message = `New booking ${data.bookingId} received for ${data.batchName} (${data.sportName}). Customer: ${data.userName || 'N/A'}. Participants: ${data.participants}. Start Date: ${data.startDate}, Time: ${data.startTime}-${data.endTime}. Amount: ${data.currency} ${data.amount.toFixed(2)}. - PlayAsport`;
    await (0, exports.sendSms)(mobile, message, 'high', {
        type: 'booking_confirmation',
        bookingId: data.bookingId,
        recipient: 'coaching_center',
    });
};
exports.sendBookingConfirmationCenterSms = sendBookingConfirmationCenterSms;
//# sourceMappingURL=sms.service.js.map