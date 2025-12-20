# Admin Transaction and Payment Management

## Overview

This document explains the Transaction and Payment Management system for the Admin Panel. These routes provide comprehensive tools for administrators to view, manage, and monitor all financial transactions and payments within the PlayAsport platform.

## Why These Routes Were Created

### Business Requirements

1. **Financial Transparency**: Admins need to track all financial transactions (payments, refunds, partial refunds) across the platform to ensure financial accuracy and accountability.

2. **Payment Reconciliation**: Administrators must be able to verify payments, identify failed transactions, and reconcile payment records with Razorpay payment gateway records.

3. **Transaction Auditing**: The system needs to maintain an audit trail of all financial activities for compliance and debugging purposes.

4. **Operational Support**: Support teams need to manually update transaction statuses when payment gateway webhooks fail or when manual intervention is required.

5. **Business Analytics**: Management requires transaction statistics and analytics to understand revenue patterns, payment success rates, and identify issues.

### Technical Reasons

1. **Separation of Concerns**: Transactions are separate entities from bookings. While bookings track enrollment, transactions track the financial aspect independently.

2. **Multiple Transaction Types**: The system handles different transaction types (payments, refunds, partial refunds) that need separate management capabilities.

3. **Payment Gateway Integration**: Transactions are created through multiple sources (user verification, webhooks, manual admin actions) and need centralized management.

4. **Filtering and Search**: Admins need advanced filtering capabilities to find specific transactions based on various criteria (user, booking, status, date range, etc.).

## Transaction vs Payment

### Transactions
- **Scope**: All financial transactions including payments, refunds, and partial refunds
- **Use Case**: Complete financial audit and management
- **Routes**: `/admin/transactions`

### Payments
- **Scope**: Only payment-type transactions (excludes refunds)
- **Use Case**: Focused view on revenue-generating transactions
- **Routes**: `/admin/payments`
- **Advantage**: Simpler interface for viewing only incoming payments

## How Transactions Are Created

### 1. Booking Creation Flow

When a user creates a booking order:

```typescript
// 1. User initiates booking
POST /api/v1/bookings/create-order
{
  "batchId": "...",
  "participantIds": ["..."],
  "notes": "Optional notes"
}

// 2. System creates:
//    - Razorpay order
//    - Booking record with PENDING status
//    - Transaction record with:
//      * type: PAYMENT
//      * status: PENDING
//      * source: USER_VERIFICATION
//      * razorpay_order_id: <order_id>
```

**File**: `src/services/client/booking.service.ts` → `createOrder()`

### 2. Payment Verification Flow

When payment is verified (user confirmation or webhook):

```typescript
// User verifies payment
POST /api/v1/bookings/verify-payment
{
  "razorpay_order_id": "...",
  "razorpay_payment_id": "...",
  "razorpay_signature": "..."
}

// System updates:
//    - Booking status: PENDING → CONFIRMED
//    - Booking payment status: PENDING → SUCCESS
//    - Transaction status: PENDING → SUCCESS
//    - Transaction source: USER_VERIFICATION or WEBHOOK
//    - Transaction razorpay_payment_id: <payment_id>
```

**Files**: 
- `src/services/client/booking.service.ts` → `verifyPayment()`
- `src/services/common/webhook.service.ts` → `handlePaymentCaptured()`

### 3. Webhook Flow (Automatic)

When Razorpay sends webhook events:

```typescript
// Razorpay webhook
POST /api/v1/webhooks/razorpay
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 50000,
        "status": "captured",
        ...
      }
    }
  }
}

// System automatically updates:
//    - Transaction status: PENDING → SUCCESS
//    - Transaction source: WEBHOOK
//    - Booking payment status (if not already updated)
```

**File**: `src/services/common/webhook.service.ts`

### 4. Admin Manual Update

Admins can manually update transaction statuses:

