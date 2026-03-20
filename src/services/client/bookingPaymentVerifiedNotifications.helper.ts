/**
 * Shared notification logic for payment-verified bookings.
 * Called from both verifyPayment (user flow) and webhook (payment.captured).
 * Only one caller should invoke this per booking to avoid duplicate notifications.
 */
import { ParticipantModel } from '../../models/participant.model';
import { BookingModel } from '../../models/booking.model';
import { DefaultRoles } from '../../enums/defaultRoles.enum';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import { queueEmail, queueSms, queueWhatsAppTemplate } from '../common/notificationQueue.service';
import { createAndSendNotification } from '../common/notification.service';
import {
  EmailTemplates,
  EmailSubjects,
  getBookingConfirmationUserEmailText,
  getBookingConfirmationCenterEmailText,
  getBookingConfirmationAdminEmailText,
  getPaymentVerifiedUserSms,
  getPaymentVerifiedAcademySms,
  getBookingConfirmationUserPush,
  getBookingConfirmationAcademyPush,
  getBookingConfirmationAdminPush,
} from '../common/notificationMessages';

export async function sendPaymentVerifiedNotifications(bookingId: string): Promise<void> {
  try {
    const booking = await BookingModel.findOne({ id: bookingId })
      .populate('batch', 'id name scheduled')
      .populate('center', 'id center_name email mobile_number user')
      .populate('sport', 'id name')
      .populate('user', 'id firstName lastName email mobile')
      .select('id booking_id amount currency participants batch center sport user payment')
      .lean();

    if (!booking) {
      logger.warn(`Booking not found for payment verified notifications: ${bookingId}`);
      return;
    }

    if (booking.payment?.status !== 'success') {
      logger.warn(`Booking payment not success, skipping notifications: ${bookingId}`);
      return;
    }

    const participantDetails = await ParticipantModel.find({ _id: { $in: booking.participants } })
      .select('id firstName lastName')
      .lean();

    const batchDetails = Array.isArray(booking.batch) ? null : (booking.batch as any);
    const centerDetails = Array.isArray(booking.center) ? null : (booking.center as any);
    if (!batchDetails) {
      logger.warn(`Batch not found for booking ${bookingId}`);
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
      .map((p: any) => {
        const fn = p.firstName || '';
        const ln = p.lastName || '';
        return `${fn} ${ln}`.trim() || p.id || 'Participant';
      })
      .join(', ');

    const user = booking.user as any;
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
    const userEmail = user?.email;
    const userMobile = user?.mobile;

    const center = centerDetails as any;
    const centerName = center?.center_name || 'Coaching Center';
    const centerEmail = center?.email;
    const centerMobile = center?.mobile_number;

    const sport = booking.sport as any;
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

    let invoiceBuffer: Buffer | null = null;
    try {
      const { generateBookingInvoice } = await import('../admin/invoice.service');
      invoiceBuffer = await generateBookingInvoice(booking.id);
    } catch {
      // Continue without invoice
    }

    if (userEmail) {
      queueEmail(userEmail, EmailSubjects.BOOKING_CONFIRMATION_USER, {
        template: EmailTemplates.BOOKING_CONFIRMATION_USER,
        text: getBookingConfirmationUserEmailText({ bookingId: booking.booking_id ?? undefined, batchName, centerName }),
        templateVariables: emailTemplateVariables,
        priority: 'high',
        metadata: { type: 'booking_confirmation', bookingId: booking.id, recipient: 'user' },
        attachments: invoiceBuffer
          ? [{ filename: `invoice-${booking.booking_id}.pdf`, content: invoiceBuffer, contentType: 'application/pdf' }]
          : undefined,
      });
    }

    if (centerEmail) {
      queueEmail(centerEmail, EmailSubjects.BOOKING_CONFIRMATION_CENTER, {
        template: EmailTemplates.BOOKING_CONFIRMATION_CENTER,
        text: getBookingConfirmationCenterEmailText({ bookingId: booking.booking_id ?? undefined, batchName, userName }),
        templateVariables: { ...emailTemplateVariables, userEmail: userEmail || 'N/A' },
        priority: 'high',
        metadata: { type: 'booking_confirmation', bookingId: booking.booking_id, recipient: 'coaching_center' },
      });
    }

    if (config.admin.email) {
      queueEmail(config.admin.email, EmailSubjects.BOOKING_CONFIRMATION_ADMIN, {
        template: EmailTemplates.BOOKING_CONFIRMATION_ADMIN,
        text: getBookingConfirmationAdminEmailText({ bookingId: booking.booking_id ?? undefined, batchName, centerName }),
        templateVariables: { ...emailTemplateVariables, userEmail: userEmail || 'N/A' },
        priority: 'high',
        metadata: { type: 'booking_confirmation', bookingId: booking.booking_id, recipient: 'admin' },
      });
    }

    const userSmsMessage = getPaymentVerifiedUserSms({
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
    const centerSmsMessage = getPaymentVerifiedAcademySms({
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
      queueSms(userMobile, userSmsMessage, 'high', {
        type: 'booking_confirmation',
        bookingId: booking.id,
        recipient: 'user',
      });
    }
    if (centerMobile) {
      queueSms(centerMobile, centerSmsMessage, 'high', {
        type: 'booking_confirmation',
        bookingId: booking.booking_id ?? undefined,
        recipient: 'coaching_center',
      });
    }

    if (userMobile) {
      queueWhatsAppTemplate(
        userMobile,
        'user_payment_verified',
        {
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
        },
        'high',
        { type: 'booking_confirmation', bookingId: booking.id, recipient: 'user' }
      );
    }

    if (user?.id) {
      createAndSendNotification({
        recipientType: 'user',
        recipientId: user.id,
        title: getBookingConfirmationUserPush({ bookingId: booking.booking_id || booking.id, batchName, centerName }).title,
        body: getBookingConfirmationUserPush({ bookingId: booking.booking_id || booking.id, batchName, centerName }).body,
        channels: ['push'],
        priority: 'high',
        data: {
          type: 'booking_confirmation',
          bookingId: booking.id,
          batchId: String(booking.batch),
          centerId: String(booking.center),
        },
      }).catch((err) => logger.error('Failed to send push to user', { bookingId: booking.id, error: err }));
    }

    const centerOwnerId = center?.user ? String(center.user) : null;
    if (centerOwnerId) {
      createAndSendNotification({
        recipientType: 'academy',
        recipientId: centerOwnerId,
        title: getBookingConfirmationAcademyPush({ bookingId: booking.booking_id || booking.id, batchName, userName }).title,
        body: getBookingConfirmationAcademyPush({ bookingId: booking.booking_id || booking.id, batchName, userName }).body,
        channels: ['push'],
        priority: 'high',
        data: {
          type: 'booking_confirmation_academy',
          bookingId: booking.id || booking.booking_id,
          batchId: String(booking.batch),
          centerId: String(booking.center),
        },
      }).catch((err) => logger.error('Failed to send push to academy', { bookingId: booking.id, error: err }));
    }

    createAndSendNotification({
      recipientType: 'role',
      roles: [DefaultRoles.ADMIN, DefaultRoles.SUPER_ADMIN],
      title: getBookingConfirmationAdminPush({ bookingId: booking.booking_id || booking.id, batchName, centerName }).title,
      body: getBookingConfirmationAdminPush({ bookingId: booking.booking_id || booking.id, batchName, centerName }).body,
      channels: ['push'],
      priority: 'high',
      data: {
        type: 'booking_confirmation_admin',
        bookingId: booking.booking_id || booking.id,
        batchId: String(booking.batch),
        centerId: String(booking.center),
      },
    }).catch((err) => logger.error('Failed to send push to admin', { bookingId: booking.id, error: err }));

    logger.info(`Payment verified notifications sent for booking: ${booking.id}`);
  } catch (err) {
    logger.error('Error sending payment verified notifications', {
      bookingId,
      error: err instanceof Error ? err.message : err,
    });
    throw err;
  }
}
