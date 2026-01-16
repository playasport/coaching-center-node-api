# Frontend Booking Flow Integration Guide

This guide explains how to integrate the booking flow in the frontend, including when to call APIs, which buttons to show, and how to handle different booking states.

## Table of Contents

1. [Overview](#overview)
2. [Booking Flow States](#booking-flow-states)
3. [API Endpoints](#api-endpoints)
4. [Button Visibility Logic](#button-visibility-logic)
5. [Response Structure](#response-structure)
6. [UI/UX Recommendations](#uiux-recommendations)
7. [Error Handling](#error-handling)
8. [Complete Flow Examples](#complete-flow-examples)

## Overview

The booking system follows this flow:
1. **View Summary** → User sees booking details and pricing
2. **Book Slot** → User creates booking request (slots occupied)
3. **Academy Approval** → Academy approves/rejects (user waits)
4. **Payment** → User pays after approval
5. **Confirmation** → Booking confirmed after successful payment

## Booking Flow States

### State Diagram

```
┌─────────────────┐
│  View Summary   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Book Slot     │ → status: SLOT_BOOKED, payment_status: NOT_INITIATED
└────────┬────────┘
         │
         ├───► Academy Reviews
         │
         ├───► APPROVED → status: APPROVED, payment_status: NOT_INITIATED
         │                [Show Payment Button]
         │
         └───► REJECTED → status: REJECTED
                          [Show Rejection Message]
         │
         ▼
┌─────────────────┐
│ Create Payment  │ → payment_status: INITIATED
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Make Payment   │ → User completes Razorpay payment
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify Payment  │ → status: CONFIRMED, payment_status: SUCCESS
└─────────────────┘
```

## API Endpoints

### 1. Get Booking Summary
**Endpoint:** `GET /api/v1/user/booking/summary?batchId={id}&participantIds={id1,id2}`

**When to Call:**
- Before showing booking details to user
- When user selects participants
- When user wants to see pricing breakdown

**Response:**
```json
{
  "success": true,
  "data": {
    "batch": { /* batch details */ },
    "participants": [ /* participant list */ ],
    "amount": 5000,
    "currency": "INR",
    "breakdown": {
      "subtotal": 4500,
      "platform_fee": 200,
      "gst": 36,
      "total": 4736
    }
  }
}
```

**Action:** Show "Book Slot" button

---

### 2. Book Slot
**Endpoint:** `POST /api/v1/user/booking/book-slot`

**When to Call:**
- When user clicks "Book Slot" button
- After user confirms booking details

**Request:**
```json
{
  "batchId": "batch_id_here",
  "participantIds": ["participant_id_1", "participant_id_2"],
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_id",
    "booking_id": "PS-2024-0001",
    "status": "slot_booked",
    "amount": 5000,
    "payment": {
      "status": "not_initiated"
    }
  }
}
```

**Action:** 
- Hide "Book Slot" button
- Show "Waiting for Academy Approval" message
- Show "Cancel Booking" button (if allowed)

---

### 3. Get User Bookings (List)
**Endpoint:** `GET /api/v1/user/booking?page=1&limit=10&status={status}&paymentStatus={status}`

**When to Call:**
- On bookings list page load
- When filtering bookings
- On pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "booking_id",
        "booking_id": "PS-2024-0001",
        "status": "approved", // or null if CANCELLED and should be hidden
        "payment_status": "not_initiated", // or null if CANCELLED and should be hidden
        "payment_enabled": true, // ← Use this flag!
        "can_cancel": true, // ← Use this flag!
        "status_message": "Your booking has been approved. Please proceed with payment...",
        "amount": 5000,
        "batch": { /* batch details */ },
        "participants": [ /* participants */ ]
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

**Action:** 
- Use `payment_enabled` flag to show/hide payment button
- Use `can_cancel` flag to show/hide cancel button
- Use `status_message` to display user-friendly message
- Handle `null` status fields for CANCELLED bookings

---

### 4. Get Booking Details
**Endpoint:** `GET /api/v1/user/booking/{bookingId}`

**When to Call:**
- When user clicks on a booking to view details
- On booking details page load

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_id",
    "booking_id": "PS-2024-0001",
    "status": "approved", // or null if CANCELLED and should be hidden
    "amount": 5000,
    "payment": {
      "status": "not_initiated", // or null if CANCELLED and should be hidden
      "razorpay_order_id": null
    },
    "payment_enabled": true, // ← Use this flag!
    "can_cancel": true, // ← Use this flag!
    "status_message": "Your booking has been approved. Please proceed with payment...",
    "batch": { /* full batch details */ },
    "participants": [ /* full participant details */ ]
  }
}
```

**Action:** 
- Use `payment_enabled` to show payment button
- Use `can_cancel` to show cancel button
- Use `status_message` for display
- Handle `null` status fields appropriately

---

### 5. Create Payment Order
**Endpoint:** `POST /api/v1/user/booking/{bookingId}/create-payment-order`

**When to Call:**
- When user clicks "Pay Now" button
- Only when `payment_enabled === true`

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking_id",
      "booking_id": "PS-2024-0001",
      "status": "approved",
      "payment": {
        "razorpay_order_id": "order_xyz123",
        "status": "initiated"
      }
    },
    "razorpayOrder": {
      "id": "order_xyz123",
      "amount": 500000, // in paise
      "currency": "INR",
      "receipt": "receipt_123"
    }
  }
}
```

**Action:**
- Initialize Razorpay checkout with `razorpayOrder`
- Open Razorpay payment modal
- Handle payment success/failure

---

### 6. Verify Payment
**Endpoint:** `POST /api/v1/user/booking/verify-payment`

**When to Call:**
- After Razorpay payment success
- On payment callback

**Request:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_id",
    "booking_id": "PS-2024-0001",
    "status": "confirmed",
    "payment": {
      "razorpay_order_id": "order_xyz123",
      "razorpay_payment_id": "pay_abc456",
      "status": "success",
      "payment_method": "card",
      "paid_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Action:**
- Show success message
- Update booking status in UI
- Hide payment button
- Show booking confirmation

---

### 7. Cancel Booking
**Endpoint:** `POST /api/v1/user/booking/{bookingId}/cancel`

**When to Call:**
- When user clicks "Cancel Booking" button
- Only when cancellation is allowed

**Request:**
```json
{
  "reason": "Change of plans"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_id",
    "booking_id": "PS-2024-0001",
    "status": "cancelled",
    "payment": {
      "status": "cancelled"
    }
  }
}
```

**Action:**
- Show cancellation confirmation
- Update booking status
- Hide payment and cancel buttons

---

## Button Visibility Logic

### Payment Button ("Pay Now" / "Proceed to Payment")

**Show when:**
```javascript
// Use the payment_enabled flag from API response
if (booking.payment_enabled === true) {
  // Show payment button
}
```

**Hide when:**
- `payment_enabled === false`
- Booking status is `CONFIRMED`
- Booking status is `CANCELLED`
- Booking status is `REJECTED`
- Payment status is `SUCCESS`

**Implementation:**
```javascript
const showPaymentButton = (booking) => {
  // Always use the flag from API
  return booking.payment_enabled === true;
};
```

---

### Cancel Button ("Cancel Booking")

**Show when:**
```javascript
// Use the can_cancel flag from API response
if (booking.can_cancel === true) {
  // Show cancel button
}
```

**Hide when:**
- `can_cancel === false`
- Booking status is `CONFIRMED`
- Booking status is `CANCELLED`
- Booking status is `COMPLETED`
- Payment status is `SUCCESS`

**Implementation:**
```javascript
const showCancelButton = (booking) => {
  // Always use the flag from API
  return booking.can_cancel === true;
};
```

---

## Response Structure

### Status Fields Handling

**Important:** For CANCELLED bookings, `status` and `payment_status` may be `null`:

```javascript
// Handle null status fields
const displayStatus = (booking) => {
  // If status is null (CANCELLED booking), show appropriate message
  if (booking.status === null || booking.payment_status === null) {
    return 'Booking has been cancelled';
  }
  
  // Otherwise use status_message from API
  return booking.status_message;
};
```

**When status is null:**
- Booking is CANCELLED
- Payment was NOT completed, failed, refunded, or cancelled
- Hide status indicators
- Show cancellation message only

**When status is NOT null:**
- Normal booking flow
- Show status and payment status
- Use `status_message` for user-friendly display

---

## UI/UX Recommendations

### Booking List Page

```javascript
// Example React component logic
const BookingCard = ({ booking }) => {
  const showPayment = booking.payment_enabled === true;
  const showCancel = booking.can_cancel === true; // Use flag from API
  const statusText = booking.status_message || 'Booking cancelled';
  
  return (
    <div className="booking-card">
      <h3>{booking.batch.name}</h3>
      <p>{statusText}</p>
      
      {/* Status badge - handle null */}
      {booking.status && (
        <Badge status={booking.status} />
      )}
      
      {/* Payment button */}
      {showPayment && (
        <Button onClick={() => handlePayment(booking.id)}>
          Pay Now
        </Button>
      )}
      
      {/* Cancel button */}
      {showCancel && (
        <Button variant="outline" onClick={() => handleCancel(booking.id)}>
          Cancel Booking
        </Button>
      )}
    </div>
  );
};
```

### Booking Details Page

```javascript
const BookingDetails = ({ bookingId }) => {
  const [booking, setBooking] = useState(null);
  
  useEffect(() => {
    // Fetch booking details
    fetchBookingDetails(bookingId).then(setBooking);
  }, [bookingId]);
  
  if (!booking) return <Loading />;
  
  return (
    <div>
      <h1>Booking {booking.booking_id}</h1>
      
      {/* Status message */}
      <Alert>{booking.status_message}</Alert>
      
      {/* Status info - only show if not null */}
      {booking.status && booking.payment?.status && (
        <StatusInfo 
          status={booking.status} 
          paymentStatus={booking.payment.status} 
        />
      )}
      
      {/* Payment section */}
      {booking.payment_enabled && (
        <PaymentSection booking={booking} />
      )}
      
      {/* Cancel button */}
      {booking.can_cancel && (
        <CancelButton bookingId={booking.id} />
      )}
    </div>
  );
};
```

### Payment Flow

```javascript
const handlePayment = async (bookingId) => {
  try {
    // 1. Create payment order
    const { data } = await api.post(
      `/user/booking/${bookingId}/create-payment-order`
    );
    
    const { razorpayOrder } = data;
    
    // 2. Initialize Razorpay
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
      name: 'PlayAsport',
      description: `Booking ${data.booking.booking_id}`,
      handler: async (response) => {
        // 3. Verify payment
        await verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        
        // 4. Show success and refresh
        showSuccess('Payment successful!');
        refreshBookingDetails();
      },
      prefill: {
        // User details
      },
    };
    
    const razorpay = new window.Razorpay(options);
    razorpay.open();
    
  } catch (error) {
    showError(error.message);
  }
};
```

---

## Error Handling

### Common Error Scenarios

1. **Booking Not Found (404)**
   ```javascript
   if (error.status === 404) {
     showError('Booking not found');
     navigate('/bookings');
   }
   ```

2. **Payment Already Verified (400)**
   ```javascript
   if (error.message.includes('already verified')) {
     showError('Payment already processed');
     refreshBookingDetails();
   }
   ```

3. **Cannot Cancel (400)**
   ```javascript
   if (error.message.includes('Cannot cancel')) {
     showError('This booking cannot be cancelled');
   }
   ```

4. **Invalid Booking Status (400)**
   ```javascript
   if (error.message.includes('not in APPROVED status')) {
     showError('Payment can only be initiated for approved bookings');
   }
   ```

---

## Complete Flow Examples

### Example 1: Successful Booking Flow

```javascript
// Step 1: User views summary
const summary = await getBookingSummary(batchId, participantIds);
// Show: "Book Slot" button

// Step 2: User books slot
const booking = await bookSlot({ batchId, participantIds });
// Show: "Waiting for approval" message, "Cancel" button
// Hide: "Book Slot" button

// Step 3: Academy approves (user sees updated status)
const updatedBooking = await getBookingDetails(booking.id);
// Show: "Pay Now" button (payment_enabled: true)
// Keep: "Cancel" button

// Step 4: User clicks "Pay Now"
const paymentOrder = await createPaymentOrder(booking.id);
// Open Razorpay modal

// Step 5: Payment success
await verifyPayment(razorpayResponse);
// Show: Success message
// Hide: "Pay Now" and "Cancel" buttons
// Show: Booking confirmed badge
```

### Example 2: Cancelled Booking

```javascript
// User cancels booking
await cancelBooking(bookingId, { reason: 'Change of plans' });

// Response shows:
// - status: 'cancelled'
// - payment.status: 'cancelled'
// - payment_enabled: false

// UI should:
// - Hide payment button
// - Hide cancel button
// - Show cancellation message
// - Status fields may be null (handle gracefully)
```

### Example 3: Rejected Booking

```javascript
// Academy rejects booking
// User sees updated booking:
const booking = await getBookingDetails(bookingId);
// - status: 'rejected'
// - payment_enabled: false
// - status_message: 'Your booking request has been rejected...'

// UI should:
// - Hide payment button
// - Show rejection message
// - Optionally show "Cancel" button to clean up
```

---

## Quick Reference

### Status → Button Mapping

| Booking Status | Payment Status | payment_enabled | can_cancel | Show Payment? | Show Cancel? |
|----------------|----------------|-----------------|------------|---------------|--------------|
| SLOT_BOOKED | NOT_INITIATED | false | **true** | ❌ | ✅ |
| APPROVED | NOT_INITIATED | **true** | **true** | ✅ | ✅ |
| APPROVED | INITIATED | **true** | **true** | ✅ | ✅ |
| CONFIRMED | SUCCESS | false | false | ❌ | ❌ |
| REJECTED | NOT_INITIATED | false | **true** | ❌ | ✅ |
| CANCELLED | CANCELLED | false | false | ❌ | ❌ |
| CANCELLED | SUCCESS | false | false | ❌ | ❌ (status may be null) |

### API Call Sequence

```
1. GET /booking/summary → Show "Book Slot"
2. POST /booking/book-slot → Show "Cancel", wait for approval
3. GET /booking/{id} → Check payment_enabled
4. POST /booking/{id}/create-payment-order → Open Razorpay
5. POST /booking/verify-payment → Show success
```

---

## Best Practices

1. **Always use `payment_enabled` flag** - Don't calculate it on frontend
2. **Always use `can_cancel` flag** - Don't calculate it on frontend
3. **Handle null status fields** - CANCELLED bookings may have null status
4. **Use `status_message`** - It's user-friendly and context-aware
5. **Refresh after actions** - After payment/cancel, refresh booking details
6. **Show loading states** - During API calls
7. **Handle errors gracefully** - Show meaningful error messages
8. **Disable buttons during actions** - Prevent double-clicks

---

## Support

For questions or issues, refer to:
- [Booking Flow and Audit Trail](./BOOKING_FLOW_AND_AUDIT_TRAIL.md)
- [Booking Payment Notification Flow](./BOOKING_PAYMENT_NOTIFICATION_FLOW.md)
- API Swagger Documentation: `/api-docs`
