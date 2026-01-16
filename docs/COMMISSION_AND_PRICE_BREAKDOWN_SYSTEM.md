# Commission and Price Breakdown System

This document describes the commission system and price breakdown storage implementation for academy payouts and booking management.

## Overview

The system implements a commission-based payout structure where:
- **Platform** charges platform fee and GST (on platform_fee only) from users
- **Academy** receives batch amount (admission fee + base fee)
- **Commission** is calculated on batch amount and deducted from academy payout
- **Price breakdown** is stored at booking creation time for historical accuracy
- **GST Calculation**: GST is applied only on platform_fee, not on the entire amount

## Table of Contents

1. [Architecture](#architecture)
2. [Settings Configuration](#settings-configuration)
3. [Booking Model Changes](#booking-model-changes)
4. [Commission Calculation](#commission-calculation)
5. [Price Breakdown Structure](#price-breakdown-structure)
6. [Academy API Restrictions](#academy-api-restrictions)
7. [Data Flow](#data-flow)
8. [Examples](#examples)

## Architecture

### Key Components

```
Booking Creation
    ↓
Calculate Price Breakdown (batch amount, platform fee, GST on platform_fee only)
    ↓
Calculate Commission (on batch amount)
    ↓
Store in Booking Document
    ↓
Academy APIs (show only batch amount)
```

### Data Flow

1. **User Creates Booking** → System calculates price breakdown
2. **Payment Confirmed** → Commission calculated and stored
3. **Academy Views Bookings** → Only sees batch amount (no platform fee/GST)
4. **Payout Processing** → Uses stored commission and payout amount

## Settings Configuration

### Commission Rate

The commission rate is configured in the Settings collection under `fees.commission_rate`.

**Location**: Admin Settings Panel
**Type**: Number (decimal, e.g., 0.10 for 10%)
**Default**: 0 (if not set)

```typescript
// Settings Model
interface FeeConfig {
  platform_fee?: number | null;
  gst_percentage?: number | null;
  gst_enabled?: boolean | null;
  currency?: string | null;
  commission_rate?: number | null; // NEW: Commission rate (e.g., 0.10 for 10%)
}
```

### API Endpoint

```
PATCH /api/v1/admin/settings
```

**Request Body**:
```json
{
  "fees": {
    "commission_rate": 0.10
  }
}
```

## Booking Model Changes

### Commission Details

Added `commission` object to Booking model:

```typescript
interface CommissionDetails {
  rate: number;           // Commission rate used (e.g., 0.10 for 10%)
  amount: number;         // Calculated commission amount
  payoutAmount: number;   // Amount to be paid to academy (batch_amount - commission_amount)
  calculatedAt: Date;     // When commission was calculated
}
```

### Price Breakdown

Added `priceBreakdown` object to Booking model:

```typescript
interface PriceBreakdown {
  // Batch-related (Academy sees this)
  admission_fee_per_participant: number;
  total_admission_fee: number;
  base_fee_per_participant: number;
  total_base_fee: number;
  batch_amount: number;   // admission_fee + base_fee (what academy earns)
  
  // Platform charges (Academy doesn't see this)
  platform_fee: number;
  subtotal: number;       // batch_amount + platform_fee
  gst_percentage: number;
  gst_amount: number;
  total_amount: number;   // Final amount user pays
  
  // Metadata
  participant_count: number;
  currency: string;
  calculated_at: Date;
}
```

### Complete Booking Interface

```typescript
interface Booking {
  // ... existing fields
  amount: number;                    // Total booking amount (user pays)
  commission?: CommissionDetails | null;
  priceBreakdown?: PriceBreakdown | null;
  // ... other fields
}
```

## Commission Calculation

### Formula

```
batch_amount = (admission_fee_per_participant + base_fee_per_participant) × participant_count
commission_amount = batch_amount × commission_rate
payout_amount = batch_amount - commission_amount
```

### Example

```
Batch Details:
- Admission Fee per Participant: ₹100
- Base Fee per Participant: ₹900
- Participants: 2
- Commission Rate: 10% (0.10)

Calculation:
- batch_amount = (100 + 900) × 2 = ₹2000
- commission_amount = 2000 × 0.10 = ₹200
- payout_amount = 2000 - 200 = ₹1800

User Pays:
- batch_amount: ₹2000
- platform_fee: ₹50
- GST (18% on platform_fee only): ₹9
- total_amount: ₹2059
```

### Implementation

Commission is calculated **at booking creation time** and stored permanently:

```typescript
// In booking.service.ts - getBookingSummary()
const commissionRate = settings.fees?.commission_rate ?? 0;
const commissionAmount = roundToTwoDecimals(baseAmount * commissionRate);
const payoutAmount = roundToTwoDecimals(baseAmount - commissionAmount);

const commission = {
  rate: commissionRate,
  amount: commissionAmount,
  payoutAmount: payoutAmount,
  calculatedAt: new Date(),
};
```

**Why store at booking time?**
- Historical accuracy (rates may change later)
- Audit trail for financial records
- Faster payout calculations (no recalculation needed)
- Transparency for academy owners

## Price Breakdown Structure

### Breakdown Components

| Component | Description | Visible to Academy |
|-----------|-------------|-------------------|
| `admission_fee_per_participant` | Admission fee per participant | ✅ Yes |
| `total_admission_fee` | Total admission fee (fee × count) | ✅ Yes |
| `base_fee_per_participant` | Base fee per participant | ✅ Yes |
| `total_base_fee` | Total base fee (fee × count) | ✅ Yes |
| `batch_amount` | Admission fee + Base fee | ✅ Yes (What they earn) |
| `platform_fee` | Platform service charge | ❌ No |
| `gst_amount` | GST on platform_fee only | ❌ No |
| `total_amount` | Final amount user pays | ❌ No |

### Storage

Price breakdown is stored **when booking is created** (not calculated on-the-fly):

```typescript
// In booking.service.ts - createOrder()
const bookingData = {
  // ... other fields
  commission: summary.commission || null,
  priceBreakdown: summary.priceBreakdown || null,
};
```

## Academy API Restrictions

### Overview

Academy users **only see batch amount** (admission fee + base fee) in all listing APIs. Platform fee, GST, and total amount are hidden.

### Affected APIs

#### 1. Academy Booking List
**Endpoint**: `GET /api/v1/academy/booking`

**Response**:
```json
{
  "data": [
    {
      "amount": 2000,  // Only batch_amount (not total amount)
      // ... other fields
    }
  ]
}
```

**Implementation**: 
- Uses `booking.priceBreakdown.batch_amount` if available
- Falls back to `booking.amount` for backward compatibility

#### 2. Academy Booking Detail
**Endpoint**: `GET /api/v1/academy/booking/:id`

**Response**:
```json
{
  "booking": {
    "amount": 2000,  // Only batch_amount
    // priceBreakdown and commission fields are not exposed
  }
}
```

#### 3. Academy Student List
**Endpoint**: `GET /api/v1/academy/my-student`

**Response**:
```json
{
  "data": [
    {
      "batches": [
        {
          "amount": 2000  // Only batch_amount
        }
      ]
    }
  ]
}
```

#### 4. Academy Student Detail
**Endpoint**: `GET /api/v1/academy/my-student/:participantId`

**Response**:
```json
{
  "student": {
    "batches": [
      {
        "booking": {
          "amount": 2000,  // Only batch_amount
          "payment": {
            "amount": 2000  // Only batch_amount
          }
        }
      }
    ]
  }
}
```

#### 5. Academy User List
**Endpoint**: `GET /api/v1/academy/user`

**Note**: This API shows user information, not booking amounts directly.

## Data Flow

### Booking Creation Flow (New Flow)

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
   ↓
4. System calculates commission:
   - Commission rate from settings
   - Commission amount (batch_amount × rate)
   - Payout amount (batch_amount - commission)
   ↓
5. Booking created with SLOT_BOOKED status:
   - amount: total_amount (user pays)
   - commission: { rate, amount, payoutAmount }
   - priceBreakdown: { batch_amount, platform_fee, gst, total_amount, ... }
   - status: SLOT_BOOKED
   ↓
6. Slots occupied based on participant count
   ↓
7. Notifications sent to:
   - Academy owner
   - User
   - Admin
   ↓
8. Academy reviews and approves/rejects
   ↓
9a. If APPROVED:
    - Booking status: APPROVED
    - User gets payment option
    - User creates payment order
    - User makes payment
    - Payment verified
    - Booking status: CONFIRMED
   ↓
9b. If REJECTED:
    - Booking status: REJECTED
    - Slots released
    - User notified
```

### Booking Status Flow

```
SLOT_BOOKED → APPROVED → CONFIRMED (after payment)
            ↘ REJECTED
            ↘ CANCELLED (user cancels)
```

**Status Descriptions:**
- **SLOT_BOOKED**: User has booked the slot, waiting for academy approval (user-friendly name)
- **APPROVED**: Academy approved, waiting for user payment
- **REJECTED**: Academy rejected the booking request
- **PAYMENT_PENDING**: Payment pending (legacy status, for backward compatibility)
- **CONFIRMED**: Payment successful, booking confirmed
- **CANCELLED**: Booking cancelled
- **COMPLETED**: Booking completed

**Legacy Statuses (for backward compatibility):**
- **REQUESTED**: Deprecated - Use SLOT_BOOKED instead
- **PENDING**: Deprecated - Use PAYMENT_PENDING instead

### Payment Status Flow

```
NOT_INITIATED → INITIATED → PENDING → PROCESSING → SUCCESS
                                ↓
                              FAILED
```

**Payment Status Descriptions:**
- **NOT_INITIATED**: Payment not yet initiated (booking is SLOT_BOOKED or APPROVED, waiting for payment order creation)
- **INITIATED**: Razorpay payment order created, payment initiated, waiting for user to complete payment
- **PENDING**: Payment initiated but not completed (legacy status, also used in old flow)
- **PROCESSING**: Payment is being processed
- **SUCCESS**: Payment successful
- **FAILED**: Payment failed
- **REFUNDED**: Payment refunded
- **CANCELLED**: Payment cancelled

### Academy View Flow

```
1. Academy requests booking list
   ↓
2. System fetches bookings
   ↓
3. System transforms response:
   - Replace amount with priceBreakdown.batch_amount
   - Hide priceBreakdown and commission details
   ↓
4. Academy sees only batch amount
```

## Examples

### Example 1: Booking with Commission

**Scenario**:
- Admission Fee: ₹100 per participant
- Base Fee: ₹900 per participant
- Participants: 2
- Commission Rate: 10%
- Platform Fee: ₹50
- GST: 18%

**Calculation**:
```json
{
  "priceBreakdown": {
    "admission_fee_per_participant": 100,
    "total_admission_fee": 200,
    "base_fee_per_participant": 900,
    "total_base_fee": 1800,
    "batch_amount": 2000,        // Academy earns this
    "platform_fee": 50,
    "subtotal": 2050,
    "gst_percentage": 18,
    "gst_amount": 9,             // GST on platform_fee only (50 × 18% = 9)
    "total_amount": 2059,        // User pays this (2000 + 50 + 9)
    "participant_count": 2,
    "currency": "INR",
    "calculated_at": "2024-01-15T10:00:00Z"
  },
  "commission": {
    "rate": 0.10,
    "amount": 200,               // Commission deducted
    "payoutAmount": 1800,        // Academy receives this
    "calculatedAt": "2024-01-15T10:00:00Z"
  },
  "amount": 2059                 // Total amount (user pays)
}
```

**Academy View**:
```json
{
  "amount": 2000  // Only batch_amount visible
}
```

### Example 2: Multiple Bookings Payout

**Bookings**:
- Booking 1: batch_amount = ₹2000, commission = ₹200, payout = ₹1800
- Booking 2: batch_amount = ₹1500, commission = ₹150, payout = ₹1350
- Booking 3: batch_amount = ₹3000, commission = ₹300, payout = ₹2700

**Payout Calculation**:
```
totalBatchAmount = 2000 + 1500 + 3000 = ₹6500
totalCommission = 200 + 150 + 300 = ₹650
totalPayoutAmount = 1800 + 1350 + 2700 = ₹5850
```

## Benefits

### 1. Financial Accuracy
- Commission locked at booking time
- Historical data preserved
- No recalculation needed

### 2. Transparency
- Academy sees exactly what they earn
- Clear separation of batch amount vs total amount
- Commission clearly tracked

### 3. Performance
- Pre-calculated values for faster queries
- No complex calculations during payout
- Efficient aggregation for payout totals

### 4. Audit Trail
- Complete financial history
- Commission rate used at time of booking
- Timestamps for all calculations

## Migration Notes

### Existing Bookings

For existing bookings without `priceBreakdown` or `commission`:
- System uses fallback to `booking.amount` for academy views
- Consider data migration script to calculate historical breakdowns
- New bookings automatically include breakdown and commission

### Backward Compatibility

- Academy APIs check for `priceBreakdown` first
- Fall back to `booking.amount` if not available
- No breaking changes to existing functionality

## Future Enhancements

### Planned Features

1. **Payout Table**: Separate payout records with status tracking
2. **Payout APIs**: Create, list, and manage payouts
3. **Automatic Payouts**: Scheduled payout processing
4. **Payout History**: Complete audit trail for academy
5. **Commission Reports**: Admin dashboard for commission analytics

## Related Documentation

- [Admin Settings Management](./ADMIN_SETTINGS_MANAGEMENT.md)
- [Transaction Payment Management](./ADMIN_TRANSACTION_PAYMENT_MANAGEMENT.md)
- [Academy Booking API](./BATCH_API_DOCUMENTATION.md)
- [Booking Flow and Audit Trail](./BOOKING_FLOW_AND_AUDIT_TRAIL.md) - Complete guide to new booking flow with audit trail

## API Endpoints

### Commission Rate Configuration

**Update Commission Rate**:
```
PATCH /api/v1/admin/settings
```

**Request**:
```json
{
  "fees": {
    "commission_rate": 0.10
  }
}
```

### User Booking APIs (New Flow)

**Get Booking Summary**:
```
GET /api/v1/user/booking/summary?batchId=:batchId&participantIds=:participantId1,:participantId2
```

**Book Slot** (New Flow - Creates booking request):
```
POST /api/v1/user/booking/book-slot
Body: {
  "batchId": "...",
  "participantIds": ["..."],
  "notes": "Optional notes"
}
```

**Create Payment Order** (After academy approval):
```
POST /api/v1/user/booking/:bookingId/create-payment-order
```

**Verify Payment**:
```
POST /api/v1/user/booking/verify-payment
Body: {
  "razorpay_order_id": "...",
  "razorpay_payment_id": "...",
  "razorpay_signature": "..."
}
```

**Cancel Booking** (With reason):
```
POST /api/v1/user/booking/:bookingId/cancel
Body: {
  "reason": "Change of plans"
}
```

**Get User Bookings**:
```
GET /api/v1/user/booking?page=1&limit=10&status=slot_booked&paymentStatus=not_initiated
```

### Academy Booking APIs

**List Bookings** (shows only batch amount):
```
GET /api/v1/academy/booking?page=1&limit=10&status=slot_booked
```

**Get Booking Detail** (shows only batch amount):
```
GET /api/v1/academy/booking/:id
```

**Approve Booking Request**:
```
POST /api/v1/academy/booking/:id/approve
```

**Reject Booking Request**:
```
POST /api/v1/academy/booking/:id/reject
Body: {
  "reason": "Optional rejection reason"
}
```

**Update Booking Status**:
```
PATCH /api/v1/academy/booking/:id/status
Body: {
  "status": "confirmed"
}
```

**List Students** (shows only batch amount):
```
GET /api/v1/academy/my-student?page=1&limit=10
```

**List Users** (enrolled users):
```
GET /api/v1/academy/user?page=1&limit=10
```

## Database Schema

### Booking Model

```typescript
{
  id: string;
  amount: number;              // Total amount user pays
  commission?: {
    rate: number;
    amount: number;
    payoutAmount: number;
    calculatedAt: Date;
  };
  priceBreakdown?: {
    batch_amount: number;      // What academy earns
    platform_fee: number;
    gst_amount: number;        // GST on platform_fee only
    total_amount: number;      // What user pays (batch_amount + platform_fee + GST)
    // ... other fields
  };
  // ... other fields
}
```

## Code References

- **Model**: `src/models/booking.model.ts`
- **Settings Model**: `src/models/settings.model.ts`
- **Booking Service**: `src/services/client/booking.service.ts`
- **Academy Booking Service**: `src/services/academy/booking.service.ts`
- **Academy Student Service**: `src/services/academy/student.service.ts`

## Testing

### Test Scenarios

1. **Commission Calculation**:
   - Test with different commission rates
   - Verify payout amount = batch_amount - commission

2. **Academy View**:
   - Verify academy only sees batch_amount
   - Verify platform fee and GST are hidden

3. **Price Breakdown**:
   - Verify all components are calculated correctly
   - Verify breakdown is stored at booking creation

4. **Backward Compatibility**:
   - Test with bookings without priceBreakdown
   - Verify fallback to booking.amount works
