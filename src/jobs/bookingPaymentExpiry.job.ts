import cron from 'node-cron';
import { BookingModel, BookingStatus, PaymentStatus } from '../models/booking.model';
import { getBookingPaymentConfig } from '../services/common/settings.service';
import { cancelBookingBySystem } from '../services/client/booking.service';
import {
  EmailTemplates,
  EmailSubjects,
  getPaymentReminderUserSms,
  // getPaymentReminderUserWhatsApp,
  getPaymentReminderUserEmailText,
  getPaymentReminderUserPush,
} from '../services/common/notificationMessages';
import { queueEmail, queueSms /* , queueWhatsApp */ } from '../services/common/notificationQueue.service';
import { createAndSendNotification } from '../services/common/notification.service';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * 1) Auto-cancel approved bookings where payment link has expired and payment not done.
 * 2) Send payment reminders at configured hours-before-expiry (e.g. 12h, 6h, 2h).
 */
export const executeBookingPaymentExpiryJob = async (): Promise<void> => {
  try {
    const paymentConfig = await getBookingPaymentConfig();
    const now = new Date();

    // ---- Auto-cancel: approved, unpaid, payment_token_expires_at < now ----
    const expiredBookings = await BookingModel.find({
      status: BookingStatus.APPROVED,
      'payment.status': { $ne: PaymentStatus.SUCCESS },
      payment_token_expires_at: { $lt: now },
      is_deleted: false,
    })
      .select('id')
      .lean();

    for (const b of expiredBookings) {
      try {
        await cancelBookingBySystem(b.id);
        logger.info('Booking auto-cancelled due to payment expiry', { bookingId: b.id });
      } catch (err) {
        logger.error('Failed to auto-cancel booking', { bookingId: b.id, error: err });
      }
    }

    // ---- Reminders: approved, unpaid, expiry in future; send at configured hours left ----
    const reminderBookings = await BookingModel.find({
      status: BookingStatus.APPROVED,
      'payment.status': { $ne: PaymentStatus.SUCCESS },
      payment_token_expires_at: { $gt: now },
      payment_token: { $exists: true, $ne: null },
      is_deleted: false,
    })
      .populate('user', 'id firstName lastName email mobile')
      .populate('batch', 'id name')
      .populate('center', 'id center_name')
      .select('id booking_id payment_token payment_token_expires_at payment_reminder_sent_hours user batch center')
      .lean();

    const reminderHours = paymentConfig.paymentReminderHoursBeforeExpiry || [];
    if (reminderHours.length === 0) {
      return;
    }

    const mainSiteUrl = config.mainSiteUrl || 'https://www.playasport.in';

    for (const booking of reminderBookings) {
      const expiresAt = booking.payment_token_expires_at ? new Date(booking.payment_token_expires_at) : null;
      if (!expiresAt || !booking.payment_token) continue;

      const hoursLeft = (expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000);
      const sentHours: number[] = Array.isArray(booking.payment_reminder_sent_hours) ? booking.payment_reminder_sent_hours : [];

      for (const H of reminderHours) {
        if (hoursLeft > H) continue;
        if (sentHours.includes(H)) continue;

        const user = booking.user as any;
        const batchName = (booking.batch as any)?.name || 'batch';
        const centerName = (booking.center as any)?.center_name || 'Academy';
        const bookingId = booking.booking_id || booking.id;
        const paymentUrl = `${mainSiteUrl}/pay?token=${booking.payment_token}`;
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user?.email || 'User' : 'User';

        const variables = {
          userName,
          batchName,
          centerName,
          bookingId,
          hoursLeft: String(Math.max(0, Math.floor(hoursLeft))),
          paymentUrl,
        };

        try {
          // Mark this reminder slot as sent FIRST so we never send duplicate if job runs again in 15 min
          const updateResult = await BookingModel.updateOne(
            { _id: (booking as any)._id },
            { $addToSet: { payment_reminder_sent_hours: H } }
          );
          if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
            logger.warn('Booking not found for reminder update', { bookingId: booking.id });
            continue;
          }

          if (user?.id) {
            const pushNotification = getPaymentReminderUserPush(variables);
            await createAndSendNotification({
              recipientType: 'user',
              recipientId: user.id,
              title: pushNotification.title,
              body: pushNotification.body,
              channels: ['push'],
              priority: 'high',
              data: { type: 'payment_reminder', bookingId: booking.id },
            });
          }
          if (user?.email) {
            queueEmail(user.email, EmailSubjects.BOOKING_PAYMENT_REMINDER_USER, {
              template: EmailTemplates.BOOKING_PAYMENT_REMINDER_USER,
              text: getPaymentReminderUserEmailText(variables),
              templateVariables: {
                ...variables,
                year: new Date().getFullYear(),
              },
              priority: 'high',
              metadata: { type: 'payment_reminder', bookingId: booking.id },
            });
          }
          if (user?.mobile) {
            queueSms(user.mobile, getPaymentReminderUserSms(variables), 'high', {
              type: 'payment_reminder',
              bookingId: booking.id,
            });
            // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
            // queueWhatsApp(user.mobile, getPaymentReminderUserWhatsApp(variables), 'high', {
            //   type: 'payment_reminder',
            //   bookingId: booking.id,
            // });
          }

          logger.info('Payment reminder sent', { bookingId: booking.id, hoursBeforeExpiry: H });
        } catch (err) {
          logger.error('Failed to send payment reminder', { bookingId: booking.id, hoursBeforeExpiry: H, error: err });
        }
      }
    }
  } catch (error) {
    logger.error('Booking payment expiry job failed', { error });
    throw error;
  }
};

/**
 * Schedule: run every 15 minutes so we catch expiry and reminder windows.
 */
export const startBookingPaymentExpiryJob = (): void => {
  cron.schedule('*/15 * * * *', async () => {
    await executeBookingPaymentExpiryJob();
  });
  logger.info('Booking payment expiry cron job scheduled - runs every 15 minutes');
};
