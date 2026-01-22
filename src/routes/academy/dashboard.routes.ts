import { Router } from 'express';
import * as dashboardController from '../../controllers/academy/dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /academy/dashboard:
 *   get:
 *     summary: Get academy dashboard statistics
 *     tags: [Academy Dashboard]
 *     description: Retrieve comprehensive dashboard statistics for the authenticated academy user including total users, students, bookings, active batches, earnings, monthly earnings graph data, and recent bookings. Data is cached for 5 minutes to optimize performance.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     total_users:
 *                       type: integer
 *                       description: Total unique users who have made bookings
 *                       example: 150
 *                     total_students:
 *                       type: integer
 *                       description: Total unique students/participants enrolled
 *                       example: 250
 *                     total_bookings:
 *                       type: integer
 *                       description: Total number of bookings
 *                       example: 500
 *                     total_active_batches:
 *                       type: integer
 *                       description: Total number of active batches
 *                       example: 25
 *                     total_earnings:
 *                       type: number
 *                       description: Total earnings from completed payouts
 *                       example: 500000
 *                     monthly_earnings:
 *                       type: array
 *                       description: Monthly earnings for last 12 months (for graph)
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             format: YYYY-MM
 *                             example: "2024-01"
 *                           earnings:
 *                             type: number
 *                             example: 45000
 *                     recent_bookings:
 *                       type: array
 *                       description: Recent 5 bookings
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "booking-uuid"
 *                           booking_id:
 *                             type: string
 *                             nullable: true
 *                             example: "BK123456"
 *                           student_name:
 *                             type: string
 *                             description: Comma-separated student names
 *                             example: "John Doe, Jane Smith"
 *                           batch_name:
 *                             type: string
 *                             example: "Morning Batch"
 *                           sport_name:
 *                             type: string
 *                             example: "Cricket"
 *                           booking_time:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00Z"
 *                 message:
 *                   type: string
 *                   example: "Dashboard statistics retrieved successfully"
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  dashboardController.getDashboard
);

export default router;
