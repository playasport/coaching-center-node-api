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
const dashboardController = __importStar(require("../controllers/dashboard.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.get('/', auth_middleware_1.authenticate, dashboardController.getUserDashboard);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map