# Admin Payout System Documentation

## Overview

The Admin Payout System is a comprehensive solution for managing academy payouts and refunds. It includes:

- **Automatic Payout Creation**: When a user's booking payment is verified, a payout record is automatically created
- **Manual Transfer Management**: Admin can manually initiate transfers to academy Razorpay accounts
- **Refund Processing**: Full and partial refund support with automatic payout adjustment
- **Queue-Based Processing**: Non-blocking background processing for better performance
- **Webhook Integration**: Automatic status updates from Razorpay
- **Audit Trails**: Complete tracking of all payout operations
- **Multi-Channel Notifications**: Push, SMS, Email, and WhatsApp notifications

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [Queue System](#queue-system)
5. [Webhook Handlers](#webhook-handlers)
6. [Refund System](#refund-system)
7. [Usage Examples](#usage-examples)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## System Architecture

### Flow Diagram

```
User Payment Verified
    ↓
Booking payout_status = NOT_INITIATED
    ↓
Payout Creation Queue (Background)
    ↓
Payout Record Created (Status: PENDING)
Booking payout_status = PENDING
    ↓
Admin Initiates Transfer (Manual)
    ↓
Payout Transfer Queue (Background)
Booking payout_status = PROCESSING
    ↓
Razorpay Transfer Created
    ↓
Webhook: transfer.processed
    ↓
Payout Status: COMPLETED
Booking payout_status = COMPLETED
```

### Components

1. **Payout Model**: Stores payout records
2. **Payout Creation Queue**: Creates payout when payment verified
3. **Payout Transfer Queue**: Processes transfers to Razorpay
4. **Admin Services**: Business logic for payout management
5. **Webhook Handlers**: Updates status from Razorpay events
6. **Refund Service**: Handles refunds and payout adjustments
7. **Booking Model**: Tracks payout status in `payout_status` field

---

## Database Models

### Payout Model

**File**: `src/models/payout.model.ts`

**Fields**:
- `id` (String, UUID): Unique payout identifier
- `booking` (ObjectId): Reference to Booking model
- `transaction` (ObjectId): Reference to Transaction model
- `academy_payout_account` (ObjectId): Reference to AcademyPayoutAccount model
- `academy_user` (ObjectId): Reference to User model (academy owner)
- `amount` (Number): Total booking amount (what user paid)
- `batch_amount` (Number): Academy's share (admission + base fee)
- `commission_rate` (Number): Commission rate used (0-1, e.g., 0.10 for 10%)
- `commission_amount` (Number): Commission deducted
- `payout_amount` (Number): Final amount to transfer (batch_amount - commission_amount)
- `currency` (String): Currency code (default: INR)
- `status` (Enum): Payout status (pending, processing, completed, failed, cancelled, refunded)
- `razorpay_transfer_id` (String, nullable): Razorpay transfer ID
- `razorpay_account_id` (String): Academy's Razorpay account ID
- `refund_amount` (Number, nullable): Amount refunded (if applicable)
- `adjusted_payout_amount` (Number, nullable): Payout amount after refund adjustment
- `transfer_notes` (Object, nullable): Notes for transfer
- `failure_reason` (String, nullable): Error message if failed
- `processed_at` (Date, nullable): When transfer was completed
- `scheduled_at` (Date, nullable): For future scheduled transfers
- `metadata` (Object, nullable): Additional metadata
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last update timestamp

**Status Values**:
- `pending`: Payout created, waiting for admin to initiate transfer
- `processing`: Transfer initiated, waiting for Razorpay to process
- `completed`: Transfer successful
- `failed`: Transfer failed
- `cancelled`: Payout cancelled by admin
- `refunded`: Payout refunded (booking refunded)

**Indexes**:
- Unique index on `booking` (one payout per booking)
- Unique index on `transaction` (one payout per transaction)
- Indexes on `academy_user`, `status`, `razorpay_transfer_id`, `razorpay_account_id`

### Booking Model - Payout Status

**File**: `src/models/booking.model.ts`

**Field**: `payout_status` (Enum)

**Description**: Tracks the status of payout to academy for this booking. This field is automatically updated throughout the payout lifecycle.

**Status Values**:
- `not_initiated` (default): Payout not yet created
- `pending`: Payout created, waiting for admin to initiate transfer
- `processing`: Transfer initiated, waiting for Razorpay to process
- `completed`: Transfer successful, payout completed
- `failed`: Transfer failed
- `cancelled`: Payout cancelled by admin
- `refunded`: Payout refunded (booking refunded)

**Status Flow**:
```
Payment Verified
    ↓
payout_status = NOT_INITIATED
    ↓
Payout Created (Queue)
    ↓
payout_status = PENDING
    ↓
Admin Initiates Transfer
    ↓
payout_status = PROCESSING
    ↓
Transfer Completed (Webhook)
    ↓
payout_status = COMPLETED
```

**Automatic Updates**:
- Set to `PENDING` when payout record is created (via queue)
- Set to `PROCESSING` when transfer is initiated (manually by admin)
- Set to `COMPLETED` when transfer webhook is received
- Set to `FAILED` when transfer fails
- Set to `REFUNDED` when booking is refunded (full refund)
- Remains unchanged for partial refunds

---

## API Endpoints

### Base URL
```
/api/v1/admin/payouts
```

### Authentication
All endpoints require admin authentication with `Bearer` token.

### 1. Get All Payouts

**Endpoint**: `GET /admin/payouts`

**Description**: Retrieve payouts with optional filters and pagination

**Query Parameters**:
- `status` (optional): Filter by payout status (`pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded`)
- `academyUserId` (optional): Filter by academy user ID
- `bookingId` (optional): Filter by booking ID
- `transactionId` (optional): Filter by transaction ID
- `dateFrom` (optional): Filter from date (ISO 8601 format)
- `dateTo` (optional): Filter to date (ISO 8601 format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request**:
```bash
curl -X GET 'http://localhost:3001/api/v1/admin/payouts?status=pending&page=1&limit=20' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "data": [
      {
        "id": "payout-uuid",
        "booking": {
          "id": "booking-uuid",
          "booking_id": "BK123456",
          "status": "confirmed",
          "amount": 5000
        },
        "transaction": {
          "id": "transaction-uuid",
          "razorpay_payment_id": "pay_xxx",
          "status": "success",
          "amount": 5000
        },
        "academy_payout_account": {
          "id": "account-uuid",
          "razorpay_account_id": "acc_xxx",
          "activation_status": "activated"
        },
        "academy_user": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "mobile": "9876543210"
        },
        "amount": 5000,
        "batch_amount": 4500,
        "commission_rate": 0.10,
        "commission_amount": 450,
        "payout_amount": 4050,
        "currency": "INR",
        "status": "pending",
        "razorpay_transfer_id": null,
        "razorpay_account_id": "acc_xxx",
        "refund_amount": null,
        "adjusted_payout_amount": null,
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Payouts retrieved successfully"
}
```

### 2. Get Payout by ID

**Endpoint**: `GET /admin/payouts/:id`

**Description**: Retrieve a single payout by ID

**Path Parameters**:
- `id` (required): Payout ID

**Example Request**:
```bash
curl -X GET 'http://localhost:3001/api/v1/admin/payouts/payout-uuid' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid",
    "booking": { ... },
    "transaction": { ... },
    "academy_payout_account": { ... },
    "academy_user": { ... },
    "amount": 5000,
    "payout_amount": 4050,
    "status": "pending",
    ...
  },
  "message": "Payout retrieved successfully"
}
```

### 3. Create Transfer

**Endpoint**: `POST /admin/payouts/:id/transfer`

**Description**: Initiate transfer to academy's Razorpay account (manual transfer creation)

**Path Parameters**:
- `id` (required): Payout ID

**Example Request**:
```bash
curl -X POST 'http://localhost:3001/api/v1/admin/payouts/payout-uuid/transfer' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid",
    "status": "processing",
    "razorpay_transfer_id": "trf_xxx",
    ...
  },
  "message": "Transfer initiated successfully"
}
```

**Notes**:
- Transfer is processed in background via queue
- Payout status changes to `processing` immediately
- Webhook will update status to `completed` or `failed`

### 4. Retry Failed Transfer

**Endpoint**: `POST /admin/payouts/:id/retry`

**Description**: Retry a failed payout transfer

**Path Parameters**:
- `id` (required): Payout ID

**Example Request**:
```bash
curl -X POST 'http://localhost:3001/api/v1/admin/payouts/payout-uuid/retry' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid",
    "status": "processing",
    ...
  },
  "message": "Transfer retry initiated successfully"
}
```

### 5. Cancel Payout

**Endpoint**: `PATCH /admin/payouts/:id/cancel`

**Description**: Cancel a pending payout

**Path Parameters**:
- `id` (required): Payout ID

**Request Body**:
```json
{
  "reason": "Booking cancelled by user"
}
```

**Example Request**:
```bash
curl -X PATCH 'http://localhost:3001/api/v1/admin/payouts/payout-uuid/cancel' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Booking cancelled by user"
  }'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid",
    "status": "cancelled",
    "failure_reason": "Booking cancelled by user",
    ...
  },
  "message": "Payout cancelled successfully"
}
```

### 6. Get Payout Statistics

**Endpoint**: `GET /admin/payouts/stats`

**Description**: Get aggregated payout statistics

**Query Parameters**:
- `academyUserId` (optional): Filter by academy user ID
- `dateFrom` (optional): Filter from date
- `dateTo` (optional): Filter to date

**Example Request**:
```bash
curl -X GET 'http://localhost:3001/api/v1/admin/payouts/stats?dateFrom=2026-01-01&dateTo=2026-01-31' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "total_pending": 25,
    "total_processing": 5,
    "total_completed": 150,
    "total_failed": 3,
    "total_pending_amount": 125000,
    "total_completed_amount": 750000,
    "total_failed_amount": 15000
  },
  "message": "Payout statistics retrieved successfully"
}
```

### 7. Create Refund

**Endpoint**: `POST /admin/payouts/bookings/:bookingId/refund`

**Description**: Create refund for a confirmed booking (full or partial)

**Path Parameters**:
- `bookingId` (required): Booking ID

**Request Body**:
```json
{
  "amount": 1000,  // Optional: If not provided, full refund
  "reason": "Booking cancelled by user"
}
```

**Example Request**:
```bash
curl -X POST 'http://localhost:3001/api/v1/admin/payouts/bookings/booking-uuid/refund' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 1000,
    "reason": "Booking cancelled by user"
  }'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "booking": {
      "id": "booking-uuid",
      "status": "cancelled",  // or "confirmed" for partial refund
      "payment": {
        "status": "refunded"  // or "success" for partial refund
      }
    },
    "refund": {
      "id": "rfnd_xxx",
      "amount": 1000,
      "status": "processed",
      "payment_id": "pay_xxx"
    },
    "payout": {
      "id": "payout-uuid",
      "status": "refunded",  // or adjusted for partial refund
      "refund_amount": 1000,
      "adjusted_payout_amount": 3050
    }
  },
  "message": "Refund created successfully"
}
```

**Notes**:
- Full refund: If `amount` not provided or equals booking amount
- Partial refund: If `amount` is less than booking amount
- Payout is automatically adjusted/cancelled based on refund type

### 8. Get Refund Details

**Endpoint**: `GET /admin/payouts/refunds/:refundId`

**Description**: Get refund details from Razorpay

**Path Parameters**:
- `refundId` (required): Razorpay refund ID

**Example Request**:
```bash
curl -X GET 'http://localhost:3001/api/v1/admin/payouts/refunds/rfnd_xxx' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'
```

**Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "id": "rfnd_xxx",
    "entity": "refund",
    "amount": 100000,  // in paise
    "currency": "INR",
    "payment_id": "pay_xxx",
    "status": "processed",
    "notes": {
      "booking_id": "booking-uuid",
      "reason": "Booking cancelled by user"
    },
    "created_at": 1642684800
  },
  "message": "Refund details retrieved successfully"
}
```

---

## Queue System

### Payout Creation Queue

**File**: `src/queue/payoutCreationQueue.ts` & `src/queue/payoutCreationWorker.ts`

**Purpose**: Creates payout records when payment is verified (non-blocking)

**Trigger**: Automatically triggered after successful payment verification

**Job Data**:
```typescript
{
  bookingId: string;
  transactionId: string;
  academyUserId: string;
  amount: number;
  batchAmount: number;
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
  currency: string;
}
```

**Process**:
1. Validates booking, transaction, and academy user
2. Checks if payout account exists and is activated
3. Creates payout record with `pending` status
4. Updates booking `payout_status` to `PENDING`
5. Creates audit trail
6. Skips if payout already exists (idempotency)

**Configuration**:
- Queue name: `payout-creation`
- Concurrency: 2 (configurable via `PAYOUT_CREATION_CONCURRENCY`)
- Retry attempts: 3
- Backoff: Exponential (2s delay)

### Payout Transfer Queue

**File**: `src/queue/payoutTransferQueue.ts` & `src/queue/payoutTransferWorker.ts`

**Purpose**: Processes transfers to Razorpay accounts (non-blocking)

**Trigger**: Manually triggered by admin via API

**Job Data**:
```typescript
{
  payoutId: string;
  accountId: string;
  amount: number;
  currency: string;
  notes?: Record<string, any>;
  adminUserId?: string;
}
```

**Process**:
1. Validates payout status and account
2. Updates payout status to `processing`
3. Updates booking `payout_status` to `PROCESSING`
4. Creates transfer in Razorpay
5. Updates payout with transfer ID
6. Creates audit trail
7. Sends notifications (Push, SMS, WhatsApp)

**Configuration**:
- Queue name: `payout-transfer`
- Concurrency: 2 (configurable via `PAYOUT_TRANSFER_CONCURRENCY`)
- Retry attempts: 5
- Backoff: Exponential (3s delay)

---

## Webhook Handlers

### Transfer Events

#### `transfer.processed`

**Handler**: `handleTransferProcessed` in `src/services/common/webhook.service.ts`

**Actions**:
1. Updates payout status to `completed`
2. Sets `processed_at` timestamp
3. Updates booking `payout_status` to `COMPLETED`
4. Creates audit trail
5. Sends notifications to academy (Push, SMS, WhatsApp)

**Webhook Payload**:
```json
{
  "event": "transfer.processed",
  "payload": {
    "transfer": {
      "entity": {
        "id": "trf_xxx",
        "amount": 405000,  // in paise
        "currency": "INR",
        "status": "processed",
        "account": "acc_xxx"
      }
    }
  }
}
```

#### `transfer.failed`

**Handler**: `handleTransferFailed` in `src/services/common/webhook.service.ts`

**Actions**:
1. Updates payout status to `failed`
2. Sets `failure_reason`
3. Updates booking `payout_status` to `FAILED`
4. Creates audit trail

**Webhook Payload**:
```json
{
  "event": "transfer.failed",
  "payload": {
    "transfer": {
      "entity": {
        "id": "trf_xxx",
        "status": "failed",
        "failure_reason": "Insufficient balance"
      }
    }
  }
}
```

### Refund Events

#### `refund.processed`

**Handler**: `handleRefundProcessed` in `src/services/common/webhook.service.ts`

**Actions**:
1. Updates booking status (cancelled if full refund)
2. Updates booking `payout_status` to `REFUNDED` (if full refund)
3. Updates transaction record
4. Adjusts/cancels payout based on refund type
5. Creates audit trail

**Webhook Payload**:
```json
{
  "event": "refund.processed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_xxx",
        "amount": 100000,  // in paise
        "payment_id": "pay_xxx",
        "status": "processed"
      }
    }
  }
}
```

#### `refund.failed`

**Handler**: `handleRefundFailed` in `src/services/common/webhook.service.ts`

**Actions**:
1. Updates transaction status to `failed`
2. Creates audit trail

**Webhook Payload**:
```json
{
  "event": "refund.failed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfnd_xxx",
        "status": "failed",
        "failure_reason": "Payment already refunded"
      }
    }
  }
}
```

---

## Refund System

### Refund Types

#### Full Refund
- Refund amount equals booking amount
- Booking status → `cancelled`
- Payment status → `refunded`
- Booking `payout_status` → `REFUNDED`
- Payout status:
  - If `pending` → `cancelled`
  - If `completed` → `refunded` (reversal needed)

#### Partial Refund
- Refund amount less than booking amount
- Booking status → `confirmed` (unchanged)
- Payment status → `success` (unchanged)
- Booking `payout_status` → unchanged (remains `COMPLETED` or current status)
- Payout adjustment:
  - `refund_amount`: Amount refunded
  - `adjusted_payout_amount`: Payout amount after refund (proportional)
  - If payout `completed` → `refunded` (for review)

### Refund Calculation

```typescript
// Partial refund adjustment
const refundPercentage = refundAmount / bookingAmount;
const adjustedPayoutAmount = payoutAmount * (1 - refundPercentage);
```

### Refund Flow

```
Admin Creates Refund
    ↓
