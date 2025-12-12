import { getTwilioClient } from './twilio';
import { config } from '../config/env';
import { logger } from './logger';

export interface SendWhatsAppOptions {
  to: string;
  body: string;
}

export const sendWhatsApp = async (
  options: SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string; retryable?: boolean }> => {
  const client = getTwilioClient();

  if (!client) {
    logger.info('WhatsApp mocked send', options);
    return { success: false, error: 'Twilio client not available' };
  }

  // Twilio WhatsApp uses 'whatsapp:' prefix for phone numbers
  const fromNumber = config.twilio.fromPhone?.startsWith('whatsapp:')
    ? config.twilio.fromPhone
    : `whatsapp:${config.twilio.fromPhone}`;

  const toNumber = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`;

  try {
    const message = await client.messages.create({
      body: options.body,
      from: fromNumber,
      to: toNumber,
    });

    logger.info('WhatsApp message sent successfully', {
      messageId: message.sid,
      to: options.to,
    });

    return { success: true, messageId: message.sid };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WhatsApp delivery failed', {
      error: errorMessage,
      to: options.to,
    });

    // Check if it's a retryable error
    const retryable = !errorMessage.includes('invalid') && !errorMessage.includes('unsubscribed');

    return {
      success: false,
      error: errorMessage,
      retryable,
    };
  }
};
