import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as webhookService from '../services/common/webhook.service';

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

