"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayGateway = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../../../utils/logger");
const ApiError_1 = require("../../../../utils/ApiError");
/**
 * Razorpay Payment Gateway Implementation
 */
class RazorpayGateway {
    constructor() {
        this.razorpay = null;
        this.keySecret = '';
        this.webhookSecret = '';
    }
    initialize(credentials) {
        if (!credentials.keyId || !credentials.keySecret) {
            throw new Error('Razorpay keyId and keySecret are required');
        }
        this.keySecret = credentials.keySecret;
        this.webhookSecret = credentials.webhookSecret || credentials.keySecret;
        this.razorpay = new razorpay_1.default({
            key_id: credentials.keyId,
            key_secret: credentials.keySecret,
        });
        logger_1.logger.info('Razorpay gateway initialized successfully', {
            hasWebhookSecret: !!credentials.webhookSecret,
        });
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
            // Log detailed error information
            const errorDetails = {
                message: error.message || 'Unknown error',
                description: error.description || error.error?.description,
                field: error.field || error.error?.field,
                code: error.code || error.error?.code,
                statusCode: error.statusCode || error.statusCode,
                error: error.error || error,
                orderData: {
                    amount: orderData.amount,
                    currency: orderData.currency,
                    receipt: orderData.receipt,
                },
            };
            logger_1.logger.error('Razorpay order creation failed:', errorDetails);
            // Provide more specific error messages based on error type
            let errorMessage = 'Failed to create payment order. Please try again.';
            let statusCode = 500;
            if (error.statusCode === 401 || error.statusCode === 403) {
                errorMessage = 'Failed to create payment order. Please try again.';
                statusCode = 500; // Don't expose auth issues to client
            }
            else if (error.statusCode === 400) {
                // Validation error from Razorpay
                errorMessage = error.description || error.error?.description || 'Invalid payment order data.';
                statusCode = 400;
            }
            else if (error.code === 'BAD_REQUEST_ERROR') {
                errorMessage = error.description || 'Invalid payment order request.';
                statusCode = 400;
            }
            else if (error.code === 'GATEWAY_ERROR' || error.code === 'SERVER_ERROR') {
                errorMessage = 'Payment gateway is temporarily unavailable. Please try again later.';
                statusCode = 503;
            }
            throw new ApiError_1.ApiError(statusCode, errorMessage);
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
    verifyWebhookSignature(payload, signature) {
        if (!this.webhookSecret) {
            throw new Error('Razorpay gateway not initialized or webhook secret missing');
        }
        try {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', this.webhookSecret)
                .update(payload)
                .digest('hex');
            return crypto_1.default.timingSafeEqual(Buffer.from(generatedSignature, 'hex'), Buffer.from(signature, 'hex'));
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