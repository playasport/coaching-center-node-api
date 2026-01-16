import { config } from '../../config/env';
import { getTwilioClient } from '../../utils/twilio';
import { logger } from '../../utils/logger';
import { getSmsEnabled, getSmsCredentials } from './settings.service';

export type SmsPriority = 'high' | 'medium' | 'low';

interface SmsMessage {
  to: string;
  body: string;
  priority: SmsPriority;
  metadata?: Record<string, unknown>;
}

class PriorityQueue {
  private queues: Record<SmsPriority, SmsMessage[]> = {
    high: [],
    medium: [],
    low: [],
  };

  enqueue(message: SmsMessage) {
    this.queues[message.priority].push(message);
  }

  dequeue(): SmsMessage | undefined {
    if (this.queues.high.length) {
      return this.queues.high.shift();
    }
    if (this.queues.medium.length) {
      return this.queues.medium.shift();
    }
    return this.queues.low.shift();
  }

  isEmpty(): boolean {
    return !this.queues.high.length && !this.queues.medium.length && !this.queues.low.length;
  }
}

const smsQueue = new PriorityQueue();
let isProcessing = false;

const isSmsEnabled = async (): Promise<boolean> => {
  try {
    return await getSmsEnabled();
  } catch (error) {
    logger.error('Failed to check SMS enabled status, using env fallback', error);
    return config.sms.enabled;
  }
};

const processQueue = async () => {
  if (isProcessing) {
    return;
  }

  if (!(await isSmsEnabled())) {
    logger.info('SMS service disabled. Clearing queue.');
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

    const client = await getTwilioClient();
    if (!client) {
      logger.info('SMS mocked send', message);
      continue;
    }

    try {
      // Get from phone number from settings first, then env
      const credentials = await getSmsCredentials();
      const fromPhone = credentials.fromPhone || config.twilio.fromPhone;

      await client.messages.create({
        body: message.body,
        from: fromPhone,
        to: message.to,
      });
      logger.info('SMS sent successfully', {
        to: message.to,
        priority: message.priority,
      });
    } catch (error) {
      logger.error('SMS delivery failed', {
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

export const queueSms = (
  to: string,
  body: string,
  priority: SmsPriority = 'medium',
  metadata?: Record<string, unknown>
) => {
  smsQueue.enqueue({ to, body, priority, metadata });
  processQueue().catch((error) => logger.error('SMS queue processing error', error));
};

export const sendSms = async (
  to: string,
  body: string,
  priority: SmsPriority = 'medium',
  metadata?: Record<string, unknown>
) => {
  if (!(await isSmsEnabled())) {
    logger.info('SMS service disabled. Message skipped.', { to, body, priority });
    return;
  }
  queueSms(to, body, priority, metadata);
};

export const sendOtpSms = async (mobile: string, otp: string): Promise<string> => {
  if (!(await isSmsEnabled())) {
    logger.info('SMS OTP not sent. Service disabled.', { mobile });
    return 'SMS delivery disabled. OTP not sent.';
  }

  const { getOtpSms } = await import('./notificationMessages');
  await sendSms(
    mobile,
    getOtpSms({ otp }),
    'high',
    { type: 'otp' }
  );

  return 'OTP queued for delivery';
};

interface BookingConfirmationSmsData {
  bookingId: string;
  batchName: string;
  sportName: string;
  centerName: string;
  userName?: string;
  participants: string;
  startDate: string;
  startTime: string;
  endTime: string;
  amount: number;
  currency: string;
}

export const sendBookingConfirmationUserSms = async (
  mobile: string,
  data: BookingConfirmationSmsData
): Promise<void> => {
  if (!mobile) {
    logger.warn('User mobile number not available for SMS', { bookingId: data.bookingId });
    return;
  }

  const userName = data.userName || 'User';
  const message = `Dear ${userName}, your booking ${data.bookingId} for ${data.batchName} (${data.sportName}) at ${data.centerName} has been confirmed. Participants: ${data.participants}. Start Date: ${data.startDate}, Time: ${data.startTime}-${data.endTime}. Amount Paid: ${data.currency} ${data.amount.toFixed(2)}. Thank you for choosing PlayAsport!`;

  await sendSms(mobile, message, 'high', {
    type: 'booking_confirmation',
    bookingId: data.bookingId,
    recipient: 'user',
  });
};

export const sendBookingConfirmationCenterSms = async (
  mobile: string,
  data: BookingConfirmationSmsData
): Promise<void> => {
  if (!mobile) {
    logger.warn('Coaching center mobile number not available for SMS', {
      bookingId: data.bookingId,
    });
    return;
  }

  const message = `New booking ${data.bookingId} received for ${data.batchName} (${data.sportName}). Customer: ${data.userName || 'N/A'}. Participants: ${data.participants}. Start Date: ${data.startDate}, Time: ${data.startTime}-${data.endTime}. Amount: ${data.currency} ${data.amount.toFixed(2)}. - PlayAsport`;

  await sendSms(mobile, message, 'high', {
    type: 'booking_confirmation',
    bookingId: data.bookingId,
    recipient: 'coaching_center',
  });
};



