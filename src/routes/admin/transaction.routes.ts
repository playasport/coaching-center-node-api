import { Router } from 'express';
import * as adminTransactionController from '../../controllers/admin/transaction.controller';
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
 * /admin/transactions:
 *   get:
 *     summary: Get all transactions for admin
 *     tags: [Admin Transactions]
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
 *           enum: [pending, processing, success, failed, cancelled, refunded]
 *         description: Filter by transaction status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [payment, refund, partial_refund]
 *         description: Filter by transaction type
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [user_verification, webhook, manual]
 *         description: Filter by transaction source
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by transaction ID, Razorpay order ID, payment ID, or refund ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date (YYYY-MM-DD)
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
 *         description: Successfully retrieved transactions
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
 *                   example: "Transactions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example:
 *                         - id: "550e8400-e29b-41d4-a716-446655440000"
 *                           transaction_id: "550e8400-e29b-41d4-a716-446655440000"
 *                           booking_id: "BK123456"
 *                           user_name: "John Doe"
 *                           user_email: "john.doe@example.com"
 *                           amount: 5000
 *                           currency: "INR"
 *                           type: "payment"
 *                           status: "success"
 *                           source: "webhook"
 *                           payment_method: "card"
 *                           razorpay_order_id: "order_MNOP1234567890"
 *                           razorpay_payment_id: "pay_ABCD1234567890"
 *                           razorpay_refund_id: null
 *                           failure_reason: null
 *                           processed_at: "2024-01-15T10:30:00.000Z"
 *                           created_at: "2024-01-15T10:25:00.000Z"
 *                         - id: "660e8400-e29b-41d4-a716-446655440001"
 *                           transaction_id: "660e8400-e29b-41d4-a716-446655440001"
 *                           booking_id: "BK123457"
 *                           user_name: "Jane Smith"
 *                           user_email: "jane.smith@example.com"
 *                           amount: 3000
 *                           currency: "INR"
 *                           type: "refund"
 *                           status: "refunded"
 *                           source: "manual"
 *                           payment_method: "upi"
 *                           razorpay_order_id: "order_QRST1234567890"
 *                           razorpay_payment_id: "pay_EFGH1234567890"
 *                           razorpay_refund_id: "rfnd_IJKL1234567890"
 *                           failure_reason: null
 *                           processed_at: "2024-01-16T14:20:00.000Z"
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
 *                           example: 150
 *                         totalPages:
 *                           type: number
 *                           example: 15
 *                       example:
 *                         page: 1
 *                         limit: 10
 *                         total: 150
 *                         totalPages: 15
 *       400:
 *         description: Bad request - Invalid query parameters
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
 *                   example: "Invalid status value"
 *       403:
 *         description: Forbidden - Insufficient permissions
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
 *                   example: "Forbidden - Insufficient permissions"
 * 
 * /admin/transactions/stats:
 *   get:
 *     summary: Get transaction statistics for admin dashboard
 *     tags: [Admin Transactions]
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
 *         description: Successfully retrieved transaction statistics
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
 *                   example: "Transaction statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 1500
 *                         byStatus:
 *                           type: object
 *                           properties:
 *                             pending:
 *                               type: number
 *                               example: 50
 *                             processing:
 *                               type: number
 *                               example: 10
 *                             success:
 *                               type: number
 *                               example: 1400
 *                             failed:
 *                               type: number
 *                               example: 30
 *                             cancelled:
 *                               type: number
 *                               example: 5
 *                             refunded:
 *                               type: number
 *                               example: 5
 *                         byType:
 *                           type: object
 *                           properties:
 *                             payment:
 *                               type: number
 *                               example: 1450
 *                             refund:
 *                               type: number
 *                               example: 40
 *                             partial_refund:
 *                               type: number
 *                               example: 10
 *                         totalAmount:
 *                           type: number
 *                           example: 7500000
 *                         successAmount:
 *                           type: number
 *                           example: 7250000
 *                         failedAmount:
 *                           type: number
 *                           example: 150000
 *                         refundedAmount:
 *                           type: number
 *                           example: 100000
 *                       example:
 *                         total: 1500
 *                         byStatus:
 *                           pending: 50
 *                           processing: 10
 *                           success: 1400
 *                           failed: 30
 *                           cancelled: 5
 *                           refunded: 5
 *                         byType:
 *                           payment: 1450
 *                           refund: 40
 *                           partial_refund: 10
 *                         totalAmount: 7500000
 *                         successAmount: 7250000
 *                         failedAmount: 150000
 *                         refundedAmount: 100000
 * 
 * /admin/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Admin Transactions]
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
 *         description: Successfully retrieved transaction
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
 *                   example: "Transaction retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction:
 *                       type: object
 *                       example:
 *                         id: "550e8400-e29b-41d4-a716-446655440000"
 *                         booking:
 *                           id: "507f1f77bcf86cd799439011"
 *                           booking_id: "BK123456"
 *                           amount: 5000
 *                           currency: "INR"
 *                           status: "confirmed"
 *                           payment:
 *                             razorpay_order_id: "order_MNOP1234567890"
 *                             razorpay_payment_id: "pay_ABCD1234567890"
 *                             status: "success"
 *                             payment_method: "card"
 *                             paid_at: "2024-01-15T10:30:00.000Z"
 *                           participants:
 *                             - id: "507f1f77bcf86cd799439012"
 *                               firstName: "John"
 *                               lastName: "Doe Jr"
 *                           batch:
 *                             id: "507f1f77bcf86cd799439013"
 *                             name: "Morning Cricket Batch"
 *                           center:
 *                             id: "507f1f77bcf86cd799439014"
 *                             center_name: "Elite Sports Academy"
 *                           sport:
 *                             id: "507f1f77bcf86cd799439015"
 *                             name: "Cricket"
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
 *                         source: "webhook"
 *                         amount: 5000
 *                         currency: "INR"
 *                         payment_method: "card"
 *                         razorpay_signature: "signature_xyz123"
 *                         failure_reason: null
 *                         processed_at: "2024-01-15T10:30:00.000Z"
 *                         created_at: "2024-01-15T10:25:00.000Z"
 *                         updatedAt: "2024-01-15T10:30:00.000Z"
 *       404:
 *         description: Transaction not found
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
 *                   example: "Transaction not found"
 *       403:
 *         description: Forbidden - Insufficient permissions
 */

router.get('/stats', 
  requirePermission(Section.TRANSACTION, Action.VIEW),
  adminTransactionController.getTransactionStats
);

/**
 * @swagger
 * /admin/transactions/export:
 *   get:
 *     summary: Export transactions to Excel, CSV, or PDF
 *     tags: [Admin Transactions]
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
 *           enum: [pending, processing, success, failed, cancelled, refunded]
 *         description: Filter by transaction status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [payment, refund, partial_refund]
 *         description: Filter by transaction type
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [user_verification, webhook, manual]
 *         description: Filter by transaction source
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by transaction ID, Razorpay order ID, payment ID, or refund ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date (YYYY-MM-DD)
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
 *         description: Bad request - Invalid format parameter
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/export', 
  requirePermission(Section.TRANSACTION, Action.VIEW),
  adminTransactionController.exportTransactions
);

router.get('/', 
  requirePermission(Section.TRANSACTION, Action.VIEW),
  adminTransactionController.getAllTransactions
);

router.get('/:id', 
  requirePermission(Section.TRANSACTION, Action.VIEW),
  adminTransactionController.getTransactionById
);

export default router;

