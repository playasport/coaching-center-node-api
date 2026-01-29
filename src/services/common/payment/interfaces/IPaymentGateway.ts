/**
 * Payment Gateway Interface
 * This interface defines the contract for all payment gateway implementations
 */
export interface IPaymentGateway {
  /**
   * Initialize the payment gateway with credentials
   */
  initialize(credentials: PaymentGatewayCredentials): void;

  /**
   * Create a payment order
   */
  createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse>;

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean;

  /**
   * Fetch payment details
   */
  fetchPayment(paymentId: string): Promise<PaymentDetails>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

/**
 * Payment Gateway Credentials
 */
export interface PaymentGatewayCredentials {
  keyId: string;
  keySecret: string;
  [key: string]: any; // Allow additional gateway-specific credentials
}

/**
 * Create Order Data
 */
export interface CreateOrderData {
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency: string;
  receipt?: string;
  notes?: Record<string, any>;
  [key: string]: any; // Allow additional gateway-specific fields
}

/**
 * Payment Order Response
 */
export interface PaymentOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
  created_at: number;
  [key: string]: any; // Allow additional gateway-specific fields
}

/**
 * Payment Details
 */
export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  order_id: string;
  created_at: number;
  [key: string]: any; // Allow additional gateway-specific fields
}

