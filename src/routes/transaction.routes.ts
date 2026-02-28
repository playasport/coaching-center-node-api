import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { validate } from '../middleware/validation.middleware';
import { userTransactionListSchema, getUserTransactionByIdSchema } from '../validations/transaction.validation';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /user/transactions:
 *   get:
 *     summary: Get user's transactions
 *     tags: [User Transactions]
 *     description: Retrieve a paginated list of the authenticated user's transactions including payment and refund records with associated booking details. Requires authentication.
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
 *           enum: [pending, processing, success, failed, cancelled, refunded]
 *         description: Filter by transaction status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [payment, refund, partial_refund]
 *         description: Filter by transaction type
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
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order by date (default newest first)
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                         properties:
 *                           id:
 *                             type: string
 *                           transaction_id:
 *                             type: string
 *                             example: "TXN-20260228-105530-A7B3C1"
 *                           status:
 *                             type: string
 *                             enum: [pending, processing, success, failed, cancelled, refunded]
 *                           amount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           payment_method:
 *                             type: string
 *                             nullable: true
 *                           rorder_id:
 *                             type: string
 *                           payment_id:
 *                             type: string
 *                             nullable: true
 *                           failure_reason:
 *                             type: string
 *                             nullable: true
 *                           processed_at:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           booking:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               booking_id:
 *                                 type: string
 *                               batch_name:
 *                                 type: string
 *                                 nullable: true
 *                               center_name:
 *                                 type: string
 *                                 nullable: true
 *                               sport_name:
 *                                 type: string
 *                                 nullable: true
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
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
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
  validate(userTransactionListSchema),
  transactionController.getUserTransactions
);

/**
 * @swagger
 * /user/transactions/{transactionId}:
 *   get:
 *     summary: Get transaction details by ID
 *     tags: [User Transactions]
 *     description: Retrieve detailed information about a specific transaction belonging to the authenticated user, including associated booking, batch, center, sport, and participant details. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID (UUID)
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
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
 *                       properties:
 *                         id:
 *                           type: string
 *                         transaction_id:
 *                           type: string
 *                           example: "TXN-20260228-105530-A7B3C1"
 *                         status:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         payment_method:
 *                           type: string
 *                           nullable: true
 *                         rorder_id:
 *                           type: string
 *                         payment_id:
 *                           type: string
 *                           nullable: true
 *                         refund_id:
 *                           type: string
 *                           nullable: true
 *                         failure_reason:
 *                           type: string
 *                           nullable: true
 *                         processed_at:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         booking:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                             booking_id:
 *                               type: string
 *                             amount:
 *                               type: number
 *                             currency:
 *                               type: string
 *                             status:
 *                               type: string
 *                             payment:
 *                               type: object
 *                               nullable: true
 *                             participants:
 *                               type: array
 *                               items:
 *                                 type: object
 *                             batch:
 *                               type: object
 *                               nullable: true
 *                             center:
 *                               type: object
 *                               nullable: true
 *                             sport:
 *                               type: object
 *                               nullable: true
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/:transactionId',
  authenticate,
  validate(getUserTransactionByIdSchema),
  transactionController.getTransactionById
);

export default router;
