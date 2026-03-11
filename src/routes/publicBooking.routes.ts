import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate } from '../middleware/validation.middleware';
import { publicPayQuerySchema, publicCreateOrderSchema } from '../validations/booking.validation';

const router = Router();

/**
 * @swagger
 * /public/booking/pay:
 *   get:
 *     summary: Get booking by payment token (no auth)
 *     tags: [Public Booking]
 *     description: For the public pay page. Returns booking details, status, and payment_enabled so frontend can show Pay button or already paid/cancelled/expired state. Token is set when academy approves booking (24h expiry).
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment token from the pay URL (e.g. /pay?token=xxx)
 *     responses:
 *       200:
 *         description: Booking details for pay page
 *       400:
 *         description: Invalid token or link expired
 *       404:
 *         description: Payment link invalid or expired
 */
router.get(
  '/pay',
  validate(publicPayQuerySchema),
  bookingController.getPublicPayBooking
);

/**
 * @swagger
 * /public/booking/create-order:
 *   post:
 *     summary: Create Razorpay order by payment token (no auth)
 *     tags: [Public Booking]
 *     description: Call when user clicks Pay on the public pay page. Returns Razorpay order for checkout. Payment is verified by webhook after user pays.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Payment token from the pay URL
 *     responses:
 *       201:
 *         description: Payment order created; use razorpayOrder to open Razorpay checkout
 *       400:
 *         description: Invalid token, link expired, or already paid
 *       404:
 *         description: Booking not found or payment not available
 */
router.post(
  '/create-order',
  validate(publicCreateOrderSchema),
  bookingController.createPublicOrder
);

export default router;
