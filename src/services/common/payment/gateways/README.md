# Payment Gateway Implementations

This folder stores all payment gateway implementations.

## Current Gateways

### RazorpayGateway
- ✅ Order creation
- ✅ Payment verification
- ✅ Webhook signature verification
- ✅ Payment details fetching

## Adding a New Gateway

### Example: Stripe Gateway

```typescript
// src/services/payment/gateways/StripeGateway.ts
import { IPaymentGateway, ... } from '../interfaces/IPaymentGateway';
import Stripe from 'stripe';

export class StripeGateway implements IPaymentGateway {
  private stripe: Stripe | null = null;
  private secretKey: string = '';

  initialize(credentials: PaymentGatewayCredentials): void {
    this.secretKey = credentials.secretKey;
    this.stripe = new Stripe(credentials.secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse> {
    // Stripe-specific implementation
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: orderData.amount,
      currency: orderData.currency,
      metadata: orderData.notes,
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created_at: paymentIntent.created,
    };
  }

  verifyPaymentSignature(...): boolean {
    // Stripe signature verification
  }

  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    // Fetch from Stripe
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Stripe webhook verification
  }
}
```

### Example: PayU Gateway

```typescript
// src/services/payment/gateways/PayUGateway.ts
import { IPaymentGateway, ... } from '../interfaces/IPaymentGateway';
import crypto from 'crypto';

export class PayUGateway implements IPaymentGateway {
  private merchantKey: string = '';
  private merchantSalt: string = '';

  initialize(credentials: PaymentGatewayCredentials): void {
    this.merchantKey = credentials.merchantKey;
    this.merchantSalt = credentials.merchantSalt;
  }

  async createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse> {
    // PayU-specific implementation
    // Generate hash, create transaction, etc.
  }

  // ... implement other methods
}
```

## Best Practices

1. **Error Handling**: Every method should have proper error handling
2. **Logging**: Log important operations
3. **Type Safety**: Implement all methods from the interface
4. **Documentation**: Document gateway-specific behavior
5. **Testing**: Write unit tests

