import { Router } from 'express';
import * as adminBookingController from '../../controllers/admin/booking.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: Get all bookings for admin
 *     tags: [Admin Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *         description: Filter by center ID
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *         description: Filter by batch ID
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by booking ID or payment reference
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Successfully retrieved bookings
 * 
 * /admin/bookings/stats:
 *   get:
 *     summary: Get booking statistics for admin dashboard
 *     tags: [Admin Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter statistics from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter statistics until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successfully retrieved booking statistics
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
 *                   example: "Booking statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 1250
 *                         byStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             pending: 50
 *                             confirmed: 1100
 *                             cancelled: 80
 *                             completed: 20
 *                         byPaymentStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             pending: 30
 *                             processing: 20
 *                             success: 1150
 *                             failed: 30
 *                             refunded: 10
 *                             cancelled: 10
 *                         totalAmount:
 *                           type: number
 *                           example: 6250000
 *                         amountByPaymentStatus:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             pending: 150000
 *                             processing: 100000
 *                             success: 5750000
 *                             failed: 150000
 *                             refunded: 50000
 *                             cancelled: 50000
 *                         byPaymentMethod:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             card: 700
 *                             netbanking: 250
 *                             upi: 200
 *                             wallet: 100
 *                       example:
 *                         total: 1250
 *                         byStatus:
 *                           pending: 50
 *                           confirmed: 1100
 *                           cancelled: 80
 *                           completed: 20
 *                         byPaymentStatus:
 *                           pending: 30
 *                           processing: 20
 *                           success: 1150
 *                           failed: 30
 *                           refunded: 10
 *                           cancelled: 10
 *                         totalAmount: 6250000
 *                         amountByPaymentStatus:
 *                           pending: 150000
 *                           processing: 100000
 *                           success: 5750000
 *                           failed: 150000
 *                           refunded: 50000
 *                           cancelled: 50000
 *                         byPaymentMethod:
 *                           card: 700
 *                           netbanking: 250
 *                           upi: 200
 *                           wallet: 100
 * 
 * /admin/bookings/{id}/invoice:
 *   get:
 *     summary: Download booking invoice as PDF
 *     tags: [Admin Bookings]
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
 *         description: PDF invoice file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Booking not found
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
 *         description: Failed to generate invoice
 * 
 * /admin/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Admin Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved booking
 *   patch:
 *     summary: Update booking status
 *     tags: [Admin Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 */

router.get('/stats', adminBookingController.getBookingStats);
router.get('/:id/invoice', adminBookingController.downloadBookingInvoice);
router.get('/', adminBookingController.getAllBookings);
router.get('/:id', adminBookingController.getBookingById);
router.patch('/:id', adminBookingController.updateBookingStatus);

export default router;