```typescript
PATCH /api/v1/admin/transactions/:id
{
  "status": "success",
  "notes": "Manually verified after customer confirmation"
}

// System updates:
//    - Transaction status: <current> → <new_status>
//    - Transaction source: <current> → MANUAL
//    - Transaction metadata.adminUpdatedBy: <admin_id>
//    - Transaction metadata.adminNotes: <notes>
```

**File**: `src/services/admin/transaction.service.ts` → `updateTransactionStatus()`

## API Routes

### Transaction Management (`/admin/transactions`)

#### GET `/admin/transactions`
Get all transactions with advanced filtering.

**Query Parameters**:
- `page` (number, default: 1): Page number for pagination
- `limit` (number, default: 10): Items per page (max: 100)
- `userId` (string): Filter by user ID
- `bookingId` (string): Filter by booking ID
- `status` (enum): Filter by status
  - Values: `pending`, `processing`, `success`, `failed`, `cancelled`, `refunded`
- `type` (enum): Filter by transaction type
  - Values: `payment`, `refund`, `partial_refund`
- `source` (enum): Filter by transaction source
  - Values: `user_verification`, `webhook`, `manual`
- `search` (string): Search by transaction ID, Razorpay order ID, payment ID, or refund ID
- `startDate` (date, YYYY-MM-DD): Filter transactions from this date
- `endDate` (date, YYYY-MM-DD): Filter transactions until this date
- `sortBy` (string, default: `created_at`): Field to sort by
- `sortOrder` (enum, default: `desc`): Sort order (`asc` or `desc`)

