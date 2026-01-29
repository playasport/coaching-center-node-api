import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';
import { rawBodyMiddleware, verifyWebhookSignature } from '../middleware/webhook.middleware';

const router = Router();

// Apply raw body middleware for webhook routes (must be before express.json())
router.use(rawBodyMiddleware);

/**
 * @swagger
 * /webhook/razorpay:
 *   post:
 *     summary: Razorpay webhook endpoint
 *     tags: [Webhook]
 *     description: |
 *       Webhook endpoint for Razorpay payment events. This endpoint:
 *       - Verifies webhook signature for security
 *       - Handles payment.captured, payment.failed, and order.paid events
 *       - Updates booking and transaction records automatically
 *       - Does not require authentication (called by Razorpay)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entity:
 *                 type: string
 *               account_id:
 *                 type: string
 *               event:
 *                 type: string
 *                 example: "payment.captured"
 *               payload:
 *                 type: object
 *                 description: Razorpay webhook payload containing payment/order details
 *                 properties:
 *                   payment:
 *                     type: object
 *                     description: Payment entity (for payment.captured and payment.failed events)
 *                   order:
 *                     type: object
 *                     description: Order entity (for order.paid event)
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook signature or payload
 */
router.post(
  '/razorpay',
  verifyWebhookSignature,
  webhookController.handleRazorpayWebhook
);

export default router;

