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
exports.handleRazorpayWebhook = void 0;
const logger_1 = require("../utils/logger");
const webhookService = __importStar(require("../services/common/webhook.service"));
/**
 * Handle Razorpay webhook
 */
const handleRazorpayWebhook = async (req, res) => {
    try {
        const payload = req.body;
        // Verify it's a Razorpay webhook
        if (!payload.event || !payload.payload) {
            logger_1.logger.warn('Invalid webhook payload structure', { payload });
            res.status(400).json({ error: 'Invalid webhook payload' });
            return;
        }
        // Process webhook asynchronously (don't wait for it to complete)
        webhookService.handleWebhook(payload).catch((error) => {
            logger_1.logger.error('Error processing webhook asynchronously:', {
                error: error instanceof Error ? error.message : error,
                event: payload.event,
            });
        });
        // Respond immediately to Razorpay
        res.status(200).json({ received: true });
    }
    catch (error) {
        logger_1.logger.error('Webhook handler error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Still respond 200 to Razorpay to prevent retries
        res.status(200).json({ received: true, error: 'Processing error' });
    }
};
exports.handleRazorpayWebhook = handleRazorpayWebhook;
//# sourceMappingURL=webhook.controller.js.map