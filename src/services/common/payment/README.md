# Payment Gateway Service

This payment gateway service is an abstraction layer that provides an easy way to integrate different payment gateways.

## Architecture

```
IPaymentGateway (Interface)
    ↓
PaymentGateway Implementations
    ├── RazorpayGateway
    ├── StripeGateway (future)
    ├── PayUGateway (future)
    └── CashfreeGateway (future)
    ↓
PaymentService (Facade)
    ↓
Booking Service / Webhook Service
```

## Current Implementation

### Razorpay Gateway
- ✅ Order creation
- ✅ Payment verification
- ✅ Webhook signature verification
- ✅ Payment details fetching

## Adding a New Payment Gateway

### Step 1: Create Gateway Implementation

Create a new gateway class in `src/services/payment/gateways/NewGateway.ts`:

```typescript
import { IPaymentGateway, ... } from '../interfaces/IPaymentGateway';

export class NewGateway implements IPaymentGateway {
  initialize(credentials: PaymentGatewayCredentials): void {
    // Initialize gateway with credentials
  }

  async createOrder(orderData: CreateOrderData): Promise<PaymentOrderResponse> {
    // Create order logic
  }

  verifyPaymentSignature(...): boolean {
    // Signature verification logic
  }

  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    // Fetch payment details
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Webhook signature verification
  }
}
```

### Step 2: Add Gateway Type

In `src/services/payment/PaymentService.ts`:

```typescript
export enum PaymentGatewayType {
  RAZORPAY = 'razorpay',
  NEW_GATEWAY = 'new_gateway', // Add here
}
```

### Step 3: Initialize in PaymentService

In `PaymentService.initializeGateway()`:

```typescript
case PaymentGatewayType.NEW_GATEWAY:
  this.gateway = new NewGateway();
  this.gateway.initialize({
    // Gateway-specific credentials
  });
  break;
```

### Step 4: Add Environment Variables

In `src/config/env.ts`:

```typescript
payment: {
  gateway: process.env.PAYMENT_GATEWAY || 'razorpay',
  newGateway: {
    apiKey: process.env.NEW_GATEWAY_API_KEY || '',
    secretKey: process.env.NEW_GATEWAY_SECRET_KEY || '',
  },
}
```

### Step 5: Update Webhook Handler

Handle webhook events for the new gateway in `src/services/webhook.service.ts`.

## Usage

```typescript
import { getPaymentService } from './payment/PaymentService';

const paymentService = getPaymentService();

// Create order
const order = await paymentService.createOrder({
  amount: 500000, // in paise
  currency: 'INR',
  receipt: 'receipt_123',
});

// Verify payment
const isValid = paymentService.verifyPaymentSignature(
  orderId,
  paymentId,
  signature
);

// Fetch payment
const payment = await paymentService.fetchPayment(paymentId);
```

## Environment Variables

```env
# Payment Gateway Selection
PAYMENT_GATEWAY=razorpay  # Options: razorpay, stripe, payu, etc.

# Razorpay Credentials
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

## Benefits

1. **Easy Switching**: Simply change the `PAYMENT_GATEWAY` environment variable
2. **Code Reusability**: No need to change the booking service
3. **Testability**: Can easily create mock gateways for testing
4. **Maintainability**: Each gateway's code is in a separate file
5. **Scalability**: Can easily add new gateways

