"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingConfirmationCenterSms = exports.sendBookingConfirmationUserSms = exports.sendOtpSms = exports.sendSms = exports.queueSms = void 0;
const env_1 = require("../config/env");
const twilio_1 = require("../utils/twilio");
const logger_1 = require("../utils/logger");
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
const isSmsEnabled = () => env_1.config.sms.enabled;
const processQueue = async () => {
    if (isProcessing) {
        return;
    }
    if (!isSmsEnabled()) {
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
        const client = (0, twilio_1.getTwilioClient)();
        if (!client) {
            logger_1.logger.info('SMS mocked send', message);
            continue;
        }
        try {
            await client.messages.create({
                body: message.body,
                from: env_1.config.twilio.fromPhone,
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
const sendSms = (to, body, priority = 'medium', metadata) => {
    if (!isSmsEnabled()) {
        logger_1.logger.info('SMS service disabled. Message skipped.', { to, body, priority });
        return;
    }
    (0, exports.queueSms)(to, body, priority, metadata);
};
exports.sendSms = sendSms;
const sendOtpSms = async (mobile, otp) => {
    if (!isSmsEnabled()) {
        logger_1.logger.info('SMS OTP not sent. Service disabled.', { mobile });
        return 'SMS delivery disabled. OTP not sent.';
    }
    (0, exports.sendSms)(mobile, `Your Play A Sport OTP is ${otp} . This OTP will expire in 5 minutes. Do not share this OTP with anyone. Thank You, Play A Sport.`, 'high', { type: 'otp' });
    return 'OTP queued for delivery';
};
exports.sendOtpSms = sendOtpSms;
const sendBookingConfirmationUserSms = (mobile, data) => {
    if (!mobile) {
        logger_1.logger.warn('User mobile number not available for SMS', { bookingId: data.bookingId });
        return;
    }
    const userName = data.userName || 'User';
    const message = `Dear ${userName}, your booking ${data.bookingId} for ${data.batchName} (${data.sportName}) at ${data.centerName} has been confirmed. Participants: ${data.participants}. Start Date: ${data.startDate}, Time: ${data.startTime}-${data.endTime}. Amount Paid: ${data.currency} ${data.amount.toFixed(2)}. Thank you for choosing PlayAsport!`;
    (0, exports.sendSms)(mobile, message, 'high', {
        type: 'booking_confirmation',
        bookingId: data.bookingId,
        recipient: 'user',
    });
};
exports.sendBookingConfirmationUserSms = sendBookingConfirmationUserSms;
const sendBookingConfirmationCenterSms = (mobile, data) => {
    if (!mobile) {
        logger_1.logger.warn('Coaching center mobile number not available for SMS', {
            bookingId: data.bookingId,
        });
        return;
    }
    const message = `New booking ${data.bookingId} received for ${data.batchName} (${data.sportName}). Customer: ${data.userName || 'N/A'}. Participants: ${data.participants}. Start Date: ${data.startDate}, Time: ${data.startTime}-${data.endTime}. Amount: ${data.currency} ${data.amount.toFixed(2)}. - PlayAsport`;
    (0, exports.sendSms)(mobile, message, 'high', {
        type: 'booking_confirmation',
        bookingId: data.bookingId,
        recipient: 'coaching_center',
    });
};
exports.sendBookingConfirmationCenterSms = sendBookingConfirmationCenterSms;
//# sourceMappingURL=sms.service.js.map