Razorpay Refund API
    ↓
Refund Transaction Created
    ↓
Booking Updated (if full refund)
    ↓
Booking payout_status = REFUNDED (if full refund)
    ↓
Payout Adjusted/Cancelled
    ↓
Webhook: refund.processed
    ↓
Final Status Update
```

---

## Usage Examples

### Example 1: Complete Payout Flow

```typescript
// 1. User payment verified (automatic)
// Payout created automatically via queue

// 2. Admin views pending payouts
GET /admin/payouts?status=pending

// 3. Admin initiates transfer
POST /admin/payouts/{payoutId}/transfer

// 4. Transfer processed in background
// Status: processing → completed (via webhook)
```

### Example 2: Refund with Payout Adjustment

```typescript
// 1. Admin creates partial refund
POST /admin/payouts/bookings/{bookingId}/refund
{
  "amount": 1000,
  "reason": "Service not provided"
}

// 2. System automatically:
// - Creates refund in Razorpay
// - Updates booking (if full refund)
// - Adjusts payout amount
// - Creates audit trail
// - Sends notifications
```

### Example 3: Retry Failed Transfer

```typescript
// 1. Transfer fails (webhook: transfer.failed)
// Payout status: failed

// 2. Admin retries
POST /admin/payouts/{payoutId}/retry

