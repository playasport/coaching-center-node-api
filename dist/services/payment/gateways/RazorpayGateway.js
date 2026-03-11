"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayGateway = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../../utils/logger");
const ApiError_1 = require("../../../utils/ApiError");
/**
 * Razorpay Payment Gateway Implementation
 */
class RazorpayGateway {
    constructor() {
        this.razorpay = null;
        this.keySecret = '';
    }
    /**
     * Initialize Razorpay with credentials
     */
    initialize(credentials) {
        if (!credentials.keyId || !credentials.keySecret) {
            throw new Error('Razorpay keyId and keySecret are required');
        }
        this.keySecret = credentials.keySecret;
        this.razorpay = new razorpay_1.default({
            key_id: credentials.keyId,
            key_secret: credentials.keySecret,
        });
        logger_1.logger.info('Razorpay gateway initialized successfully');
    }
    /**
     * Create a Razorpay order
     */
    async createOrder(orderData) {
        if (!this.razorpay) {
            throw new Error('Razorpay gateway not initialized');
        }
        try {
            const razorpayOrder = await this.razorpay.orders.create({
                amount: orderData.amount,
                currency: orderData.currency,
                receipt: orderData.receipt,
                notes: orderData.notes || {},
            });
            // Normalize response
            return {
                id: razorpayOrder.id,
                amount: typeof razorpayOrder.amount === 'string'
                    ? parseInt(razorpayOrder.amount, 10)
                    : razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt || orderData.receipt,
                status: razorpayOrder.status,
                created_at: razorpayOrder.created_at,
                entity: razorpayOrder.entity || 'order',
                amount_paid: typeof razorpayOrder.amount_paid === 'string'
                    ? parseInt(razorpayOrder.amount_paid, 10)
                    : (razorpayOrder.amount_paid || 0),
                amount_due: typeof razorpayOrder.amount_due === 'string'
                    ? parseInt(razorpayOrder.amount_due, 10)
                    : (razorpayOrder.amount_due || 0),
                attempts: razorpayOrder.attempts || 0,
            };
        }
        catch (error) {
            logger_1.logger.error('Razorpay order creation failed:', {
                error: error.message || error,
                orderData,
            });
            throw new ApiError_1.ApiError(500, 'Failed to create payment order. Please try again.');
        }
    }
    /**
     * Verify Razorpay payment signature
     */
    verifyPaymentSignature(orderId, paymentId, signature) {
        if (!this.keySecret) {
            throw new Error('Razorpay gateway not initialized');
        }
        try {
            const text = `${orderId}|${paymentId}`;
            const generatedSignature = crypto_1.default
                .createHmac('sha256', this.keySecret)
                .update(text)
                .digest('hex');
            return generatedSignature === signature;
        }
        catch (error) {
            logger_1.logger.error('Error verifying Razorpay signature:', {
                error: error instanceof Error ? error.message : error,
            });
            return false;
        }
    }
    /**
     * Fetch payment details from Razorpay
     */
    async fetchPayment(paymentId) {
        if (!this.razorpay) {
            throw new Error('Razorpay gateway not initialized');
        }
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return {
                id: payment.id,
                amount: typeof payment.amount === 'string'
                    ? parseInt(payment.amount, 10)
                    : payment.amount,
                currency: payment.currency,
                status: payment.status,
                method: payment.method || undefined,
                order_id: payment.order_id,
                created_at: payment.created_at,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch payment from Razorpay:', {
                error: error.message || error,
                paymentId,
            });
            throw new ApiError_1.ApiError(500, 'Failed to fetch payment details from Razorpay');
        }
    }
    /**
     * Verify Razorpay webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.keySecret) {
            throw new Error('Razorpay gateway not initialized');
        }
        try {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', this.keySecret)
                .update(payload)
                .digest('hex');
            return generatedSignature === signature;
        }
        catch (error) {
            logger_1.logger.error('Error verifying Razorpay webhook signature:', {
                error: error instanceof Error ? error.message : error,
            });
            return false;
        }
    }
}
exports.RazorpayGateway = RazorpayGateway;
//# sourceMappingURL=RazorpayGateway.js.map