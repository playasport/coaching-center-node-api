import { logger } from './logger';
import { getWhatsAppCloudConfig } from '../services/common/settings.service';
import { sendWhatsAppCloudText } from '../services/common/metaWhatsApp.service';

export interface SendWhatsAppOptions {
  to: string;
  body: string;
}

/**
 * Send WhatsApp message via Meta Cloud API only (config from Settings or env).
 * Strips optional "whatsapp:" prefix from recipient.
 */
export const sendWhatsApp = async (
  options: SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string; retryable?: boolean }> => {
  const cfg = await getWhatsAppCloudConfig();
  if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken) {
    logger.info('WhatsApp Cloud not configured or disabled', { to: options.to });
    return { success: false, error: 'WhatsApp Cloud API is not configured or disabled' };
  }

  const to = (options.to || '').replace(/^whatsapp:/i, '').trim();
  if (!to) {
    return { success: false, error: 'Missing recipient' };
  }

  try {
    const { messageId } = await sendWhatsAppCloudText(to, options.body);
    logger.info('WhatsApp message sent successfully', { messageId, to: options.to });
    return { success: true, messageId };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WhatsApp delivery failed', { error: errorMessage, to: options.to });
    const retryable =
      !errorMessage.includes('invalid') &&
      !errorMessage.includes('unsubscribed') &&
      !errorMessage.includes('not configured');
    return {
      success: false,
      error: errorMessage,
      retryable,
    };
  }
};
