import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate } from '../middleware/validation.middleware';
import { bookingSummarySchema, createOrderSchema, verifyPaymentSchema, userBookingListSchema } from '../validations/booking.validation';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /user/booking/summary:
 *   get:
 *     summary: Get booking summary
 *     tags: [Booking]
 *     description: Get booking summary including batch details, participant info, and calculated amount before creating an order. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Batch ID
 *       - in: query
 *         name: participantIds
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         style: form
 *         explode: true
 *         description: Array of Participant IDs (e.g., ?participantIds=id1&participantIds=id2 or comma-separated ?participantIds=id1,id2,id3)
 *     responses:
 *       200:
 *         description: Booking summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Booking summary retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       $ref: '#/components/schemas/BookingSummary'
 *       400:
 *         description: Validation error or invalid data
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Batch or participant not found
 */
router.get(
  '/summary',
  authenticate,
  validate(bookingSummarySchema),
  bookingController.getSummary
);

/**
 * @swagger
 * /user/booking/create-order:
 *   post:
 *     summary: Create Razorpay order for booking
 *     tags: [Booking]
 *     description: Create a Razorpay payment order and booking record. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - batchId
 *               - participantIds
 *             properties:
 *               batchId:
 *                 type: string
 *                 description: Batch ID
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of Participant IDs (at least one required)
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes for the booking
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *                     razorpayOrder:
 *                       $ref: '#/components/schemas/RazorpayOrder'
 *       400:
 *         description: Validation error, invalid data, or duplicate booking
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Batch or participant not found
 *       500:
 *         description: Server error or Razorpay order creation failed
 */
router.post(
  '/create-order',
  authenticate,
  validate(createOrderSchema),
  bookingController.createOrder
);

/**
 * @swagger
 * /user/booking/verify-payment:
 *   post:
 *     summary: Verify Razorpay payment
 *     tags: [Booking]
 *     description: Verify Razorpay payment signature and update booking status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *                 description: Razorpay order ID
 *               razorpay_payment_id:
 *                 type: string
 *                 description: Razorpay payment ID
 *               razorpay_signature:
 *                 type: string
 *                 description: Razorpay payment signature for verification
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment verified successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error, invalid signature, or payment already verified
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error or Razorpay verification failed
 */
router.post(
  '/verify-payment',
  authenticate,
  validate(verifyPaymentSchema),
  bookingController.verifyPayment
);

/**
 * @swagger
 * /user/booking:
 *   get:
 *     summary: Get user bookings list
 *     tags: [Booking]
 *     description: Retrieve a paginated list of user's bookings with enrolled batches, participants, and payment details. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filter by booking status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed, refunded, cancelled]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User bookings retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserBookingListItem'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/',
  authenticate,
  validate(userBookingListSchema),
  bookingController.getUserBookings
);

export default router;

