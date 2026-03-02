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
const dashboardController = __importStar(require("../../controllers/admin/dashboard.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const router = (0, express_1.Router)();
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
router.get('/stats', auth_middleware_1.authenticate, admin_middleware_1.requireAdmin, (0, permission_middleware_1.requirePermission)(section_enum_1.Section.DASHBOARD, section_enum_2.Action.VIEW), dashboardController.getDashboardStats);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map