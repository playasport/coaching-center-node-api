import { Router } from 'express';
import * as dashboardController from '../../controllers/admin/dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve comprehensive dashboard statistics including users, coaching centers, bookings, batches, employees, and more
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStatsResponse'
 *             example:
 *               success: true
 *               message: "Statistics retrieved successfully"
 *               data:
 *                 stats:
 *                   users:
 *                     total: 1000
 *                     active: 950
 *                     inactive: 50
 *                   coachingCenters:
 *                     total: 150
 *                     active: 140
 *                     inactive: 10
 *                   bookings:
 *                     total: 500
 *                     pending: 50
 *                     completed: 450
 *                   batches:
 *                     total: 200
 *                     active: 180
 *                     inactive: 20
 *                   employees:
 *                     total: 300
 *                     active: 280
 *                     inactive: 20
 *                   students:
 *                     total: 800
 *                   participants:
 *                     total: 1200
 *                   revenue:
 *                     total: 2500000
 *                     today: 50000
 *                     thisWeek: 350000
 *                     thisMonth: 1200000
 *                   transactions:
 *                     statusBreakdown:
 *                       completed:
 *                         count: 800
 *                         totalAmount: 2400000
 *                       pending:
 *                         count: 50
 *                         totalAmount: 75000
 *                       failed:
 *                         count: 50
 *                         totalAmount: 25000
 *                   newRegistrations:
 *                     users: 150
 *                     academies: 25
 *                     period: "last_7_days"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Forbidden - Insufficient permissions"
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  requirePermission(Section.DASHBOARD, Action.VIEW),
  dashboardController.getDashboardStats
);

export default router;
