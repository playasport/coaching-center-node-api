import { Router } from 'express';
import * as bookingController from '../../controllers/academy/booking.controller';
import { validate } from '../../middleware/validation.middleware';
import {
  academyBookingListSchema,
  academyBookingActionSchema,
  academyBookingExportSchema,
} from '../../validations/booking.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

/**
 * @swagger
 * /academy/booking:
 *   get:
 *     operationId: getAcademyBookings
 *     summary: Get bookings for academy
 *     tags: [Academy Booking]
 *     description: Retrieve a paginated list of bookings for coaching centers owned by the authenticated academy user. Requires authentication and ACADEMY role.
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
 *         name: centerId
 *         schema:
 *           type: string
 *         description: Filter by coaching center ID
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [slot_booked, approved, rejected, payment_pending, confirmed, cancelled, completed, requested, pending]
 *         description: "Filter by booking status (includes new statuses: slot_booked, approved, rejected)"
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [not_initiated, initiated, pending, processing, success, failed, refunded, cancelled]
 *         description: "Filter by payment status (includes new statuses: not_initiated, initiated)"
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
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
 *                   example: "Bookings retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BookingListItem'
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
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get(
  '/',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyBookingListSchema),
  bookingController.getBookings
);

/**
 * @swagger
 * /academy/booking/export:
 *   get:
 *     summary: Export academy bookings
 *     tags: [Academy Booking]
 *     description: Export bookings to Excel, CSV, or PDF format with date range and type filters. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [excel, csv, pdf]
 *         description: Export format (excel, csv, or pdf)
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *         description: Filter by coaching center ID
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [slot_booked, approved, rejected, payment_pending, confirmed, cancelled, completed, requested, pending]
 *         description: Filter by booking status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [not_initiated, initiated, pending, processing, success, failed, refunded, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter by start date (YYYY-MM-DD)
 *         example: '2024-01-01'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filter by end date (YYYY-MM-DD)
 *         example: '2024-12-31'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, confirmed, pending, cancelled, rejected]
 *         description: Filter by booking type (all, confirmed, pending, cancelled, rejected)
 *         example: 'all'
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *             description: Excel file (when format=excel)
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *             description: CSV file (when format=csv)
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             description: PDF file (when format=pdf)
 *       400:
 *         description: Bad request - Invalid format or date format
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
 *                   example: "Format must be one of: excel, csv, pdf"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 */
router.get(
  '/export',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyBookingExportSchema),
  bookingController.exportBookings
);

/**
 * @swagger
 * /academy/booking/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Academy Booking]
 *     description: Retrieve a booking by its ID. The booking must belong to one of the academy's coaching centers. Returns booking details with user, participants, batch, center, and sport information. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID (UUID)
 *         example: "f316a86c-2909-4d32-8983-eb225c715bcb"
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
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
 *                   example: "Booking retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyBookingDetailsResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Booking not found
 */
router.get(
  '/:id',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  bookingController.getBookingById
);

/**
 * @swagger
 * /academy/booking/{id}/approve:
 *   post:
 *     summary: Approve booking request
 *     tags: [Academy Booking]
 *     description: Approve a booking request. The booking must be in SLOT_BOOKED status and belong to one of the academy's coaching centers. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking request approved successfully
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
 *                   example: "Booking request approved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyBookingActionResponse'
 *       400:
 *         description: Booking request not found or already processed
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Booking not found
 */
router.post(
  '/:id/approve',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  bookingController.approveBookingRequest
);

/**
 * @swagger
 * /academy/booking/{id}/reject:
 *   post:
 *     summary: Reject booking request
 *     tags: [Academy Booking]
 *     description: Reject a booking request with a reason. The booking must be in SLOT_BOOKED status and belong to one of the academy's coaching centers. Requires authentication and ACADEMY role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                 maxLength: 1000
 *                 description: Rejection reason (required)
 *                 example: "Batch is full"
 *     responses:
 *       200:
 *         description: Booking request rejected successfully
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
 *                   example: "Booking request rejected successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AcademyBookingActionResponse'
 *       400:
 *         description: Booking request not found, already processed, or validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - ACADEMY role required
 *       404:
 *         description: Booking not found
 */
router.post(
  '/:id/reject',
  authenticate,
  authorize(DefaultRoles.ACADEMY),
  validate(academyBookingActionSchema),
  bookingController.rejectBookingRequest
);

export default router;
