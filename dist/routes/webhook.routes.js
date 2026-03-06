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
const webhookController = __importStar(require("../controllers/webhook.controller"));
const webhook_middleware_1 = require("../middleware/webhook.middleware");
const router = (0, express_1.Router)();
/** WhatsApp Cloud API: GET for webhook verification (Meta subscription) */
router.get('/whatsapp', webhookController.handleWhatsAppWebhookVerify);
/** WhatsApp Cloud API: POST for incoming messages */
router.post('/whatsapp', webhookController.handleWhatsAppWebhook);
/**
 * @swagger
 * /webhook/razorpay:
 *   post:
 *     summary: Razorpay webhook endpoint
 *     tags: [Webhook]
 *     description: |
 *       Webhook endpoint for Razorpay payment events. This endpoint:
 *       - Verifies webhook signature for security
 *       - Handles payment.captured, payment.failed, and order.paid events
 *       - Updates booking and transaction records automatically
 *       - Does not require authentication (called by Razorpay)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entity:
 *                 type: string
 *               account_id:
 *                 type: string
 *               event:
 *                 type: string
 *                 example: "payment.captured"
 *               payload:
 *                 type: object
 *                 description: Razorpay webhook payload containing payment/order details
 *                 properties:
 *                   payment:
 *                     type: object
 *                     description: Payment entity (for payment.captured and payment.failed events)
 *                   order:
 *                     type: object
 *                     description: Order entity (for order.paid event)
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook signature or payload
 */
router.post('/razorpay', webhook_middleware_1.verifyWebhookSignature, webhookController.handleRazorpayWebhook);
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map