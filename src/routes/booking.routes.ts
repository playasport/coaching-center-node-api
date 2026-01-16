import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate } from '../middleware/validation.middleware';
import { bookingSummarySchema, verifyPaymentSchema, userBookingListSchema, deleteOrderSchema, bookSlotSchema, createPaymentOrderSchema, cancelBookingSchema, getBookingDetailsSchema } from '../validations/booking.validation';
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
 *                   $ref: '#/components/schemas/BookingSummary'
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
 *         description: Payment verified successfully. Booking properties are spread directly in the data object.
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
 *                   $ref: '#/components/schemas/Booking'
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
 *     description: Retrieve a paginated list of user's bookings with enrolled batches, participants, and payment details. Shows all bookings regardless of payment status (SLOT_BOOKED, APPROVED, REJECTED, CONFIRMED, etc.). Requires authentication.
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
 *           enum: [slot_booked, approved, rejected, payment_pending, confirmed, cancelled, completed, requested, pending]
 *         description: Filter by booking status (includes new statuses: slot_booked, approved, rejected)
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [not_initiated, initiated, pending, processing, success, failed, refunded, cancelled]
 *         description: Filter by payment status (optional)
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

/**
 * @swagger
 * /user/booking/delete-order:
 *   delete:
 *     summary: Cancel payment order (does not cancel booking)
 *     tags: [Booking]
 *     description: Cancel a payment order initiated by the user. This only updates the payment status to CANCELLED and does NOT cancel the booking itself. The booking status remains unchanged. Only works for orders with INITIATED or PENDING payment status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteOrderRequest'
 *     responses:
 *       200:
 *         description: Payment order cancelled successfully (booking status unchanged)
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
 *                   example: "Payment order cancelled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     booking_id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       description: Booking status (unchanged)
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     payment:
 *                       type: object
 *                       properties:
 *                         razorpay_order_id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [cancelled]
 *                           description: Payment status set to CANCELLED
 *                         failure_reason:
 *                           type: string
 *                     batch:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     center:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     sport:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *       400:
 *         description: Validation error, payment already verified/successful, or order already cancelled
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/delete-order',
  authenticate,
  validate(deleteOrderSchema),
  bookingController.deleteOrder
);

/**
 * @swagger
 * /user/booking/book-slot:
 *   post:
 *     summary: Book slot - Create booking request (new flow)
 *     tags: [Booking]
 *     description: Create a booking request. This will occupy slots, create a booking with REQUESTED status, and send notifications to academy, user, and admin. Requires authentication.
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
 *         description: Booking request created successfully
 *       400:
 *         description: Validation error, invalid data, or insufficient slots
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Batch or participant not found
 *       500:
 *         description: Server error
 */
router.post(
  '/book-slot',
  authenticate,
  validate(bookSlotSchema),
  bookingController.bookSlot
);

/**
 * @swagger
 * /user/booking/{bookingId}/create-payment-order:
 *   post:
 *     summary: Create payment order after academy approval
 *     tags: [Booking]
 *     description: Create a Razorpay payment order for an approved booking. The booking must be in APPROVED status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       201:
 *         description: Payment order created successfully
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
 *                   example: "Payment order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         booking_id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [slot_booked, approved, payment_pending, confirmed]
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         payment:
 *                           type: object
 *                           properties:
 *                             razorpay_order_id:
 *                               type: string
 *                             status:
 *                               type: string
 *                               enum: [initiated, pending]
 *                     razorpayOrder:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         receipt:
 *                           type: string
 *                           nullable: true
 *                         status:
 *                           type: string
 *                         created_at:
 *                           type: number
 *       400:
 *         description: Booking not in APPROVED status
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: booking not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:bookingId/create-payment-order',
  authenticate,
  validate(createPaymentOrderSchema),
  bookingController.createPaymentOrder
);

/**
 * @swagger
 * /user/booking/{bookingId}/cancel:
 *   post:
 *     summary: Cancel booking by user with reason
 *     tags: [Booking]
 *     description: Cancel a booking by user. Cannot cancel after payment is successful. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Cancellation reason (required)
 *                 example: "Change of plans"
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Cannot cancel booking (already cancelled, completed, or payment successful)
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:bookingId/cancel',
  authenticate,
  validate(cancelBookingSchema),
  bookingController.cancelBooking
);

/**
 * @swagger
 * /user/booking/{bookingId}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Booking]
 *     description: Retrieve detailed information about a specific booking including batch details, participants, payment information, and status. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully
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
 *                   example: "Booking details retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/BookingDetailsResponse'
 *       400:
 *         description: Invalid booking ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:bookingId',
  authenticate,
  validate(getBookingDetailsSchema),
  bookingController.getBookingDetails
);

/**
 * @swagger
 * /user/booking/{bookingId}/invoice:
 *   get:
 *     summary: Download booking invoice as PDF
 *     tags: [Booking]
 *     description: |
 *       Download invoice PDF for a booking with successful payment.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - User must own the booking
 *       - Payment status must be SUCCESS
 *       
 *       **Response:**
 *       - Returns PDF file as binary data
 *       - Content-Type: application/pdf
 *       - Content-Disposition header includes filename
 *       
 *       **Note:** Invoice is automatically sent to user's email when payment is verified successfully.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           example: "7687e212-96e7-418b-90ca-dc314eadb4a4"
 *         description: Booking ID (UUID)
 *     responses:
 *       200:
 *         description: Invoice PDF file successfully downloaded
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: "application/pdf"
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="invoice-7687e212-96e7-418b-90ca-dc314eadb4a4-1234567890.pdf"'
 *           Content-Length:
 *             description: File size in bytes
 *             schema:
 *               type: integer
 *               example: 45678
 *       400:
 *         description: Bad request - Invoice can only be downloaded for successful payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invoice can only be downloaded for successful payments"
 *       401:
 *         description: Unauthorized - Authentication required or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: Booking not found or user does not own the booking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Booking not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get(
  '/:bookingId/invoice',
  authenticate,
  validate(getBookingDetailsSchema),
  bookingController.downloadInvoice
);

export default router;

