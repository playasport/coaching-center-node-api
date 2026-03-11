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
exports.getPaymentService = exports.PaymentService = exports.PaymentGatewayType = void 0;
const RazorpayGateway_1 = require("./gateways/RazorpayGateway");
const env_1 = require("../../../config/env");
const logger_1 = require("../../../utils/logger");
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
        this.initializationPromise = null;
        this.gatewayType = gatewayType;
    }
    /**
     * Ensure gateway is initialized before use
     */
    async ensureInitialized() {
        if (this.gateway) {
            return; // Already initialized
        }
        if (this.initializationPromise) {
            return this.initializationPromise; // Initialization in progress
        }
        this.initializationPromise = this.initializeGateway();
        try {
            await this.initializationPromise;
        }
        catch (error) {
            this.initializationPromise = null; // Reset on error to allow retry
            throw error;
        }
    }
    /**
     * Initialize the payment gateway based on type
     */
    async initializeGateway() {
        switch (this.gatewayType) {
            case PaymentGatewayType.RAZORPAY:
                const { getPaymentCredentials } = await Promise.resolve().then(() => __importStar(require('../settings.service')));
                const credentials = await getPaymentCredentials();
                if (!credentials.keyId || !credentials.keySecret) {
                    logger_1.logger.error('Payment gateway credentials not configured', {
                        hasKeyId: !!credentials.keyId,
                        hasKeySecret: !!credentials.keySecret,
                    });
                    throw new Error('Payment gateway credentials not configured. Please configure Razorpay credentials in settings.');
                }
                const keyId = credentials.keyId.trim();
                const keySecret = credentials.keySecret.trim();
                if (!keyId || !keySecret) {
                    logger_1.logger.error('Payment gateway credentials are empty after trimming');
                    throw new Error('Payment gateway credentials are invalid. Please check your Razorpay configuration.');
                }
                const webhookSecret = credentials.webhookSecret?.trim() || '';
                if (!webhookSecret) {
                    logger_1.logger.warn('Razorpay webhook secret not configured — falling back to API key secret for webhook verification');
                }
                this.gateway = new RazorpayGateway_1.RazorpayGateway();
                this.gateway.initialize({
                    keyId,
                    keySecret,
                    webhookSecret,
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
     * Check if payment is enabled
     */
    async isPaymentEnabled() {
        try {
            const { getSettingValue } = await Promise.resolve().then(() => __importStar(require('../settings.service')));
            const paymentEnabled = (await getSettingValue('payment.enabled'));
            return paymentEnabled ?? true; // Default to enabled if not set
        }
        catch (error) {
            logger_1.logger.error('Failed to check payment enabled status', error);
            return true; // Default to enabled on error
        }
    }
    /**
     * Create a payment order
     */
    async createOrder(orderData) {
        // Ensure gateway is initialized
        await this.ensureInitialized();
        // Check if payment is enabled
        const isEnabled = await this.isPaymentEnabled();
        if (!isEnabled) {
            throw new Error('Payment gateway is currently disabled. Please contact support.');
        }
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.createOrder(orderData);
    }
    /**
     * Verify payment signature
     */
    async verifyPaymentSignature(orderId, paymentId, signature) {
        await this.ensureInitialized();
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.verifyPaymentSignature(orderId, paymentId, signature);
    }
    /**
     * Fetch payment details
     */
    async fetchPayment(paymentId) {
        await this.ensureInitialized();
        if (!this.gateway) {
            throw new Error('Payment gateway not initialized');
        }
        return this.gateway.fetchPayment(paymentId);
    }
    /**
     * Verify webhook signature
     */
    async verifyWebhookSignature(payload, signature) {
        await this.ensureInitialized();
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