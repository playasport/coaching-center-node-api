"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBookingPaymentExpiryJob = exports.executeBookingPaymentExpiryJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const booking_model_1 = require("../models/booking.model");
const settings_service_1 = require("../services/common/settings.service");
const booking_service_1 = require("../services/client/booking.service");
const notificationMessages_1 = require("../services/common/notificationMessages");
const notificationQueue_service_1 = require("../services/common/notificationQueue.service");
const notification_service_1 = require("../services/common/notification.service");
const auditTrail_service_1 = require("../services/common/auditTrail.service");
const auditTrail_model_1 = require("../models/auditTrail.model");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
/** 1h buffer - allow tolerance for hoursLeft vs H so reminders are not missed due to exact timing */
const REMINDER_BUFFER_HOURS = 1;
/** Process this many reminders concurrently to avoid overwhelming DB/APIs */
const REMINDER_CONCURRENCY = 10;
/**
 * 1) Auto-cancel approved bookings where payment link has expired and payment not done.
 * 2) Send payment reminders at configured hours-before-expiry (e.g. 12h, 6h, 2h).
 */
const executeBookingPaymentExpiryJob = async () => {
    try {
        const paymentConfig = await (0, settings_service_1.getBookingPaymentConfig)();
        const now = new Date();
        // ---- Auto-cancel: approved, unpaid, payment_token_expires_at < now ----
        const expiredBookings = await booking_model_1.BookingModel.find({
            status: booking_model_1.BookingStatus.APPROVED,
            'payment.status': { $ne: booking_model_1.PaymentStatus.SUCCESS },
            payment_token_expires_at: { $lt: now },
            is_deleted: false,
        })
            .select('id')
            .lean();
        await Promise.allSettled(expiredBookings.map(async (b) => {
            await (0, booking_service_1.cancelBookingBySystem)(b.id);
            logger_1.logger.info('Booking auto-cancelled due to payment expiry', { bookingId: b.id });
        }));
        // ---- Reminders: approved, unpaid, expiry in future; send at configured hours left ----
        const reminderBookings = await booking_model_1.BookingModel.find({
            status: booking_model_1.BookingStatus.APPROVED,
            'payment.status': { $ne: booking_model_1.PaymentStatus.SUCCESS },
            payment_token_expires_at: { $gt: now },
            payment_token: { $exists: true, $ne: null },
            is_deleted: false,
        })
            .populate('user', '_id id firstName lastName email mobile')
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .select('id booking_id payment_token payment_token_expires_at payment_reminder_sent_hours user batch center')
            .lean();
        const reminderHours = paymentConfig.paymentReminderHoursBeforeExpiry || [];
        if (reminderHours.length === 0) {
            return;
        }
        const mainSiteUrl = env_1.config.mainSiteUrl || 'https://front.playasport.in';
        // Build list of (booking, H) tasks that need reminders
        const reminderTasks = [];
        for (const booking of reminderBookings) {
            const expiresAt = booking.payment_token_expires_at ? new Date(booking.payment_token_expires_at) : null;
            if (!expiresAt || !booking.payment_token)
                continue;
            const hoursLeft = (expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000);
            const sentHours = Array.isArray(booking.payment_reminder_sent_hours) ? booking.payment_reminder_sent_hours : [];
            for (const H of reminderHours) {
                if (hoursLeft > H + REMINDER_BUFFER_HOURS)
                    continue;
                if (sentHours.includes(H))
                    continue;
                reminderTasks.push({ booking, H, hoursLeft });
            }
        }
        const processOneReminder = async (task) => {
            const { booking, H, hoursLeft } = task;
            const user = booking.user;
            const batchName = booking.batch?.name || 'batch';
            const centerName = booking.center?.center_name || 'Academy';
            const bookingId = booking.booking_id || booking.id;
            const paymentUrl = `${mainSiteUrl}/pay/${booking.payment_token}`;
            const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user?.email || 'User' : 'User';
            const variables = {
                userName,
                batchName,
                centerName,
                bookingId,
                hoursLeft: String(Math.max(0, Math.floor(hoursLeft))),
                paymentUrl,
            };
            const updateResult = await booking_model_1.BookingModel.updateOne({ _id: booking._id }, { $addToSet: { payment_reminder_sent_hours: H } });
            if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
                logger_1.logger.warn('Booking not found for reminder update', { bookingId: booking.id });
                return;
            }
            const pushPayload = user?.id ? (0, notificationMessages_1.getPaymentReminderUserPush)(variables) : null;
            const pushPromise = pushPayload
                ? (0, notification_service_1.createAndSendNotification)({
                    recipientType: 'user',
                    recipientId: user.id,
                    title: pushPayload.title,
                    body: pushPayload.body,
                    channels: ['push'],
                    priority: 'high',
                    data: { type: 'payment_reminder', bookingId: booking.id },
                })
                : Promise.resolve();
            if (user?.email) {
                (0, notificationQueue_service_1.queueEmail)(user.email, notificationMessages_1.EmailSubjects.BOOKING_PAYMENT_REMINDER_USER, {
                    template: notificationMessages_1.EmailTemplates.BOOKING_PAYMENT_REMINDER_USER,
                    text: (0, notificationMessages_1.getPaymentReminderUserEmailText)(variables),
                    templateVariables: { ...variables, year: new Date().getFullYear() },
                    priority: 'high',
                    metadata: { type: 'payment_reminder', bookingId: booking.id },
                });
            }
            if (user?.mobile) {
                (0, notificationQueue_service_1.queueSms)(user.mobile, (0, notificationMessages_1.getPaymentReminderUserSms)(variables), 'high', {
                    type: 'payment_reminder',
                    bookingId: booking.id,
                });
                (0, notificationQueue_service_1.queueWhatsAppTemplate)(user.mobile, 'payment_reminder', {
                    batchName,
                    academyName: centerName,
                    hoursLeft: variables.hoursLeft,
                    bookingId: String(bookingId),
                    paymentLink: paymentUrl,
                    buttonUrlParameter: String(booking.payment_token),
                }, 'high', { type: 'payment_reminder', bookingId: booking.id });
            }
            await Promise.all([
                pushPromise,
                (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_REMINDER_SENT, auditTrail_model_1.ActionScale.LOW, `Payment reminder sent (${H}h before expiry) for booking ${bookingId}`, 'Booking', booking._id, {
                    userId: user?._id || user?.id,
                    academyId: booking.center?._id || booking.center,
                    bookingId: booking._id,
                    metadata: {
                        hoursBeforeExpiry: H,
                        hoursLeft: Math.floor(hoursLeft),
                        channels: ['push', 'email', 'sms', 'whatsapp'].filter((ch) => (ch === 'push' && user?.id) ||
                            (ch === 'email' && user?.email) ||
                            ((ch === 'sms' || ch === 'whatsapp') && user?.mobile)),
                    },
                }).catch((err) => {
                    logger_1.logger.warn('Failed to create audit trail for payment reminder', {
                        bookingId: booking.id,
                        hoursBeforeExpiry: H,
                        error: err instanceof Error ? err.message : err,
                    });
                }),
            ]);
            logger_1.logger.info('Payment reminder sent', { bookingId: booking.id, hoursBeforeExpiry: H });
        };
        // Process reminders in parallel batches
        for (let i = 0; i < reminderTasks.length; i += REMINDER_CONCURRENCY) {
            const batch = reminderTasks.slice(i, i + REMINDER_CONCURRENCY);
            const results = await Promise.allSettled(batch.map((task) => processOneReminder(task)));
            results.forEach((r, idx) => {
                if (r.status === 'rejected') {
                    const task = batch[idx];
                    logger_1.logger.error('Failed to send payment reminder', {
                        bookingId: task.booking.id,
                        hoursBeforeExpiry: task.H,
                        error: r.reason,
                    });
                }
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Booking payment expiry job failed', { error });
        throw error;
    }
};
exports.executeBookingPaymentExpiryJob = executeBookingPaymentExpiryJob;
/**
 * Schedule: run every 15 minutes so we catch expiry and reminder windows.
 */
const startBookingPaymentExpiryJob = () => {
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        await (0, exports.executeBookingPaymentExpiryJob)();
    });
    logger_1.logger.info('Booking payment expiry cron job scheduled - runs every 15 minutes');
};
exports.startBookingPaymentExpiryJob = startBookingPaymentExpiryJob;
//# sourceMappingURL=bookingPaymentExpiry.job.js.map