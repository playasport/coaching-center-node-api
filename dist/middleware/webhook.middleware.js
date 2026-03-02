"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = void 0;
const PaymentService_1 = require("../services/common/payment/PaymentService");
const logger_1 = require("../utils/logger");
const paymentService = (0, PaymentService_1.getPaymentService)();
/**
 * Verify Razorpay webhook signature using the raw request body
 * and the webhook secret (configured in Razorpay Dashboard).
 *
 * Raw body is captured by express.json()'s `verify` callback in app.ts.
 */
const verifyWebhookSignature = async (req, res, next) => {
    try {
        const razorpaySignature = req.headers['x-razorpay-signature'];
        const rawBody = req.rawBody;
        if (!razorpaySignature) {
            logger_1.logger.warn('Webhook signature missing', {
                path: req.path,
            });
            res.status(400).json({ error: 'Missing webhook signature' });
            return;
        }
        if (!rawBody) {
            logger_1.logger.warn('Webhook raw body not available — verify that express.json verify callback is configured');
            res.status(400).json({ error: 'Unable to verify webhook signature' });
            return;
        }
        const isValidSignature = await paymentService.verifyWebhookSignature(rawBody, razorpaySignature);
        if (!isValidSignature) {
            logger_1.logger.warn('Invalid webhook signature', {
                path: req.path,
            });
            res.status(400).json({ error: 'Invalid webhook signature' });
            return;
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Webhook signature verification error:', {
            error: error instanceof Error ? error.message : error,
            path: req.path,
        });
        res.status(500).json({ error: 'Webhook verification failed' });
    }
};
exports.verifyWebhookSignature = verifyWebhookSignature;
//# sourceMappingURL=webhook.middleware.js.map