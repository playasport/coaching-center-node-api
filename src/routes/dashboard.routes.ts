import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /user/dashboard:
 *   get:
 *     summary: Get user dashboard
 *     tags: [User Dashboard]
 *     description: Retrieve dashboard statistics for the authenticated user including total bookings, total participants, total bookmarks, and the 5 most recent bookings.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dashboard retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_bookings:
 *                       type: integer
 *                       example: 12
 *                     total_participants:
 *                       type: integer
 *                       example: 3
 *                     total_bookmarks:
 *                       type: integer
 *                       example: 5
 *                     recent_bookings:
 *                       type: array
 *                       maxItems: 5
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           booking_id:
 *                             type: string
 *                             nullable: true
 *                           status:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           payment_status:
 *                             type: string
 *                           batch_name:
 *                             type: string
 *                           center_name:
 *                             type: string
 *                           sport_name:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/',
  authenticate,
  dashboardController.getUserDashboard
);

export default router;
