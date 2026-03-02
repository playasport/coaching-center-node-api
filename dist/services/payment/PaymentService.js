"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentService = exports.PaymentService = exports.PaymentGatewayType = void 0;
const RazorpayGateway_1 = require("./gateways/RazorpayGateway");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
/**
 * Payment Gateway Type
 */
var PaymentGatewayType;
(function (PaymentGatewayType) {
    PaymentGatewayType["RAZORPAY"] = "razorpay";
    // Add more payment gateways here in the future
    // STRIPE = 'stripe',
    // PAYU = 'payu',
    // CASHFREE = 'cashfree',
})(PaymentGatewayType || (exports.PaymentGatewayType = PaymentGatewayType = {}));
/**
 * Payment Service
 * This service acts as a facade for payment gateway operations
 * It allows easy switching between different payment gateways
 */
class PaymentService {
    constructor(gatewayType = PaymentGatewayType.RAZORPAY) {
        this.gateway = null;
        this.gatewayType = gatewayType;
        this.initializeGateway();
    }
    /**
     * Initialize the payment gateway based on type
     */
    initializeGateway() {
        switch (this.gatewayType) {
            case PaymentGatewayType.RAZORPAY:
                this.gateway = new RazorpayGateway_1.RazorpayGateway();
                this.gateway.initialize({
                    keyId: env_1.config.razorpay.keyId,
                    keySecret: env_1.config.razorpay.keySecret,
                });
                break;
            // Add more payment gateway initializations here
            // case PaymentGatewayType.STRIPE:
            //   this.gateway = new StripeGateway();
            //   this.gateway.initialize({
            //     apiKey: config.stripe.apiKey,
            //     secretKey: config.stripe.secretKey,
            //   });
            //   break;
            default:
                throw new Error(`Unsupported payment gateway type: ${this.gatewayType}`);
        }
        logger_1.logger.info(`Payment service initialized with gateway: ${this.gatewayType}`);
    }
    /**
     * Create a payment order
     */
    async createOrder(orderData) {
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.createOrder(orderData);
    }
    /**
     * Verify payment signature
     */
    verifyPaymentSignature(orderId, paymentId, signature) {
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.verifyPaymentSignature(orderId, paymentId, signature);
    }
    /**
     * Fetch payment details
     */
    async fetchPayment(paymentId) {
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.fetchPayment(paymentId);
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.verifyWebhookSignature(payload, signature);
    }
    /**
     * Get current gateway type
     */
    getGatewayType() {
        return this.gatewayType;
    }
}
exports.PaymentService = PaymentService;
// Export singleton instance
let paymentServiceInstance = null;
/**
 * Get payment service instance (singleton)
 */
const getPaymentService = () => {
    if (!paymentServiceInstance) {
        const gatewayType = env_1.config.payment.gateway || PaymentGatewayType.RAZORPAY;
        paymentServiceInstance = new PaymentService(gatewayType);
    }
    return paymentServiceInstance;
};
exports.getPaymentService = getPaymentService;
//# sourceMappingURL=PaymentService.js.map