**Response**:
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "txn-uuid",
        "transaction_id": "txn-uuid",
        "booking_id": "booking-id",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "amount": 5000,
        "currency": "INR",
        "type": "payment",
        "status": "success",
        "source": "webhook",
        "payment_method": "card",
        "razorpay_order_id": "order_xxx",
        "razorpay_payment_id": "pay_xxx",
        "razorpay_refund_id": null,
        "failure_reason": null,
        "processed_at": "2024-01-15T10:30:00.000Z",
        "created_at": "2024-01-15T10:25:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15
    }
  }
}
```

**Permission Required**: `transaction:view`

#### GET `/admin/transactions/stats`
Get transaction statistics for dashboard.

**Query Parameters**:
- `startDate` (date, optional): Filter statistics from this date
- `endDate` (date, optional): Filter statistics until this date

**Response**:
```json
{
  "success": true,
  "message": "Transaction statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 1500,
      "byStatus": {
        "pending": 50,
        "processing": 10,
        "success": 1400,
        "failed": 30,
        "cancelled": 5,
        "refunded": 5
      },
      "byType": {
        "payment": 1450,
        "refund": 40,
        "partial_refund": 10
      },
      "totalAmount": 7500000,
      "successAmount": 7250000,
      "failedAmount": 150000,
      "refundedAmount": 100000
    }
  }
}
```

**Permission Required**: `transaction:view`

#### GET `/admin/transactions/:id`
Get detailed transaction information by ID.

**Response**:
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "transaction": {
      "id": "txn-uuid",
      "booking": {
        "id": "booking-id",
        "booking_id": "BK123456",
        "amount": 5000,
        "currency": "INR",
        "status": "confirmed",
        "payment": { ... },
        "participants": [...],
        "batch": {...},
        "center": {...},
        "sport": {...}
      },
      "user": {
        "id": "user-id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "mobile": "+919876543210"
      },
      "razorpay_order_id": "order_xxx",
      "razorpay_payment_id": "pay_xxx",
      "type": "payment",
      "status": "success",
      "source": "webhook",
      "amount": 5000,
      "currency": "INR",
      "payment_method": "card",
      "processed_at": "2024-01-15T10:30:00.000Z",
      "metadata": {
        "adminUpdatedBy": "admin-id",
        "adminNotes": "Manually verified"
      },
      "created_at": "2024-01-15T10:25:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Permission Required**: `transaction:view`

#### PATCH `/admin/transactions/:id`
Manually update transaction status (admin override).

**Request Body**:
```json
{
  "status": "success",
  "notes": "Manually verified after customer confirmation call"
}
```

**Status Values**: `pending`, `processing`, `success`, `failed`, `cancelled`, `refunded`

**Response**: Updated transaction object

**Permission Required**: `transaction:update`

**Notes**:
- Updates transaction `source` to `MANUAL`
- Stores admin ID and notes in `metadata`
- Does NOT automatically update booking payment status (use payment update endpoint for that)

---

### Payment Management (`/admin/payments`)

Payment routes are similar to transaction routes but **only show payment-type transactions** (excludes refunds).

#### GET `/admin/payments`
Get all payments (payment-type transactions only).

**Query Parameters**: Same as transactions, except:
- No `type` parameter (always filters to `type: payment`)
- Additional `paymentMethod` parameter to filter by payment method (card, netbanking, upi, wallet, etc.)

**Permission Required**: `payment:view`

#### GET `/admin/payments/stats`
Get payment statistics (only payment-type transactions).

**Response**:
```json
{
  "success": true,
  "message": "Payment statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 1450,
      "successful": 1400,
      "failed": 30,
      "pending": 20,
      "totalAmount": 7250000,
      "successfulAmount": 7000000,
      "failedAmount": 150000,
      "byPaymentMethod": {
        "card": 800,
        "netbanking": 300,
        "upi": 250,
        "wallet": 100
      }
    }
  }
}
```

**Permission Required**: `payment:view`

#### GET `/admin/payments/:id`
Get detailed payment information by ID.

**Permission Required**: `payment:view`

#### PATCH `/admin/payments/:id`
Manually update payment status.

**Request Body**: Same as transaction update

**Permission Required**: `payment:update`

**Special Behavior**:
- If status is set to `success`, also updates the related booking's payment status to `SUCCESS`
- This ensures booking and payment records stay synchronized

---

## Permission System

### Required Permissions

The transaction and payment routes use the permission-based access control (RBAC) system:

#### Transaction Routes
- **View**: Requires `transaction:view` permission
- **Update**: Requires `transaction:update` permission
- **Section**: `Section.TRANSACTION`

#### Payment Routes
- **View**: Requires `payment:view` permission
- **Update**: Requires `payment:update` permission
- **Section**: `Section.PAYMENT`

### Setting Up Permissions

1. Login as Super Admin
2. Navigate to Permissions section
3. Create permissions for roles:
   - For Admin role: Add `transaction:view`, `transaction:update`, `payment:view`, `payment:update`
   - For Employee/Agent roles: Add only `transaction:view` and `payment:view` (read-only)

### Super Admin Bypass

Super Admin users automatically have access to all routes regardless of permission settings (bypassed in middleware).

## Use Cases

### 1. Viewing All Transactions
**Scenario**: Admin needs to see all financial transactions for the month.

**Solution**: 
```
GET /admin/transactions?startDate=2024-01-01&endDate=2024-01-31&page=1&limit=50
```

### 2. Finding Failed Payments
**Scenario**: Support team needs to identify failed payments for a specific user.

**Solution**:
```
GET /admin/payments?userId=user-123&status=failed
```

### 3. Payment Reconciliation
**Scenario**: Admin needs to verify a specific payment with Razorpay records.

**Solution**:
```
GET /admin/transactions?search=pay_abc123xyz
```

### 4. Manual Payment Verification
**Scenario**: Webhook failed, but customer confirms payment was successful.

**Solution**:
```
PATCH /admin/payments/:id
{
  "status": "success",
  "notes": "Customer confirmed payment. Verified with bank statement."
}
```

### 5. Dashboard Statistics
**Scenario**: Management needs transaction statistics for reporting.

**Solution**:
```
GET /admin/transactions/stats?startDate=2024-01-01&endDate=2024-01-31
GET /admin/payments/stats?startDate=2024-01-01&endDate=2024-01-31
```

## Data Model

### Transaction Model

```typescript
{
  id: string;                    // UUID
  booking: ObjectId;             // Reference to Booking
  user: ObjectId;                // Reference to User
  razorpay_order_id: string;     // Razorpay order ID
  razorpay_payment_id?: string;  // Razorpay payment ID (null until payment verified)
  razorpay_refund_id?: string;   // Razorpay refund ID (if refunded)
  type: TransactionType;         // payment | refund | partial_refund
  status: TransactionStatus;     // pending | processing | success | failed | cancelled | refunded
  source: TransactionSource;     // user_verification | webhook | manual
  amount: number;                // Amount in rupees
  currency: string;              // Currency code (default: INR)
  payment_method?: string;       // card, netbanking, upi, wallet, etc.
  razorpay_signature?: string;   // Payment verification signature
  failure_reason?: string;       // Reason for failure
  razorpay_webhook_data?: object;// Full webhook payload
  metadata?: object;             // Additional metadata (admin notes, etc.)
  processed_at?: Date;           // When transaction was processed
  created_at: Date;
  updatedAt: Date;
}
```

## Integration with Other Systems

### Booking Integration
- Each transaction is linked to a booking via `booking` field
- Transaction status updates can trigger booking status updates (via payment update endpoint)
- Booking deletion (soft delete) doesn't delete transactions (for audit trail)

### User Integration
- Transactions are linked to users via `user` field
- User transactions can be filtered using `userId` parameter
- User deletion doesn't delete transactions (maintains financial records)

### Razorpay Integration
- Transactions store Razorpay identifiers (order_id, payment_id, refund_id)
- Webhook service automatically updates transactions
- Admin can manually reconcile when webhooks fail

## Error Handling

### Common Errors

1. **404 Not Found**: Transaction/Payment ID doesn't exist
2. **400 Bad Request**: Invalid status value or missing required fields
3. **403 Forbidden**: User doesn't have required permission
4. **401 Unauthorized**: Missing or invalid authentication token
5. **500 Internal Server Error**: Database or system error

### Error Response Format

```json
{
  "success": false,
  "message": "Error message description"
}
```

## Best Practices

1. **Use Payment Routes for Revenue Tracking**: Use `/admin/payments` when you only need to see incoming payments (excludes refunds).

2. **Use Transaction Routes for Complete Audit**: Use `/admin/transactions` when you need to see all financial activities including refunds.

3. **Manual Updates Should Include Notes**: Always include notes when manually updating transaction status for audit trail.

4. **Verify Before Manual Updates**: Always verify with payment gateway records before manually updating transaction status.

5. **Use Date Filters for Performance**: Always use date filters when querying large datasets to improve performance.

6. **Monitor Failed Transactions**: Regularly check failed transactions to identify payment gateway issues.

## Related Files

- **Models**: `src/models/transaction.model.ts`
- **Transaction Service**: `src/services/admin/transaction.service.ts`
- **Payment Service**: `src/services/admin/payment.service.ts`
- **Transaction Controller**: `src/controllers/admin/transaction.controller.ts`
- **Payment Controller**: `src/controllers/admin/payment.controller.ts`
- **Transaction Routes**: `src/routes/admin/transaction.routes.ts`
- **Payment Routes**: `src/routes/admin/payment.routes.ts`
- **Booking Service**: `src/services/client/booking.service.ts` (transaction creation)
- **Webhook Service**: `src/services/common/webhook.service.ts` (automatic updates)

## Future Enhancements

Potential improvements for future versions:

1. **Refund Management**: Dedicated refund creation and management endpoints
2. **Export Functionality**: Export transactions to CSV/Excel for accounting
3. **Bulk Operations**: Bulk status updates for multiple transactions
4. **Advanced Analytics**: More detailed analytics and reporting
5. **Transaction Disputes**: Handle payment disputes and chargebacks
6. **Multi-Currency Support**: Enhanced currency handling and conversion
7. **Notification System**: Alerts for failed transactions or payment issues

