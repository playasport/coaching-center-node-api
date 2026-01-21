import { Router } from 'express';
import * as payoutController from '../../controllers/admin/payout.controller';
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
 * /admin/payouts:
 *   get:
 *     summary: Get all payouts with filters
 *     tags: [Admin Payouts]
 *     description: Retrieve payouts with optional filters (status, academy, date range, etc.)
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
 *         name: academyUserId
 *         schema:
 *           type: string
 *         description: Filter by academy user ID
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *         description: Filter by booking ID
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/',
  requirePermission(Section.PAYOUT, Action.VIEW),
  payoutController.getPayouts
);

/**
 * @swagger
 * /admin/payouts/stats:
 *   get:
 *     summary: Get payout statistics
 *     tags: [Admin Payouts]
 *     description: Get aggregated payout statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/stats',
  requirePermission(Section.PAYOUT, Action.VIEW),
  payoutController.getPayoutStats
);

/**
 * @swagger
 * /admin/payouts/{id}:
 *   get:
 *     summary: Get payout by ID
 *     tags: [Admin Payouts]
 *     description: Retrieve a single payout by ID
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Payout not found
 */
router.get(
  '/:id',
  requirePermission(Section.PAYOUT, Action.VIEW),
  payoutController.getPayoutById
);

/**
 * @swagger
 * /admin/payouts/{id}/transfer:
 *   post:
 *     summary: Create transfer for a payout
 *     tags: [Admin Payouts]
 *     description: Initiate transfer to academy's Razorpay account
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
 *         description: Transfer initiated successfully
 *       400:
 *         description: Invalid payout status or account not ready
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Payout not found
 */
router.post(
  '/:id/transfer',
  requirePermission(Section.PAYOUT, Action.CREATE),
  payoutController.createTransfer
);

/**
 * @swagger
 * /admin/payouts/{id}/retry:
 *   post:
 *     summary: Retry failed transfer
 *     tags: [Admin Payouts]
 *     description: Retry a failed payout transfer
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
 *         description: Transfer retry initiated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/:id/retry',
  requirePermission(Section.PAYOUT, Action.CREATE),
  payoutController.retryTransfer
);

/**
 * @swagger
 * /admin/payouts/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending payout
 *     tags: [Admin Payouts]
 *     description: Cancel a payout that is in pending status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID
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
 *                 example: "Booking cancelled by user"
 *     responses:
 *       200:
 *         description: Payout cancelled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch(
  '/:id/cancel',
  requirePermission(Section.PAYOUT, Action.UPDATE),
  payoutController.cancelPayout
);

/**
 * @swagger
 * /admin/bookings/{bookingId}/refund:
 *   post:
 *     summary: Create refund for a booking
 *     tags: [Admin Refunds]
 *     description: Initiate refund for a confirmed booking. Can be full or partial refund.
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
 *               amount:
 *                 type: number
 *                 description: Refund amount (if not provided, full refund)
 *                 example: 1000
 *               reason:
 *                 type: string
 *                 example: "Booking cancelled by user"
 *     responses:
 *       200:
 *         description: Refund created successfully
 *       400:
 *         description: Invalid booking status or refund amount
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Booking not found
 */
router.post(
  '/bookings/:bookingId/refund',
  requirePermission(Section.PAYOUT, Action.CREATE),
  payoutController.createRefund
);

/**
 * @swagger
 * /admin/refunds/{refundId}:
 *   get:
 *     summary: Get refund details
 *     tags: [Admin Refunds]
 *     description: Get refund details from Razorpay
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: refundId
 *         required: true
 *         schema:
 *           type: string
 *         description: Razorpay refund ID
 *     responses:
 *       200:
 *         description: Refund details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  '/refunds/:refundId',
  requirePermission(Section.PAYOUT, Action.VIEW),
  payoutController.getRefundDetails
);

export default router;
