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
const bookingController = __importStar(require("../controllers/booking.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const booking_validation_1 = require("../validations/booking.validation");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /public/booking/pay:
 *   get:
 *     summary: Get booking by payment token (no auth)
 *     tags: [Public Booking]
 *     description: For the public pay page. Returns booking details, status, and payment_enabled so frontend can show Pay button or already paid/cancelled/expired state. Token is set when academy approves booking (24h expiry).
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment token from the pay URL (e.g. /pay?token=xxx)
 *     responses:
 *       200:
 *         description: Booking details for pay page
 *       400:
 *         description: Invalid token or link expired
 *       404:
 *         description: Payment link invalid or expired
 */
router.get('/pay', (0, validation_middleware_1.validate)(booking_validation_1.publicPayQuerySchema), bookingController.getPublicPayBooking);
/**
 * @swagger
 * /public/booking/create-order:
 *   post:
 *     summary: Create Razorpay order by payment token (no auth)
 *     tags: [Public Booking]
 *     description: Call when user clicks Pay on the public pay page. Returns Razorpay order for checkout. Payment is verified by webhook after user pays.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Payment token from the pay URL
 *     responses:
 *       201:
 *         description: Payment order created; use razorpayOrder to open Razorpay checkout
 *       400:
 *         description: Invalid token, link expired, or already paid
 *       404:
 *         description: Booking not found or payment not available
 */
router.post('/create-order', (0, validation_middleware_1.validate)(booking_validation_1.publicCreateOrderSchema), bookingController.createPublicOrder);
exports.default = router;
//# sourceMappingURL=publicBooking.routes.js.map