// 3. Transfer processed again
// Status: processing → completed (via webhook)
```

---

## Error Handling

### Common Errors

#### 1. Payout Account Not Activated
```
Status: 400
Message: "Payout account is not activated. Please activate the account first."
```

**Solution**: Activate academy payout account first

#### 2. Payout Account Not Ready
```
Status: 400
Message: "Payout account is not ready for payouts"
```

**Solution**: Ensure payout account has `ready_for_payout: 'ready'`

#### 3. Invalid Payout Status
```
Status: 400
Message: "Cannot initiate transfer for payout in {status} status"
```

**Solution**: Only `pending` or `failed` payouts can be transferred

#### 4. Transfer Already Exists
```
Status: 400
Message: "Transfer already initiated for this payout"
```

**Solution**: Check payout status, don't retry if already processing

#### 5. Insufficient Balance
```
Status: 500 (from Razorpay)
Message: "Insufficient balance in merchant account"
```

**Solution**: Add funds to merchant account

### Error Recovery

1. **Failed Transfer**: Use retry endpoint
2. **Webhook Missed**: Manually check Razorpay and update status
3. **Queue Failure**: Check queue logs, retry job if needed

---

## Best Practices

### 1. Payout Management

- ✅ Always verify payout account is activated before transfer
- ✅ Check payout statistics regularly
- ✅ Monitor failed transfers and retry promptly
- ✅ Keep audit trail for all operations
- ✅ Use filters to find specific payouts

### 2. Refund Management

- ✅ Always provide clear refund reason
- ✅ Verify booking status before refund
- ✅ Check payout status before refund (if completed, reversal needed)
- ✅ Use partial refunds when appropriate
- ✅ Monitor refund webhooks for status updates

### 3. Queue Management

- ✅ Monitor queue health and job failures
- ✅ Adjust concurrency based on load
- ✅ Set appropriate retry attempts
- ✅ Clean up old completed jobs

### 4. Webhook Management

- ✅ Ensure webhook endpoint is accessible
- ✅ Handle webhook failures gracefully
- ✅ Verify webhook signatures (if implemented)
- ✅ Log all webhook events

### 5. Security

- ✅ Always use admin authentication
- ✅ Log all admin actions (audit trail)
- ✅ Validate all inputs
- ✅ Handle sensitive data securely

---

## Configuration

### Environment Variables

```env
# Queue Concurrency
PAYOUT_CREATION_CONCURRENCY=2
PAYOUT_TRANSFER_CONCURRENCY=2

