import { CreateOrderData, PaymentOrderResponse, PaymentDetails } from './interfaces/IPaymentGateway';
/**
 * Payment Gateway Type
 */
export declare enum PaymentGatewayType {
    RAZORPAY = "razorpay"
}
/**
 * Payment Service
 * This service acts as a facade for payment gateway operations
 * It allows easy switching between different payment gateways
 */
export declare class PaymentService {
    private gateway;
    private gatewayType;
    constructor(gatewayType?: PaymentGatewayType);
    /**
     * Initialize the payment gateway based on type
     */
    private initializeGateway;
    /**
     * Create a payment order
     */
    createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse>;
    /**
     * Verify payment signature
     */
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
    /**
     * Fetch payment details
     */
    fetchPayment(paymentId: string): Promise<PaymentDetails>;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean;
    /**
     * Get current gateway type
     */
    getGatewayType(): PaymentGatewayType;
}
/**
 * Get payment service instance (singleton)
 */
export declare const getPaymentService: () => PaymentService;
//# sourceMappingURL=PaymentService.d.ts.map