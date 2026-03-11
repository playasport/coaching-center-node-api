"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payoutController = __importStar(require("../../controllers/admin/payout.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const router = (0, express_1.Router)();
// All routes here require authentication and admin role
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
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
router.get('/', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.VIEW), payoutController.getPayouts);
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
router.get('/stats', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.VIEW), payoutController.getPayoutStats);
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
router.get('/:id', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.VIEW), payoutController.getPayoutById);
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
router.post('/:id/transfer', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.CREATE), payoutController.createTransfer);
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
router.post('/:id/retry', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.CREATE), payoutController.retryTransfer);
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
router.patch('/:id/cancel', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.UPDATE), payoutController.cancelPayout);
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
router.post('/bookings/:bookingId/refund', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.CREATE), payoutController.createRefund);
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
router.get('/refunds/:refundId', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.PAYOUT, section_enum_2.Action.VIEW), payoutController.getRefundDetails);
exports.default = router;
//# sourceMappingURL=payout.routes.js.map