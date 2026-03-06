import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as webhookService from '../services/common/webhook.service';
import { getWhatsAppCloudConfig } from '../services/common/settings.service';
import {
  verifyWhatsAppWebhook,
  verifyWhatsAppWebhookSignature,
  processWhatsAppWebhookPayload,
} from '../services/common/metaWhatsApp.service';

/**
 * WhatsApp Cloud API webhook verification (GET)
 * Meta sends hub.mode=subscribe, hub.verify_token=YOUR_TOKEN, hub.challenge=RANDOM
 */
export const handleWhatsAppWebhookVerify = async (req: Request, res: Response): Promise<void> => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;
  const cfg = await getWhatsAppCloudConfig();
  const result = verifyWhatsAppWebhook(mode, token, challenge, cfg.webhookVerifyToken);
  if (result === null) {
    res.status(403).send('Forbidden');
    return;
  }
  res.status(200).send(result);
};

/**
 * WhatsApp Cloud API webhook (POST) - incoming messages
 */
export const handleWhatsAppWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = (req as any).rawBody as string | undefined;
    const cfg = await getWhatsAppCloudConfig();

    if (rawBody && signature && cfg.appSecret) {
      const valid = verifyWhatsAppWebhookSignature(rawBody, signature, cfg.appSecret);
      if (!valid) {
        logger.warn('WhatsApp webhook invalid signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const payload = req.body;
    if (payload?.object === 'whatsapp_business_account') {
      processWhatsAppWebhookPayload(payload).catch((err) => {
        logger.error('WhatsApp webhook process error', { error: err });
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('WhatsApp webhook handler error', { error });
    res.status(200).send('OK');
  }
};

/**
 * Handle Razorpay webhook
 */
export const handleRazorpayWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const payload = req.body;

    // Verify it's a Razorpay webhook
    if (!payload.event || !payload.payload) {
      logger.warn('Invalid webhook payload structure', { payload });
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    // Process webhook asynchronously (don't wait for it to complete)
    webhookService.handleWebhook(payload).catch((error) => {
      logger.error('Error processing webhook asynchronously:', {
        error: error instanceof Error ? error.message : error,
        event: payload.event,
      });
    });

    // Respond immediately to Razorpay
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Still respond 200 to Razorpay to prevent retries
    res.status(200).json({ received: true, error: 'Processing error' });
  }
};

