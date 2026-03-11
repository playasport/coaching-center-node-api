import { IPaymentGateway, PaymentGatewayCredentials, CreateOrderData, PaymentOrderResponse, PaymentDetails } from '../interfaces/IPaymentGateway';
/**
 * Razorpay Payment Gateway Implementation
 */
export declare class RazorpayGateway implements IPaymentGateway {
    private razorpay;
    private keySecret;
    /**
     * Initialize Razorpay with credentials
     */
    initialize(credentials: PaymentGatewayCredentials): void;
    /**
     * Create a Razorpay order
     */
    createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse>;
    /**
     * Verify Razorpay payment signature
     */
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
    /**
     * Fetch payment details from Razorpay
     */
    fetchPayment(paymentId: string): Promise<PaymentDetails>;
    /**
     * Verify Razorpay webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean;
}
//# sourceMappingURL=RazorpayGateway.d.ts.map