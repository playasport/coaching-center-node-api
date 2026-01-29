# Booking Flow and Audit Trail System

This document describes the new booking flow with academy approval, payment processing, and comprehensive audit trail tracking.

## Overview

The booking system has been updated to include:
- **New Booking Flow**: User books slot → Academy approves → User pays → Booking confirmed
- **Audit Trail**: Complete tracking of all booking actions with timestamps
- **Status Management**: Enhanced booking and payment status tracking
- **Cancellation**: User can cancel bookings (with restrictions) and provide reasons

## Table of Contents

1. [New Booking Flow](#new-booking-flow)
2. [Booking Statuses](#booking-statuses)
3. [Payment Statuses](#payment-statuses)
4. [Audit Trail System](#audit-trail-system)
5. [API Endpoints](#api-endpoints)
6. [Cancellation Rules](#cancellation-rules)
7. [Examples](#examples)

## New Booking Flow

### Complete Flow Diagram

```
1. User views booking summary
   ↓
2. User clicks "Book Slot" button
   ↓
3. System calculates:
   - Batch amount (admission + base fee)
   - Platform fee
   - GST
   - Total amount
   - Commission
   ↓
4. Booking created with SLOT_BOOKED status:
   - Slots occupied based on participant count
   - Payment status: NOT_INITIATED
   ↓
5. Notifications sent to:
   - Academy owner
   - User
   - Admin
   ↓
6. Academy reviews booking request
   ↓
7a. If APPROVED:
    - Booking status: APPROVED
    - User gets payment option
    - User creates payment order
    - Payment status: INITIATED
    - User makes payment
    - Payment verified
    - Booking status: CONFIRMED
    - Payment status: SUCCESS
   ↓
7b. If REJECTED:
    - Booking status: REJECTED
    - Slots released
    - User notified
```

## Booking Statuses

### Status Flow

```
SLOT_BOOKED → APPROVED → CONFIRMED (after payment)
            ↘ REJECTED
            ↘ CANCELLED (user cancels)
```

### Status Descriptions

| Status | Description | When It Occurs |
|--------|-------------|----------------|
| **SLOT_BOOKED** | User has booked the slot, waiting for academy approval | After user clicks "Book Slot" |
| **APPROVED** | Academy approved, waiting for user payment | After academy approves booking request |
| **REJECTED** | Academy rejected the booking request | After academy rejects booking request |
| **PAYMENT_PENDING** | Payment pending (legacy status) | Used in old flow |
| **CONFIRMED** | Payment successful, booking confirmed | After payment verification |
| **CANCELLED** | Booking cancelled | User or system cancels booking |
| **COMPLETED** | Booking completed | After batch completion |

### Legacy Statuses (for backward compatibility)

- **REQUESTED**: Deprecated - Use SLOT_BOOKED instead
- **PENDING**: Deprecated - Use PAYMENT_PENDING instead

## Payment Statuses

### Status Flow

```
NOT_INITIATED → INITIATED → PENDING → PROCESSING → SUCCESS
                                    ↓
                                  FAILED
```

### Status Descriptions

| Status | Description | When It Occurs |
|--------|-------------|----------------|
| **NOT_INITIATED** | Payment not yet initiated | Booking is SLOT_BOOKED or APPROVED, waiting for payment order creation |
| **INITIATED** | Razorpay payment order created, payment initiated | After user creates payment order (after academy approval) |
| **PENDING** | Payment initiated but not completed | Legacy status, also used in old flow |
| **PROCESSING** | Payment is being processed | During payment processing |
| **SUCCESS** | Payment successful | After payment verification |
| **FAILED** | Payment failed | Payment attempt failed |
| **REFUNDED** | Payment refunded | After refund processing |
| **CANCELLED** | Payment cancelled | Payment order cancelled |

## Audit Trail System

### Overview

All booking actions are tracked in the audit trail system with:
- **Action Type**: What action was performed
- **Scale**: Importance level (low, medium, high, critical)
- **Label**: Human-readable description
- **Metadata**: Additional context (timestamps, previous status, etc.)

### Audit Trail Actions

| Action Type | Scale | Description |
|-------------|-------|-------------|
| `BOOKING_REQUESTED` | MEDIUM | Booking request created |
| `BOOKING_APPROVED` | HIGH | Academy approved booking |
| `BOOKING_REJECTED` | MEDIUM | Academy rejected booking |
| `BOOKING_CONFIRMED` | HIGH | Payment successful, booking confirmed |
| `BOOKING_CANCELLED` | MEDIUM | Booking cancelled by user |
| `PAYMENT_INITIATED` | MEDIUM | Payment order created |
| `PAYMENT_SUCCESS` | HIGH | Payment successful |
| `PAYMENT_FAILED` | MEDIUM | Payment failed |

### Audit Trail Model

```typescript
{
  id: string;
  action: ActionType;
  scale: ActionScale; // 'low' | 'medium' | 'high' | 'critical'
  label: string;
  entityType: string; // 'Booking'
  entityId: ObjectId | string;
  userId?: ObjectId;
  academyId?: ObjectId;
  bookingId?: ObjectId;
  metadata?: {
    reason?: string;
    cancelledBy?: 'user' | 'academy' | 'admin';
    cancelledAt?: string;
    previousStatus?: string;
    previousPaymentStatus?: string;
    // ... other context
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
```

## API Endpoints

### User Booking Endpoints

#### 1. Get Booking Summary
```
GET /api/v1/user/booking/summary?batchId=:batchId&participantIds=:participantId1,:participantId2
```
Get booking summary before booking slot.

#### 2. Book Slot (New Flow)
```
POST /api/v1/user/booking/book-slot
Body: {
  "batchId": "...",
  "participantIds": ["..."],
  "notes": "Optional notes"
}
```
Creates booking with SLOT_BOOKED status, occupies slots, sends notifications.

#### 3. Create Payment Order (After Academy Approval)
```
POST /api/v1/user/booking/:bookingId/create-payment-order
```
Creates Razorpay payment order for APPROVED booking. Sets payment status to INITIATED.

#### 4. Verify Payment
```
POST /api/v1/user/booking/verify-payment
Body: {
  "razorpay_order_id": "...",
  "razorpay_payment_id": "...",
  "razorpay_signature": "..."
}
```
Verifies payment and updates booking to CONFIRMED status.

#### 5. Cancel Booking (With Reason)
```
POST /api/v1/user/booking/:bookingId/cancel
Body: {
  "reason": "Change of plans"
}
```
Cancels booking with reason. Cannot cancel after payment success.

#### 6. Get User Bookings
```
GET /api/v1/user/booking?page=1&limit=10&status=slot_booked&paymentStatus=not_initiated
```
Get paginated list of user bookings with filters.

### Academy Booking Endpoints

#### 1. Get Academy Bookings
```
GET /api/v1/academy/booking?page=1&limit=10&status=slot_booked
```
Get paginated list of bookings for academy's coaching centers.

#### 2. Get Booking by ID
```
GET /api/v1/academy/booking/:id
```
Get booking details (shows only batch amount).

#### 3. Approve Booking Request
```
POST /api/v1/academy/booking/:id/approve
```
Approve booking request. Changes status from SLOT_BOOKED to APPROVED.

#### 4. Reject Booking Request
```
POST /api/v1/academy/booking/:id/reject
Body: {
  "reason": "Optional rejection reason"
}
```
Reject booking request. Changes status from SLOT_BOOKED to REJECTED.

#### 5. Update Booking Status
```
PATCH /api/v1/academy/booking/:id/status
Body: {
  "status": "confirmed"
}
```
Update booking status (for other status changes).

## Cancellation Rules

### User Cancellation

**Can Cancel:**
- Booking status: SLOT_BOOKED, APPROVED, PAYMENT_PENDING
- Payment status: NOT_INITIATED, INITIATED, PENDING, FAILED

**Cannot Cancel:**
- Booking status: CONFIRMED, COMPLETED, CANCELLED
- Payment status: SUCCESS

**Cancellation Process:**
1. User provides cancellation reason (required, 1-500 characters)
2. Booking status updated to CANCELLED
3. Payment status updated to CANCELLED (if INITIATED or PENDING)
4. Slots automatically released (CANCELLED bookings don't occupy slots)
5. Audit trail entry created with:
   - Action: `BOOKING_CANCELLED`
   - Metadata: reason, cancelledBy: 'user', timestamps, previous statuses
6. Transaction record updated (if exists)

## Examples

### Example 1: Complete Booking Flow

**Step 1: User gets summary**
```json
GET /api/v1/user/booking/summary?batchId=507f1f77bcf86cd799439011&participantIds=507f1f77bcf86cd799439012

Response: {
  "amount": 2059,
  "currency": "INR",
  "breakdown": {
    "batch_amount": 2000,
    "platform_fee": 50,
    "gst_amount": 9,
    "gst_percentage": 18,
    "total": 2059
  }
}
```

**Step 2: User books slot**
```json
POST /api/v1/user/booking/book-slot
Body: {
  "batchId": "507f1f77bcf86cd799439011",
  "participantIds": ["507f1f77bcf86cd799439012"],
  "notes": "Looking forward to joining"
}

Response: {
  "id": "booking-uuid",
  "status": "slot_booked",
  "payment": {
    "status": "not_initiated"
  }
}
```

**Step 3: Academy approves**
```json
POST /api/v1/academy/booking/:id/approve

Response: {
  "id": "booking-uuid",
  "status": "approved",
  "payment": {
    "status": "not_initiated"
  }
}
```

**Step 4: User creates payment order**
```json
POST /api/v1/user/booking/:bookingId/create-payment-order

Response: {
  "booking": { ... },
  "razorpayOrder": {
    "id": "order_1234567890",
    "amount": 241900,
    "currency": "INR"
  }
}
```

**Step 5: User verifies payment**
```json
POST /api/v1/user/booking/verify-payment
Body: {
  "razorpay_order_id": "order_1234567890",
  "razorpay_payment_id": "pay_1234567890",
  "razorpay_signature": "..."
}

Response: {
  "id": "booking-uuid",
  "status": "confirmed",
  "payment": {
    "status": "success"
  }
}
```

### Example 2: Booking Cancellation

```json
POST /api/v1/user/booking/:bookingId/cancel
Body: {
  "reason": "Change of plans, will book later"
}

Response: {
  "id": "booking-uuid",
  "status": "cancelled",
  "payment": {
    "status": "cancelled",
    "failure_reason": "Change of plans, will book later"
  },
  "notes": "Change of plans, will book later"
}
```

### Example 3: Audit Trail Entry

When booking is cancelled, audit trail entry is created:

```json
{
  "action": "booking_cancelled",
  "scale": "medium",
  "label": "Booking cancelled by user: Change of plans",
  "entityType": "Booking",
  "entityId": "booking-uuid",
  "userId": "user-uuid",
  "academyId": "center-uuid",
  "bookingId": "booking-uuid",
  "metadata": {
    "reason": "Change of plans, will book later",
    "cancelledBy": "user",
    "cancelledAt": "2024-01-15T10:30:00Z",
    "previousStatus": "slot_booked",
    "previousPaymentStatus": "not_initiated"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Related Documentation

- [Commission and Price Breakdown System](./COMMISSION_AND_PRICE_BREAKDOWN_SYSTEM.md)
- [Admin Settings Management](./ADMIN_SETTINGS_MANAGEMENT.md)
- [Academy Approval Workflow](./ACADEMY_APPROVAL_WORKFLOW.md)

## Code References

- **Booking Model**: `src/models/booking.model.ts`
- **Audit Trail Model**: `src/models/auditTrail.model.ts`
- **Booking Service**: `src/services/client/booking.service.ts`
- **Academy Booking Service**: `src/services/academy/booking.service.ts`
- **Audit Trail Service**: `src/services/common/auditTrail.service.ts`
