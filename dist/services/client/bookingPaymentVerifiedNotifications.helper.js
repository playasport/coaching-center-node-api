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
exports.sendPaymentVerifiedNotifications = sendPaymentVerifiedNotifications;
/**
 * Shared notification logic for payment-verified bookings.
 * Called from both verifyPayment (user flow) and webhook (payment.captured).
 * Only one caller should invoke this per booking to avoid duplicate notifications.
 */
const participant_model_1 = require("../../models/participant.model");
const booking_model_1 = require("../../models/booking.model");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const logger_1 = require("../../utils/logger");
const env_1 = require("../../config/env");
const notificationQueue_service_1 = require("../common/notificationQueue.service");
const notification_service_1 = require("../common/notification.service");
const notificationMessages_1 = require("../common/notificationMessages");
async function sendPaymentVerifiedNotifications(bookingId) {
    try {
        const booking = await booking_model_1.BookingModel.findOne({ id: bookingId })
            .populate('batch', 'id name scheduled')
            .populate('center', 'id center_name email mobile_number user')
            .populate('sport', 'id name')
            .populate('user', 'id firstName lastName email mobile')
            .select('id booking_id amount currency participants batch center sport user payment')
            .lean();
        if (!booking) {
            logger_1.logger.warn(`Booking not found for payment verified notifications: ${bookingId}`);
            return;
        }
        if (booking.payment?.status !== 'success') {
            logger_1.logger.warn(`Booking payment not success, skipping notifications: ${bookingId}`);
            return;
        }
        const participantDetails = await participant_model_1.ParticipantModel.find({ _id: { $in: booking.participants } })
            .select('id firstName lastName')
            .lean();
        const batchDetails = Array.isArray(booking.batch) ? null : booking.batch;
        const centerDetails = Array.isArray(booking.center) ? null : booking.center;
        if (!batchDetails) {
            logger_1.logger.warn(`Batch not found for booking ${bookingId}`);
            return;
        }
        const startDate = batchDetails.scheduled?.start_date
            ? new Date(batchDetails.scheduled.start_date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : 'N/A';
        const startTime = batchDetails.scheduled?.start_time || 'N/A';
        const endTime = batchDetails.scheduled?.end_time || 'N/A';
        const trainingDays = batchDetails.scheduled?.training_days
            ? batchDetails.scheduled.training_days.join(', ')
            : 'N/A';
        const participantNames = (participantDetails || [])
            .map((p) => {
            const fn = p.firstName || '';
            const ln = p.lastName || '';
            return `${fn} ${ln}`.trim() || p.id || 'Participant';
        })
            .join(', ');
        const user = booking.user;
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
        const userEmail = user?.email;
        const userMobile = user?.mobile;
        const center = centerDetails;
        const centerName = center?.center_name || 'Coaching Center';
        const centerEmail = center?.email;
        const centerMobile = center?.mobile_number;
        const sport = booking.sport;
        const sportName = sport?.name || 'Sport';
        const batchName = batchDetails.name || 'Batch';
        const emailTemplateVariables = {
            userName,
            bookingId: booking.booking_id ?? undefined,
            batchName,
            sportName,
            centerName,
            participants: participantNames,
            startDate,
            startTime,
            endTime,
            trainingDays,
            amount: booking.amount.toFixed(2),
            currency: booking.currency,
            paymentId: booking.payment?.razorpay_payment_id || '',
            year: new Date().getFullYear(),
        };
        let invoiceBuffer = null;
        try {
            const { generateBookingInvoice } = await Promise.resolve().then(() => __importStar(require('../admin/invoice.service')));
            invoiceBuffer = await generateBookingInvoice(booking.id);
        }
        catch {
            // Continue without invoice
        }
        if (userEmail) {
            (0, notificationQueue_service_1.queueEmail)(userEmail, notificationMessages_1.EmailSubjects.BOOKING_CONFIRMATION_USER, {
                template: notificationMessages_1.EmailTemplates.BOOKING_CONFIRMATION_USER,
                text: (0, notificationMessages_1.getBookingConfirmationUserEmailText)({ bookingId: booking.booking_id ?? undefined, batchName, centerName }),
                templateVariables: emailTemplateVariables,
                priority: 'high',
                metadata: { type: 'booking_confirmation', bookingId: booking.id, recipient: 'user' },
                attachments: invoiceBuffer
                    ? [{ filename: `invoice-${booking.booking_id}.pdf`, content: invoiceBuffer, contentType: 'application/pdf' }]
                    : undefined,
            });
        }
        if (centerEmail) {
            (0, notificationQueue_service_1.queueEmail)(centerEmail, notificationMessages_1.EmailSubjects.BOOKING_CONFIRMATION_CENTER, {
                template: notificationMessages_1.EmailTemplates.BOOKING_CONFIRMATION_CENTER,
                text: (0, notificationMessages_1.getBookingConfirmationCenterEmailText)({ bookingId: booking.booking_id ?? undefined, batchName, userName }),
                templateVariables: { ...emailTemplateVariables, userEmail: userEmail || 'N/A' },
                priority: 'high',
                metadata: { type: 'booking_confirmation', bookingId: booking.booking_id, recipient: 'coaching_center' },
            });
        }
        if (env_1.config.admin.email) {
            (0, notificationQueue_service_1.queueEmail)(env_1.config.admin.email, notificationMessages_1.EmailSubjects.BOOKING_CONFIRMATION_ADMIN, {
                template: notificationMessages_1.EmailTemplates.BOOKING_CONFIRMATION_ADMIN,
                text: (0, notificationMessages_1.getBookingConfirmationAdminEmailText)({ bookingId: booking.booking_id ?? undefined, batchName, centerName }),
                templateVariables: { ...emailTemplateVariables, userEmail: userEmail || 'N/A' },
                priority: 'high',
                metadata: { type: 'booking_confirmation', bookingId: booking.booking_id, recipient: 'admin' },
            });
        }
        const userSmsMessage = (0, notificationMessages_1.getPaymentVerifiedUserSms)({
            userName: userName || 'User',
            bookingId: booking.booking_id ?? undefined,
            batchName,
            sportName,
            centerName,
            participants: participantNames,
            startDate,
            startTime,
            endTime,
            currency: booking.currency,
            amount: booking.amount.toFixed(2),
        });
        const centerSmsMessage = (0, notificationMessages_1.getPaymentVerifiedAcademySms)({
            bookingId: booking.booking_id ?? undefined,
            batchName,
            sportName,
            userName: userName || 'N/A',
            participants: participantNames,
            startDate,
            startTime,
            endTime,
            currency: booking.currency,
            amount: booking.amount.toFixed(2),
        });
        if (userMobile) {
            (0, notificationQueue_service_1.queueSms)(userMobile, userSmsMessage, 'high', {
                type: 'booking_confirmation',
                bookingId: booking.id,
                recipient: 'user',
            });
        }
        if (centerMobile) {
            (0, notificationQueue_service_1.queueSms)(centerMobile, centerSmsMessage, 'high', {
                type: 'booking_confirmation',
                bookingId: booking.booking_id ?? undefined,
                recipient: 'coaching_center',
            });
        }
        if (userMobile) {
            (0, notificationQueue_service_1.queueWhatsAppTemplate)(userMobile, 'user_payment_verified', {
                userName: userName || 'User',
                bookingId: booking.booking_id ?? String(booking.id),
                batchName,
                sportName,
                centerName,
                participants: participantNames,
                startDate,
                startTime,
                endTime,
                currency: booking.currency,
                amount: booking.amount.toFixed(2),
            }, 'high', { type: 'booking_confirmation', bookingId: booking.id, recipient: 'user' });
        }
        if (user?.id) {
            (0, notification_service_1.createAndSendNotification)({
                recipientType: 'user',
                recipientId: user.id,
                title: (0, notificationMessages_1.getBookingConfirmationUserPush)({ bookingId: booking.booking_id || booking.id, batchName, centerName }).title,
                body: (0, notificationMessages_1.getBookingConfirmationUserPush)({ bookingId: booking.booking_id || booking.id, batchName, centerName }).body,
                channels: ['push'],
                priority: 'high',
                data: {
                    type: 'booking_confirmation',
                    bookingId: booking.id,
                    batchId: String(booking.batch),
                    centerId: String(booking.center),
                },
            }).catch((err) => logger_1.logger.error('Failed to send push to user', { bookingId: booking.id, error: err }));
        }
        const centerOwnerId = center?.user ? String(center.user) : null;
        if (centerOwnerId) {
            (0, notification_service_1.createAndSendNotification)({
                recipientType: 'academy',
                recipientId: centerOwnerId,
                title: (0, notificationMessages_1.getBookingConfirmationAcademyPush)({ bookingId: booking.booking_id || booking.id, batchName, userName }).title,
                body: (0, notificationMessages_1.getBookingConfirmationAcademyPush)({ bookingId: booking.booking_id || booking.id, batchName, userName }).body,
                channels: ['push'],
                priority: 'high',
                data: {
                    type: 'booking_confirmation_academy',
                    bookingId: booking.id || booking.booking_id,
                    batchId: String(booking.batch),
                    centerId: String(booking.center),
                },
            }).catch((err) => logger_1.logger.error('Failed to send push to academy', { bookingId: booking.id, error: err }));
        }
        (0, notification_service_1.createAndSendNotification)({
            recipientType: 'role',
            roles: [defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN],
            title: (0, notificationMessages_1.getBookingConfirmationAdminPush)({ bookingId: booking.booking_id || booking.id, batchName, centerName }).title,
            body: (0, notificationMessages_1.getBookingConfirmationAdminPush)({ bookingId: booking.booking_id || booking.id, batchName, centerName }).body,
            channels: ['push'],
            priority: 'high',
            data: {
                type: 'booking_confirmation_admin',
                bookingId: booking.booking_id || booking.id,
                batchId: String(booking.batch),
                centerId: String(booking.center),
            },
        }).catch((err) => logger_1.logger.error('Failed to send push to admin', { bookingId: booking.id, error: err }));
        logger_1.logger.info(`Payment verified notifications sent for booking: ${booking.id}`);
    }
    catch (err) {
        logger_1.logger.error('Error sending payment verified notifications', {
            bookingId,
            error: err instanceof Error ? err.message : err,
        });
        throw err;
    }
}
//# sourceMappingURL=bookingPaymentVerifiedNotifications.helper.js.map