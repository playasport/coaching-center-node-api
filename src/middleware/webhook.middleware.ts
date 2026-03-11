import { Request, Response, NextFunction } from 'express';
import { getPaymentService } from '../services/common/payment/PaymentService';
import { logger } from '../utils/logger';

const paymentService = getPaymentService();

/**
 * Verify Razorpay webhook signature using the raw request body
 * and the webhook secret (configured in Razorpay Dashboard).
 *
 * Raw body is captured by express.json()'s `verify` callback in app.ts.
 */
export const verifyWebhookSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody as string | undefined;

    if (!razorpaySignature) {
      logger.warn('Webhook signature missing', {
        path: req.path,
      });
      res.status(400).json({ error: 'Missing webhook signature' });
      return;
    }

    if (!rawBody) {
      logger.warn('Webhook raw body not available — verify that express.json verify callback is configured');
      res.status(400).json({ error: 'Unable to verify webhook signature' });
      return;
    }

    const isValidSignature = await paymentService.verifyWebhookSignature(rawBody, razorpaySignature);

    if (!isValidSignature) {
      logger.warn('Invalid webhook signature', {
        path: req.path,
      });
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Webhook signature verification error:', {
      error: error instanceof Error ? error.message : error,
      path: req.path,
    });
    res.status(500).json({ error: 'Webhook verification failed' });
  }
};
