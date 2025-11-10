import { config } from '../config/env';
import { getTwilioClient } from '../utils/twilio';

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

const isSmsEnabled = (): boolean => config.sms.enabled;

const processQueue = async () => {
  if (isProcessing) {
    return;
  }

  if (!isSmsEnabled()) {
    console.info('[SMS] Service disabled. Clearing queue.');
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

    const client = getTwilioClient();
    if (!client) {
      console.info('[SMS Mock]', JSON.stringify(message));
      continue;
    }

    try {
      await client.messages.create({
        body: message.body,
        from: config.twilio.fromPhone,
        to: message.to,
      });
      console.info('[SMS] Sent', message.to, 'priority', message.priority);
    } catch (error) {
      console.error('[SMS] Failed', message.to, error);
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
  processQueue().catch((error) => console.error('[SMS] Queue error', error));
};

export const sendSms = (
  to: string,
  body: string,
  priority: SmsPriority = 'medium',
  metadata?: Record<string, unknown>
) => {
  if (!isSmsEnabled()) {
    console.info('[SMS] Service disabled. Message skipped.', { to, body });
    return;
  }
  queueSms(to, body, priority, metadata);
};

export const sendOtpSms = async (mobile: string, otp: string): Promise<string> => {
  if (!isSmsEnabled()) {
    console.info('[SMS] OTP not sent. Service disabled.', { mobile });
    return 'SMS delivery disabled. OTP not sent.';
  }

  sendSms(
    mobile,
    `Your PlayAsport Academy OTP is ${otp} . This OTP will expire in 5 minutes. Do not share this OTP with anyone. Play A Team Thank You.`,
    'high',
    { type: 'otp' }
  );

  return 'OTP queued for delivery';
};


