# Payment Gateway Architecture

This document explains the architecture of the payment gateway system and provides a guide for adding new payment gateways in the future.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Booking Service                 │
│  (Business Logic - Gateway Agnostic)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Payment Service                 │
│      (Facade/Abstraction Layer)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      IPaymentGateway Interface          │
│      (Contract Definition)               │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Razorpay     │  │ Future       │
│ Gateway      │  │ Gateways     │
│              │  │ (Stripe,     │
│              │  │  PayU, etc.) │
└──────────────┘  └──────────────┘
```

## File Structure

```
src/services/payment/
├── interfaces/
│   └── IPaymentGateway.ts          # Gateway interface (contract)
├── gateways/
│   ├── RazorpayGateway.ts          # Razorpay implementation
│   ├── README.md                   # Gateway implementation guide
│   └── [FutureGateways].ts         # Other gateway implementations
├── PaymentService.ts               # Main service (facade)
├── index.ts                        # Clean exports
└── README.md                       # Module documentation
```

## Key Components

### 1. IPaymentGateway Interface

All payment gateways must implement this interface:

```typescript
interface IPaymentGateway {
  initialize(credentials): void;
  createOrder(orderData): Promise<PaymentOrderResponse>;
  verifyPaymentSignature(orderId, paymentId, signature): boolean;
  fetchPayment(paymentId): Promise<PaymentDetails>;
  verifyWebhookSignature(payload, signature): boolean;
}
```

### 2. PaymentService (Facade)

This service acts as an abstraction layer between business logic and gateway implementation:

- Gateway selection (from environment variable)
- Singleton pattern (single instance)
- Error handling
- Logging

### 3. Gateway Implementations

Each gateway provides its own implementation:
- **RazorpayGateway**: Complete implementation for Razorpay
- **Future Gateways**: Can be easily added by following the interface

## Usage in Booking Service

```typescript
import { getPaymentService } from './payment/PaymentService';

const paymentService = getPaymentService();

// Create order - gateway agnostic
const order = await paymentService.createOrder({
  amount: 500000,
  currency: 'INR',
  receipt: 'receipt_123',
});

// Verify payment - gateway agnostic
const isValid = paymentService.verifyPaymentSignature(
  orderId,
  paymentId,
  signature
);
```

## Adding a New Payment Gateway

### Step 1: Create Gateway Class

`src/services/payment/gateways/NewGateway.ts`:

```typescript
import { IPaymentGateway, ... } from '../interfaces/IPaymentGateway';

export class NewGateway implements IPaymentGateway {
  // Implement all interface methods
}
```

### Step 2: Add to PaymentGatewayType Enum

`src/services/payment/PaymentService.ts`:

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
    // Gateway credentials from config
  });
  break;
```

### Step 4: Add Environment Config

`src/config/env.ts`:

```typescript
payment: {
  gateway: process.env.PAYMENT_GATEWAY || 'razorpay',
  newGateway: {
    apiKey: process.env.NEW_GATEWAY_API_KEY || '',
    // ... other credentials
  },
}
```

### Step 5: Update Webhook Handler (if needed)

Handle events for the new gateway in `src/services/webhook.service.ts`.

## Environment Variables

```env
# Payment Gateway Selection
PAYMENT_GATEWAY=razorpay  # Change to switch gateways

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Future Gateway Example
# NEW_GATEWAY_API_KEY=your_api_key
# NEW_GATEWAY_SECRET_KEY=your_secret_key
```

## Benefits

1. **Easy Gateway Switching**: Simply change the `PAYMENT_GATEWAY` environment variable
2. **No Business Logic Changes**: No need to modify the booking service
3. **Testability**: Can easily create mock gateways for testing
4. **Maintainability**: Each gateway's code is in a separate file
5. **Scalability**: Can support multiple gateways simultaneously (future enhancement)
6. **Type Safety**: Interface ensures all methods are implemented

## Current Implementation Status

✅ **Razorpay**: Fully implemented and tested
- Order creation
- Payment verification
- Webhook handling
- Signature verification

⏳ **Future Gateways**: Ready for implementation
- Stripe (example code in README)
- PayU (example code in README)
- Cashfree
- Any other gateway following the interface

## Testing

```typescript
// Mock gateway for testing
class MockPaymentGateway implements IPaymentGateway {
  // Test implementation
}

// Use in tests
const paymentService = new PaymentService(PaymentGatewayType.MOCK);
```

## Migration Guide

If you are migrating from existing Razorpay code:

1. ✅ Payment service already integrated
2. ✅ Booking service updated to use payment service
3. ✅ Webhook middleware updated
4. ✅ All Razorpay-specific code moved to RazorpayGateway

**No breaking changes** - existing functionality works as before, but now it's modular and extensible!

