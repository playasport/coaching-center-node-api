import { Router } from 'express';
import * as payoutController from '../../controllers/academy/payout.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /academy/my-payouts:
 *   get:
 *     summary: Get payouts for academy (list with basic data)
 *     tags: [Academy Payouts]
 *     description: Retrieve payouts for the authenticated academy user with basic information. Returns only payouts belonging to the authenticated academy user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, refunded]
 *         description: Filter by payout status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Payouts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "payout-uuid"
 *                           booking_id:
 *                             type: string
 *                             nullable: true
 *                             example: "BK123456"
 *                           payout_amount:
 *                             type: number
 *                             example: 4050
 *                           currency:
 *                             type: string
 *                             example: "INR"
 *                           status:
 *                             type: string
 *                             enum: [pending, processing, completed, failed, cancelled, refunded]
 *                             example: "pending"
 *                           payout_status:
 *                             type: string
 *                             enum: [not_initiated, pending, processing, completed, failed, cancelled, refunded]
 *                             example: "pending"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                 message:
 *                   type: string
 *                   example: "Payouts retrieved successfully"
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  payoutController.getPayouts
);

/**
 * @swagger
 * /academy/my-payouts/stats:
 *   get:
 *     summary: Get payout statistics for academy
 *     tags: [Academy Payouts]
 *     description: Get aggregated payout statistics for the authenticated academy user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_pending:
 *                       type: integer
 *                       example: 5
 *                     total_processing:
 *                       type: integer
 *                       example: 2
 *                     total_completed:
 *                       type: integer
 *                       example: 50
 *                     total_failed:
 *                       type: integer
 *                       example: 1
 *                     total_pending_amount:
 *                       type: number
 *                       example: 25000
 *                     total_completed_amount:
 *                       type: number
 *                       example: 200000
 *                     total_failed_amount:
 *                       type: number
 *                       example: 5000
 *                 message:
 *                   type: string
 *                   example: "Payout statistics retrieved successfully"
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/stats',
  authenticate,
  payoutController.getPayoutStats
);

/**
 * @swagger
 * /academy/my-payouts/{id}:
 *   get:
 *     summary: Get payout details by ID for academy
 *     tags: [Academy Payouts]
 *     description: Retrieve detailed payout information for the authenticated academy user. Only returns payout if it belongs to the authenticated academy user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID
 *     responses:
 *       200:
 *         description: Payout retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "payout-uuid"
 *                     booking:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         booking_id:
 *                           type: string
 *                           nullable: true
 *                         currency:
 *                           type: string
 *                         payout_status:
 *                           type: string
 *                           enum: [not_initiated, pending, processing, completed, failed, cancelled, refunded]
 *                     payout_amount:
 *                       type: number
 *                       example: 4050
 *                     currency:
 *                       type: string
 *                       example: "INR"
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed, cancelled, refunded]
 *                       example: "pending"
 *                     failure_reason:
 *                       type: string
 *                       nullable: true
 *                     processed_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                 message:
 *                   type: string
 *                   example: "Payout retrieved successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payout not found
 */
router.get(
  '/:id',
  authenticate,
  payoutController.getPayoutById
);

export default router;
