import { Router } from 'express';
import * as adminPaymentController from '../../controllers/admin/payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Get all payments for admin (payment type transactions only)
 *     tags: [Admin Payments]
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
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: Filter by booking ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *         description: Filter by payment method (e.g., card, netbanking, upi, wallet)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by payment ID, Razorpay order ID, or payment ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments until this date (YYYY-MM-DD)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Successfully retrieved payments
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
 *                   example: "Payments retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example:
 *                         - id: "550e8400-e29b-41d4-a716-446655440000"
 *                           payment_id: "550e8400-e29b-41d4-a716-446655440000"
 *                           booking_id: "BK123456"
 *                           user_name: "John Doe"
 *                           user_email: "john.doe@example.com"
 *                           amount: 5000
 *                           currency: "INR"
 *                           status: "success"
 *                           payment_method: "card"
 *                           razorpay_order_id: "order_MNOP1234567890"
 *                           razorpay_payment_id: "pay_ABCD1234567890"
 *                           failure_reason: null
 *                           processed_at: "2024-01-15T10:30:00.000Z"
 *                           created_at: "2024-01-15T10:25:00.000Z"
 *                         - id: "660e8400-e29b-41d4-a716-446655440001"
 *                           payment_id: "660e8400-e29b-41d4-a716-446655440001"
 *                           booking_id: "BK123457"
 *                           user_name: "Jane Smith"
 *                           user_email: "jane.smith@example.com"
 *                           amount: 3000
 *                           currency: "INR"
 *                           status: "failed"
 *                           payment_method: "upi"
 *                           razorpay_order_id: "order_QRST1234567890"
 *                           razorpay_payment_id: "pay_EFGH1234567890"
 *                           failure_reason: "Payment declined by bank"
 *                           processed_at: null
 *                           created_at: "2024-01-15T11:00:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                           example: 1
 *                         limit:
 *                           type: number
 *                           example: 10
 *                         total:
 *                           type: number
 *                           example: 1450
 *                         totalPages:
 *                           type: number
 *                           example: 145
 *                       example:
 *                         page: 1
 *                         limit: 10
 *                         total: 1450
 *                         totalPages: 145
 *       400:
 *         description: Bad request - Invalid query parameters
 *       403:
 *         description: Forbidden - Insufficient permissions
 * 
 * /admin/payments/stats:
 *   get:
 *     summary: Get payment statistics for admin dashboard
 *     tags: [Admin Payments]
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
 *         description: Successfully retrieved payment statistics
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
 *                   example: "Payment statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 1450
 *                         successful:
 *                           type: number
 *                           example: 1400
 *                         failed:
 *                           type: number
 *                           example: 30
 *                         pending:
 *                           type: number
 *                           example: 20
 *                         totalAmount:
 *                           type: number
 *                           example: 7250000
 *                         successfulAmount:
 *                           type: number
 *                           example: 7000000
 *                         failedAmount:
 *                           type: number
 *                           example: 150000
 *                         byPaymentMethod:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             card: 800
 *                             netbanking: 300
 *                             upi: 250
 *                             wallet: 100
 *                       example:
 *                         total: 1450
 *                         successful: 1400
 *                         failed: 30
 *                         pending: 20
 *                         totalAmount: 7250000
 *                         successfulAmount: 7000000
 *                         failedAmount: 150000
 *                         byPaymentMethod:
 *                           card: 800
 *                           netbanking: 300
 *                           upi: 250
 *                           wallet: 100
 * 
 * /admin/payments/{id}:
 *   patch:
 *     summary: Update payment status (manual update by admin)
 *     tags: [Admin Payments]
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
 *                 enum: [pending, processing, success, failed, cancelled]
 *               notes:
 *                 type: string
 *                 description: Optional admin notes about the status update
 *     responses:
 *       200:
 *         description: Payment status updated successfully
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
 *                   example: "Payment status updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       example:
 *                         id: "550e8400-e29b-41d4-a716-446655440000"
 *                         booking:
 *                           id: "507f1f77bcf86cd799439011"
 *                           booking_id: "BK123456"
 *                         user:
 *                           id: "507f1f77bcf86cd799439016"
 *                           firstName: "John"
 *                           lastName: "Doe"
 *                           email: "john.doe@example.com"
 *                           mobile: "+919876543210"
 *                         razorpay_order_id: "order_MNOP1234567890"
 *                         razorpay_payment_id: "pay_ABCD1234567890"
 *                         razorpay_refund_id: null
 *                         type: "payment"
 *                         status: "success"
 *                         source: "manual"
 *                         amount: 5000
 *                         currency: "INR"
 *                         payment_method: "card"
 *                         failure_reason: null
 *                         metadata:
 *                           adminUpdatedBy: "admin-user-id"
 *                           adminUpdatedAt: "2024-01-15T11:00:00.000Z"
 *                           adminNotes: "Manually verified payment"
 *                         processed_at: "2024-01-15T10:30:00.000Z"
 *                         created_at: "2024-01-15T10:25:00.000Z"
 *                         updatedAt: "2024-01-15T11:00:00.000Z"
 *       400:
 *         description: Bad request - Invalid status value
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
 *                   example: "Invalid payment status"
 *       404:
 *         description: Payment not found
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
 *                   example: "Payment not found"
 *       403:
 *         description: Forbidden - Insufficient permissions
 */

router.get('/stats', 
  requirePermission(Section.PAYMENT, Action.VIEW),
  adminPaymentController.getPaymentStats
);

router.get('/', 
  requirePermission(Section.PAYMENT, Action.VIEW),
  adminPaymentController.getAllPayments
);

router.patch('/:id', 
  requirePermission(Section.PAYMENT, Action.UPDATE),
  adminPaymentController.updatePaymentStatus
);

export default router;