# Redis Configuration (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB_BULLMQ=1
```

### Queue Settings

**Payout Creation Queue**:
- Retry attempts: 3
- Backoff: Exponential (2s)
- Job retention: 24 hours (completed), 7 days (failed)

**Payout Transfer Queue**:
- Retry attempts: 5
- Backoff: Exponential (3s)
- Job retention: 24 hours (completed), 7 days (failed)

---

## Testing

### Manual Testing

1. **Create Test Booking**: Book a slot and complete payment
2. **Verify Payout Created**: Check `/admin/payouts?status=pending`
3. **Initiate Transfer**: Use `POST /admin/payouts/{id}/transfer`
4. **Check Status**: Monitor payout status via webhook or API
5. **Test Refund**: Create refund and verify payout adjustment

### Webhook Testing

Use Razorpay webhook testing tool or send test webhooks:

```bash
curl -X POST 'http://localhost:3001/api/v1/webhooks/razorpay' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "transfer.processed",
    "payload": {
      "transfer": {
        "entity": {
          "id": "trf_test",
          "amount": 405000,
          "currency": "INR",
          "status": "processed"
        }
      }
    }
  }'
```

---

## Troubleshooting

### Issue: Payout Not Created After Payment

**Check**:
1. Payment verification successful?
2. Commission and payout amount > 0?
3. Academy payout account exists and activated?
4. Queue worker running?
5. Check queue logs for errors

### Issue: Transfer Fails

**Check**:
1. Payout account activated and ready?
2. Merchant account has sufficient balance?
3. Razorpay account ID correct?
4. Check Razorpay dashboard for errors
5. Review webhook logs

### Issue: Refund Not Adjusting Payout

**Check**:
1. Refund created successfully in Razorpay?
2. Webhook received?
3. Payout status (can't adjust if already completed)
4. Check refund transaction record

---

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review audit trails for operation history
3. Check Razorpay dashboard for payment/transfer status
4. Contact development team with error details

---

## Changelog

### Version 1.0.0 (2026-01-20)
- Initial implementation
- Payout creation on payment verification
- Manual transfer creation
- Refund system with payout adjustment
- Webhook handlers for transfer and refund
- Queue-based processing
- Audit trails and notifications
- Booking `payout_status` field to track payout status in booking model

---

## Related Documentation

- [Academy Payout Account Guide](./ACADEMY_PAYOUT_ACCOUNT_GUIDE.md)
- [Frontend Payout Account API Guide](./FRONTEND_PAYOUT_ACCOUNT_API_GUIDE.md)
- [Booking System Documentation](./BOOKING_SYSTEM.md)
- [Transaction System Documentation](./TRANSACTION_SYSTEM.md)
