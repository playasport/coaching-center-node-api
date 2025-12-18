import { Request, Response, NextFunction } from 'express';
import { getPaymentService } from '../services/common/payment/PaymentService';
import { logger } from '../utils/logger';

const paymentService = getPaymentService();

/**
 * Middleware to capture raw body for webhook signature verification
 * Payment gateway webhooks require raw body to verify signature
 */
export const rawBodyMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.path.includes('/webhook')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  } else {
    next();
  }
};

/**
 * Verify Razorpay webhook signature
 */
export const verifyWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!razorpaySignature) {
      logger.warn('Webhook signature missing', {
        path: req.path,
        headers: req.headers,
      });
      res.status(400).json({ error: 'Missing webhook signature' });
      return;
    }

    // Verify webhook signature using payment service
    const isValidSignature = paymentService.verifyWebhookSignature(rawBody, razorpaySignature);

    if (!isValidSignature) {
      logger.warn('Invalid webhook signature', {
        path: req.path,
        received: razorpaySignature,
      });
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    // Parse body if it's a string
    if (typeof rawBody === 'string') {
      try {
        req.body = JSON.parse(rawBody);
      } catch (e) {
        // If parsing fails, body might already be parsed
      }
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

