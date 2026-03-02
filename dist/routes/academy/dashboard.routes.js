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
const dashboardController = __importStar(require("../../controllers/academy/dashboard.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.get('/', auth_middleware_1.authenticate, dashboardController.getDashboard);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map