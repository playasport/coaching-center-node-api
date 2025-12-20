import {
  IPaymentGateway,
  CreateOrderData,
  PaymentOrderResponse,
  PaymentDetails,
} from './interfaces/IPaymentGateway';
import { RazorpayGateway } from './gateways/RazorpayGateway';
import { config } from '../../../config/env';
import { logger } from '../../../utils/logger';

/**
 * Payment Gateway Type
 */
export enum PaymentGatewayType {
  RAZORPAY = 'razorpay',
  // Add more payment gateways here in the future
  // STRIPE = 'stripe',
  // PAYU = 'payu',
  // CASHFREE = 'cashfree',
}

/**
 * Payment Service
 * This service acts as a facade for payment gateway operations
 * It allows easy switching between different payment gateways
 */
export class PaymentService {
  private gateway: IPaymentGateway | null = null;
  private gatewayType: PaymentGatewayType;

  constructor(gatewayType: PaymentGatewayType = PaymentGatewayType.RAZORPAY) {
    this.gatewayType = gatewayType;
    this.initializeGateway();
  }

  /**
   * Initialize the payment gateway based on type
   */
  private initializeGateway(): void {
    switch (this.gatewayType) {
      case PaymentGatewayType.RAZORPAY:
        this.gateway = new RazorpayGateway();
        this.gateway.initialize({
          keyId: config.razorpay.keyId,
          keySecret: config.razorpay.keySecret,
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

    logger.info(`Payment service initialized with gateway: ${this.gatewayType}`);
  }

  /**
   * Check if payment is enabled
   */
  async isPaymentEnabled(): Promise<boolean> {
    try {
      const { getSettingValue } = await import('../settings.service');
      const paymentEnabled = (await getSettingValue('payment.enabled')) as boolean | null;
      return paymentEnabled ?? true; // Default to enabled if not set
    } catch (error) {
      logger.error('Failed to check payment enabled status', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Create a payment order
   */
  async createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse> {
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
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }

    return this.gateway.verifyPaymentSignature(orderId, paymentId, signature);
  }

  /**
   * Fetch payment details
   */
  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }

    return this.gateway.fetchPayment(paymentId);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.gateway) {
      throw new Error('Payment gateway not initialized');
    }

    return this.gateway.verifyWebhookSignature(payload, signature);
  }

  /**
   * Get current gateway type
   */
  getGatewayType(): PaymentGatewayType {
    return this.gatewayType;
  }
}

// Export singleton instance
let paymentServiceInstance: PaymentService | null = null;

/**
 * Get payment service instance (singleton)
 */
export const getPaymentService = (): PaymentService => {
  if (!paymentServiceInstance) {
    const gatewayType = (config.payment.gateway as PaymentGatewayType) || PaymentGatewayType.RAZORPAY;
    paymentServiceInstance = new PaymentService(gatewayType);
  }
  return paymentServiceInstance;
};

