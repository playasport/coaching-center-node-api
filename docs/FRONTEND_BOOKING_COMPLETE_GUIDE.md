# Complete Booking Flow - Frontend Integration Guide

This comprehensive guide covers the complete booking flow from both **User** and **Academy** perspectives, including all API endpoints, status transitions, and UI/UX recommendations.

## Table of Contents

1. [Overview](#overview)
2. [Base URLs & Authentication](#base-urls--authentication)
3. [Complete Booking Flow Diagram](#complete-booking-flow-diagram)
4. [User-Side APIs](#user-side-apis)
5. [Academy-Side APIs](#academy-side-apis)
6. [Status Transitions](#status-transitions)
7. [Button Visibility Logic](#button-visibility-logic)
8. [Export Functionality](#export-functionality)
9. [Error Handling](#error-handling)
10. [Complete Code Examples](#complete-code-examples)

---

## Overview

The booking system follows an **academy-approval-first** model:

1. **User books slot** → Slots are occupied, booking request created
2. **Academy reviews** → Academy approves or rejects the booking
3. **User pays** (if approved) → Payment gateway integration
4. **Booking confirmed** → After successful payment verification

### Key Features

- ✅ **Academy Approval Required**: All bookings require academy approval before payment
- ✅ **Slot Reservation**: Slots are occupied immediately when user books
- ✅ **Multi-channel Notifications**: Email, SMS, WhatsApp, Push notifications
- ✅ **Audit Trail**: Complete tracking of all booking actions
- ✅ **Cancellation Support**: Users and academies can cancel with reasons
- ✅ **Export Functionality**: Academy can export bookings in Excel, CSV, or PDF

---

## Base URLs & Authentication

### Base URLs

```
Development: http://localhost:3000/api/v1
Production: https://api.playasport.in/api/v1
```

### Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**User endpoints** require `USER` role authentication.  
**Academy endpoints** require `ACADEMY` role authentication.

---

## Complete Booking Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER-SIDE FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. View Booking Summary
   GET /user/booking/summary?batchId=xxx&participantIds=id1,id2
   ↓
2. Book Slot
   POST /user/booking/book-slot
   Status: SLOT_BOOKED
   Payment: NOT_INITIATED
   ↓
3. Wait for Academy Approval
   [User sees: "Waiting for academy approval"]
   ↓
   ┌─────────────────────────────────────────────────────────┐
   │              ACADEMY-SIDE FLOW                          │
   └─────────────────────────────────────────────────────────┘
   
   4. Academy Views Booking List
      GET /academy/booking?status=slot_booked
      ↓
   5a. Academy Approves
       POST /academy/booking/{id}/approve
       Status: SLOT_BOOKED → APPROVED
       ↓
   5b. Academy Rejects
       POST /academy/booking/{id}/reject
       Status: SLOT_BOOKED → REJECTED
       [Slots released, user notified]
       ↓
   ┌─────────────────────────────────────────────────────────┐
   │              BACK TO USER-SIDE                          │
   └─────────────────────────────────────────────────────────┘
   
   6. User Sees Updated Status
      GET /user/booking/{id}
      Status: APPROVED (or REJECTED)
      ↓
   7. Create Payment Order (if APPROVED)
      POST /user/booking/{id}/create-payment-order
      Payment: NOT_INITIATED → INITIATED
      ↓
   8. Make Payment via Razorpay
      [Razorpay checkout modal]
      ↓
   9. Verify Payment
      POST /user/booking/verify-payment
      Status: APPROVED → CONFIRMED
      Payment: INITIATED → SUCCESS
      ↓
   10. Booking Confirmed ✅
       [User receives confirmation, invoice sent via email]
```

---

## User-Side APIs

### 1. Get Booking Summary

**Endpoint:** `GET /user/booking/summary`

**Query Parameters:**
- `batchId` (required): Batch ID
- `participantIds` (required): Comma-separated participant IDs

**When to Call:**
- Before showing booking details to user
- When user selects participants
- When user wants to see pricing breakdown

**Example Request:**
```javascript
const response = await fetch(
  '/api/v1/user/booking/summary?batchId=batch123&participantIds=part1,part2',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch123",
      "name": "Morning Cricket Batch",
      "scheduled": {
        "start_date": "2024-01-01",
        "end_date": "2024-03-31",
        "training_days": ["monday", "wednesday", "friday"]
      }
    },
    "participants": [
      {
        "id": "part1",
        "firstName": "John",
        "lastName": "Doe",
        "age": 12
      }
    ],
    "amount": 5000,
    "currency": "INR",
    "subtotal": 4500,
    "platform_fee": 200,
    "gst": 36,
    "total": 4736
  }
}
```

**UI Action:** Show "Book Slot" button

---

### 2. Book Slot

**Endpoint:** `POST /user/booking/book-slot`

**Request Body:**
```json
{
  "batchId": "batch123",
  "participantIds": ["part1", "part2"],
  "notes": "Optional notes"
}
```

**When to Call:**
- When user clicks "Book Slot" button
- After user confirms booking details

**Example Request:**
```javascript
const response = await fetch('/api/v1/user/booking/book-slot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batchId: 'batch123',
    participantIds: ['part1', 'part2'],
    notes: 'Optional notes'
  })
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "booking_id": "BK-2024-0001",
    "status": "slot_booked",
    "amount": 5000,
    "payment": {
      "status": "not_initiated"
    }
  }
}
```

**UI Actions:**
- Hide "Book Slot" button
- Show "Waiting for Academy Approval" message
- Show "Cancel Booking" button (if `can_cancel: true`)

---

### 3. Get User Bookings (List)

**Endpoint:** `GET /user/booking`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10, max: 100)
- `status` (optional): Filter by booking status
- `paymentStatus` (optional): Filter by payment status

**Example Request:**
```javascript
const response = await fetch(
  '/api/v1/user/booking?page=1&limit=10&status=approved',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "booking-uuid",
        "booking_id": "BK-2024-0001",
        "status": "approved",
        "payment_status": "not_initiated",
        "payment_enabled": true,
        "can_cancel": true,
        "status_message": "Your booking has been approved. Please proceed with payment.",
        "amount": 5000,
        "batch": {
          "id": "batch123",
          "name": "Morning Cricket Batch"
        },
        "participants": [
          {
            "id": "part1",
            "firstName": "John",
            "lastName": "Doe",
            "age": 12,
            "profilePhoto": "https://..."
          }
        ],
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**UI Actions:**
- Use `payment_enabled` flag to show/hide payment button
- Use `can_cancel` flag to show/hide cancel button
- Use `status_message` for user-friendly display

---

### 4. Get Booking Details

**Endpoint:** `GET /user/booking/{bookingId}`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/user/booking/${bookingId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "booking_id": "BK-2024-0001",
    "status": "approved",
    "payment": {
      "status": "not_initiated",
      "razorpay_order_id": null
    },
    "payment_enabled": true,
    "can_cancel": true,
    "can_download_invoice": false,
    "status_message": "Your booking has been approved. Please proceed with payment.",
    "rejection_reason": null,
    "cancellation_reason": null,
    "amount": 5000,
    "batch": { /* full batch details */ },
    "participants": [ /* full participant details */ },
    "center": {
      "id": "center123",
      "center_name": "Elite Sports Academy",
      "address": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "lat": 19.0760,
        "long": 72.8777
      }
    },
    "sport": {
      "id": "sport123",
      "name": "Cricket"
    },
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

**UI Actions:**
- Show payment button if `payment_enabled: true`
- Show cancel button if `can_cancel: true`
- Show download invoice button if `can_download_invoice: true`
- Display `status_message` prominently

---

### 5. Create Payment Order

**Endpoint:** `POST /user/booking/{bookingId}/create-payment-order`

**When to Call:**
- When user clicks "Pay Now" button
- Only when `payment_enabled === true`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/user/booking/${bookingId}/create-payment-order`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking-uuid",
      "booking_id": "BK-2024-0001",
      "status": "approved",
      "payment": {
        "razorpay_order_id": "order_xyz123",
        "status": "initiated"
      }
    },
    "razorpayOrder": {
      "id": "order_xyz123",
      "amount": 473600,
      "currency": "INR",
      "receipt": "receipt_123"
    }
  }
}
```

**UI Actions:**
- Initialize Razorpay checkout with `razorpayOrder`
- Open Razorpay payment modal
- Handle payment success/failure callbacks

---

### 6. Verify Payment

**Endpoint:** `POST /user/booking/verify-payment`

**Request Body:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_here"
}
```

**When to Call:**
- After Razorpay payment success
- On payment callback

**Example Request:**
```javascript
const response = await fetch('/api/v1/user/booking/verify-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    razorpay_order_id: 'order_xyz123',
    razorpay_payment_id: 'pay_abc456',
    razorpay_signature: 'signature_here'
  })
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "booking_id": "BK-2024-0001",
    "status": "confirmed",
    "payment": {
      "razorpay_order_id": "order_xyz123",
      "razorpay_payment_id": "pay_abc456",
      "status": "paid",
      "payment_method": "card",
      "paid_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

**UI Actions:**
- Show success message
- Update booking status in UI
- Hide payment button
- Show booking confirmation
- Enable invoice download (`can_download_invoice: true`)

---

### 7. Cancel Booking

**Endpoint:** `POST /user/booking/{bookingId}/cancel`

**Request Body:**
```json
{
  "reason": "Change of plans"
}
```

**When to Call:**
- When user clicks "Cancel Booking" button
- Only when `can_cancel === true`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/user/booking/${bookingId}/cancel`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    reason: 'Change of plans'
  })
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "booking_id": "BK-2024-0001",
    "status": "cancelled",
    "cancellation_reason": "Change of plans",
    "payment": {
      "status": "cancelled"
    }
  }
}
```

**UI Actions:**
- Show cancellation confirmation
- Update booking status
- Hide payment and cancel buttons

---

### 8. Download Invoice

**Endpoint:** `GET /user/booking/{bookingId}/invoice`

**When to Call:**
- When user clicks "Download Invoice" button
- Only when `can_download_invoice === true`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/user/booking/${bookingId}/invoice`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Handle PDF download
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `invoice-${bookingId}.pdf`;
a.click();
```

**Response:** PDF file (binary)

---

## Academy-Side APIs

### 1. Get Academy Bookings (List)

**Endpoint:** `GET /academy/booking`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10, max: 100)
- `centerId` (optional): Filter by coaching center ID
- `batchId` (optional): Filter by batch ID
- `status` (optional): Filter by booking status
- `paymentStatus` (optional): Filter by payment status

**Example Request:**
```javascript
const response = await fetch(
  '/api/v1/academy/booking?page=1&limit=10&status=slot_booked',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "booking-uuid",
        "booking_id": "BK-2024-0001",
        "user_name": "John Doe",
        "student_name": "Alice Smith, Bob Smith",
        "student_count": 2,
        "batch_name": "Morning Cricket Batch",
        "center_name": "Elite Sports Academy",
        "amount": 5000,
        "status": "slot_booked",
        "status_message": "Booking request received. Please review and approve or reject.",
        "payment_status": "not_initiated",
        "can_accept_reject": true,
        "rejection_reason": null,
        "cancellation_reason": null,
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**UI Actions:**
- Show "Approve" and "Reject" buttons if `can_accept_reject: true`
- Display `status_message` for context
- Show `rejection_reason` if status is `REJECTED`
- Show `cancellation_reason` if status is `CANCELLED`

---

### 2. Get Academy Booking by ID

**Endpoint:** `GET /academy/booking/{id}`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/academy/booking/${bookingId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:** Similar to user booking details, but with academy-specific fields

---

### 3. Approve Booking Request

**Endpoint:** `POST /academy/booking/{id}/approve`

**When to Call:**
- When academy clicks "Approve" button
- Only when `can_accept_reject === true` and status is `SLOT_BOOKED`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/academy/booking/${bookingId}/approve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "success": true,
  "message": "Booking request approved successfully",
  "data": {
    "id": "booking-uuid",
    "booking_id": "BK-2024-0001",
    "status": "approved",
    "amount": 5000,
    "currency": "INR",
    "payment": {
      "status": "not_initiated"
    },
    "batch": {
      "id": "batch123",
      "name": "Morning Cricket Batch"
    },
    "center": {
      "id": "center123",
      "center_name": "Elite Sports Academy"
    },
    "sport": {
      "id": "sport123",
      "name": "Cricket"
    },
    "updatedAt": "2024-01-01T11:00:00Z"
  }
}
```

**Status Transition:**
- `SLOT_BOOKED` → `APPROVED`
- Payment status remains `NOT_INITIATED`

**UI Actions:**
- Show success message
- Update booking status in UI
- Hide "Approve" and "Reject" buttons
- User will now see payment option

**Notifications Sent:**
- ✅ User: Email, SMS, WhatsApp, Push notification
- ✅ Admin: Email notification

---

### 4. Reject Booking Request

**Endpoint:** `POST /academy/booking/{id}/reject`

**Request Body:**
```json
{
  "reason": "Batch is full"
}
```

**When to Call:**
- When academy clicks "Reject" button
- Only when `can_accept_reject === true` and status is `SLOT_BOOKED`

**Example Request:**
```javascript
const response = await fetch(`/api/v1/academy/booking/${bookingId}/reject`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    reason: 'Batch is full'
  })
});
```

**Response:**
```json
{
  "success": true,
  "message": "Booking request rejected successfully",
  "data": {
    "id": "booking-uuid",
    "booking_id": "BK-2024-0001",
    "status": "rejected",
    "rejection_reason": "Batch is full",
    "amount": 5000,
    "currency": "INR",
    "payment": {
      "status": "not_initiated"
    },
    "batch": {
      "id": "batch123",
      "name": "Morning Cricket Batch"
    },
    "center": {
      "id": "center123",
      "center_name": "Elite Sports Academy"
    },
    "sport": {
      "id": "sport123",
      "name": "Cricket"
    },
    "updatedAt": "2024-01-01T11:00:00Z"
  }
}
```

**Status Transition:**
- `SLOT_BOOKED` → `REJECTED`
- Slots are released automatically
- Payment status remains `NOT_INITIATED`

**UI Actions:**
- Show success message
- Update booking status in UI
- Display rejection reason
- Hide "Approve" and "Reject" buttons
- User will see rejection message

**Notifications Sent:**
- ✅ User: Email, SMS, WhatsApp, Push notification (with rejection reason)
- ✅ Admin: Email notification

---

### 5. Export Academy Bookings

**Endpoint:** `GET /academy/booking/export`

**Query Parameters:**
- `format` (required): `excel`, `csv`, or `pdf`
- `startDate` (optional): Start date (YYYY-MM-DD format)
- `endDate` (optional): End date (YYYY-MM-DD format)
- `type` (optional): `all`, `confirmed`, `pending`, `cancelled`, `rejected`
- `centerId` (optional): Filter by center ID
- `batchId` (optional): Filter by batch ID
- `status` (optional): Filter by booking status
- `paymentStatus` (optional): Filter by payment status

**Example Request:**
```javascript
const exportBookings = async (filters) => {
  const params = new URLSearchParams({
    format: 'excel',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    type: 'all',
    ...filters
  });

  const response = await fetch(
    `/api/v1/academy/booking/export?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  // Handle file download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `academy-bookings-${Date.now()}.xlsx`;
  a.click();
};
```

**Export Formats:**
- **Excel** (`.xlsx`): Best for data analysis
- **CSV** (`.csv`): Best for importing into other systems
- **PDF** (`.pdf`): Best for printing and sharing

**Export Includes:**
- Booking ID
- User Name
- Student Names
- Student Count
- Batch Name
- Center Name
- Amount
- Status
- Payment Status
- Rejection Reason (if applicable)
- Cancellation Reason (if applicable)
- Created Date

**Type Filters:**
- `all`: All bookings (default)
- `confirmed`: Bookings with `CONFIRMED` status and `SUCCESS` payment
- `pending`: Bookings with `SLOT_BOOKED`, `APPROVED`, `REQUESTED`, or `PAYMENT_PENDING` status
- `cancelled`: Bookings with `CANCELLED` status
- `rejected`: Bookings with `REJECTED` status

---

## Status Transitions

### Booking Status Flow

```
SLOT_BOOKED ──→ APPROVED ──→ CONFIRMED
     │              │
     │              └──→ (User pays)
     │
     ├──→ REJECTED (Academy rejects)
     │
     └──→ CANCELLED (User cancels)
```

### Payment Status Flow

```
NOT_INITIATED ──→ INITIATED ──→ PENDING ──→ PROCESSING ──→ SUCCESS
                      │                          │
                      │                          └──→ FAILED
                      │
                      └──→ CANCELLED
```

### Status Descriptions

| Booking Status | Description | Payment Status | User Action | Academy Action |
|----------------|------------|----------------|-------------|----------------|
| `SLOT_BOOKED` | User booked slot, waiting for approval | `NOT_INITIATED` | Wait | Approve/Reject |
| `APPROVED` | Academy approved, waiting for payment | `NOT_INITIATED` | Pay Now | Wait |
| `APPROVED` | Payment initiated | `INITIATED` | Complete Payment | Wait |
| `CONFIRMED` | Payment successful | `SUCCESS` | View Booking | View Booking |
| `REJECTED` | Academy rejected | `NOT_INITIATED` | View Reason | - |
| `CANCELLED` | User/Academy cancelled | `CANCELLED` | - | - |

---

## Button Visibility Logic

### User-Side Buttons

#### Payment Button ("Pay Now" / "Proceed to Payment")

```javascript
const showPaymentButton = (booking) => {
  // Always use the flag from API response
  return booking.payment_enabled === true;
};
```

**Show when:**
- `payment_enabled === true`
- Status is `APPROVED`
- Payment status is `NOT_INITIATED` or `INITIATED`

**Hide when:**
- `payment_enabled === false`
- Status is `CONFIRMED`, `CANCELLED`, or `REJECTED`
- Payment status is `SUCCESS`

#### Cancel Button ("Cancel Booking")

```javascript
const showCancelButton = (booking) => {
  // Always use the flag from API response
  return booking.can_cancel === true;
};
```

**Show when:**
- `can_cancel === true`
- Status is `SLOT_BOOKED`, `APPROVED`, or `REJECTED`
- Payment status is NOT `SUCCESS`

**Hide when:**
- `can_cancel === false`
- Status is `CONFIRMED`, `CANCELLED`, or `COMPLETED`
- Payment status is `SUCCESS`

#### Download Invoice Button

```javascript
const showDownloadInvoice = (booking) => {
  return booking.can_download_invoice === true;
};
```

**Show when:**
- `can_download_invoice === true`
- Payment status is `SUCCESS`

---

### Academy-Side Buttons

#### Approve Button

```javascript
const showApproveButton = (booking) => {
  return booking.can_accept_reject === true && 
         booking.status === 'slot_booked';
};
```

**Show when:**
- `can_accept_reject === true`
- Status is `SLOT_BOOKED` or `REQUESTED`

#### Reject Button

```javascript
const showRejectButton = (booking) => {
  return booking.can_accept_reject === true && 
         booking.status === 'slot_booked';
};
```

**Show when:**
- `can_accept_reject === true`
- Status is `SLOT_BOOKED` or `REQUESTED`

---

## Export Functionality

### React/Next.js Example

```typescript
import axios from 'axios';

interface ExportFilters {
  format: 'excel' | 'csv' | 'pdf';
  startDate?: string;
  endDate?: string;
  type?: 'all' | 'confirmed' | 'pending' | 'cancelled' | 'rejected';
  centerId?: string;
  batchId?: string;
  status?: string;
  paymentStatus?: string;
}

const exportBookings = async (
  filters: ExportFilters,
  token: string
): Promise<void> => {
  try {
    const params = new URLSearchParams();
    params.append('format', filters.format);
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type) params.append('type', filters.type);
    if (filters.centerId) params.append('centerId', filters.centerId);
    if (filters.batchId) params.append('batchId', filters.batchId);
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);

    const response = await axios.get(
      `/api/v1/academy/booking/export?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob' // Important for file downloads
      }
    );

    // Determine file extension
    const extension = filters.format === 'excel' ? 'xlsx' : 
                     filters.format === 'csv' ? 'csv' : 'pdf';
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `academy-bookings-${Date.now()}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
```

---

## Error Handling

### Common Error Scenarios

#### 1. Booking Not Found (404)

```javascript
if (error.status === 404) {
  showError('Booking not found');
  navigate('/bookings');
}
```

#### 2. Invalid Booking Status (400)

```javascript
if (error.message.includes('not in SLOT_BOOKED status')) {
  showError('This booking cannot be approved/rejected. It may have already been processed.');
}
```

#### 3. Payment Already Verified (400)

```javascript
if (error.message.includes('already verified')) {
  showError('Payment already processed');
  refreshBookingDetails();
}
```

#### 4. Cannot Cancel (400)

```javascript
if (error.message.includes('Cannot cancel')) {
  showError('This booking cannot be cancelled. Payment may have already been completed.');
}
```

#### 5. Export Error (400/500)

```javascript
if (error.response?.status === 400) {
  showError('Invalid export parameters. Please check your filters.');
} else if (error.response?.status === 500) {
  showError('Export failed. Please try again later.');
}
```

---

## Complete Code Examples

### User-Side: Complete Booking Flow

```typescript
// React/TypeScript Example
import { useState, useEffect } from 'react';
import axios from 'axios';

const BookingFlow = ({ batchId, participantIds }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Get booking summary
  const getSummary = async () => {
    const response = await axios.get('/api/v1/user/booking/summary', {
      params: { batchId, participantIds: participantIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  };

  // Step 2: Book slot
  const bookSlot = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/v1/user/booking/book-slot', {
        batchId,
        participantIds,
        notes: 'Optional notes'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBooking(response.data.data);
      showSuccess('Booking request submitted. Waiting for academy approval.');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to book slot');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create payment order
  const createPaymentOrder = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/v1/user/booking/${booking.id}/create-payment-order`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorpayOrder } = response.data.data;
      
      // Initialize Razorpay
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: 'PlayAsport',
        description: `Booking ${response.data.data.booking.booking_id}`,
        handler: async (response) => {
          await verifyPayment(response);
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to create payment order');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify payment
  const verifyPayment = async (razorpayResponse) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/v1/user/booking/verify-payment', {
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBooking(response.data.data);
      showSuccess('Payment successful! Booking confirmed.');
    } catch (error) {
      showError(error.response?.data?.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Cancel booking
  const cancelBooking = async (reason: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/v1/user/booking/${booking.id}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBooking(response.data.data);
      showSuccess('Booking cancelled successfully.');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!booking && (
        <button onClick={bookSlot} disabled={loading}>
          Book Slot
        </button>
      )}

      {booking && (
        <>
          <p>{booking.status_message}</p>
          
          {booking.payment_enabled && (
            <button onClick={createPaymentOrder} disabled={loading}>
              Pay Now
            </button>
          )}

          {booking.can_cancel && (
            <button onClick={() => cancelBooking('User cancelled')} disabled={loading}>
              Cancel Booking
            </button>
          )}
        </>
      )}
    </div>
  );
};
```

### Academy-Side: Approve/Reject Flow

```typescript
// React/TypeScript Example
import { useState } from 'react';
import axios from 'axios';

const AcademyBookingCard = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const approveBooking = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/v1/academy/booking/${booking.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('Booking approved successfully.');
      onUpdate(response.data.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to approve booking');
    } finally {
      setLoading(false);
    }
  };

  const rejectBooking = async () => {
    if (!rejectReason.trim()) {
      showError('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/v1/academy/booking/${booking.id}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('Booking rejected successfully.');
      onUpdate(response.data.data);
      setRejectReason('');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to reject booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-card">
      <h3>{booking.booking_id}</h3>
      <p>User: {booking.user_name}</p>
      <p>Students: {booking.student_name} ({booking.student_count})</p>
      <p>Batch: {booking.batch_name}</p>
      <p>Amount: ₹{booking.amount}</p>
      <p>Status: {booking.status}</p>
      <p>{booking.status_message}</p>

      {booking.can_accept_reject && booking.status === 'slot_booked' && (
        <div>
          <button onClick={approveBooking} disabled={loading}>
            Approve
          </button>
          
          <div>
            <input
              type="text"
              placeholder="Rejection reason (required)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <button onClick={rejectBooking} disabled={loading || !rejectReason.trim()}>
              Reject
            </button>
          </div>
        </div>
      )}

      {booking.status === 'rejected' && booking.rejection_reason && (
        <p className="rejection-reason">
          Rejection Reason: {booking.rejection_reason}
        </p>
      )}
    </div>
  );
};
```

---

## Quick Reference

### Status → Button Mapping (User Side)

| Booking Status | Payment Status | payment_enabled | can_cancel | Show Payment? | Show Cancel? |
|----------------|----------------|-----------------|------------|---------------|--------------|
| `SLOT_BOOKED` | `NOT_INITIATED` | `false` | `true` | ❌ | ✅ |
| `APPROVED` | `NOT_INITIATED` | `true` | `true` | ✅ | ✅ |
| `APPROVED` | `INITIATED` | `true` | `true` | ✅ | ✅ |
| `CONFIRMED` | `SUCCESS` | `false` | `false` | ❌ | ❌ |
| `REJECTED` | `NOT_INITIATED` | `false` | `true` | ❌ | ✅ |
| `CANCELLED` | `CANCELLED` | `false` | `false` | ❌ | ❌ |

### Status → Button Mapping (Academy Side)

| Booking Status | can_accept_reject | Show Approve? | Show Reject? |
|----------------|-------------------|---------------|--------------|
| `SLOT_BOOKED` | `true` | ✅ | ✅ |
| `APPROVED` | `false` | ❌ | ❌ |
| `CONFIRMED` | `false` | ❌ | ❌ |
| `REJECTED` | `false` | ❌ | ❌ |
| `CANCELLED` | `false` | ❌ | ❌ |

---

## Best Practices

1. **Always use API flags** - Don't calculate `payment_enabled`, `can_cancel`, or `can_accept_reject` on frontend
2. **Handle null status fields** - CANCELLED bookings may have null status
3. **Use `status_message`** - It's user-friendly and context-aware
4. **Refresh after actions** - After payment/cancel/approve/reject, refresh booking details
5. **Show loading states** - During API calls
6. **Handle errors gracefully** - Show meaningful error messages
7. **Disable buttons during actions** - Prevent double-clicks
8. **Validate rejection reason** - Academy must provide reason when rejecting
9. **Poll for status updates** - Consider polling booking status if real-time updates aren't available

---

## Support

For questions or issues, refer to:
- [Booking Flow and Audit Trail](./BOOKING_FLOW_AND_AUDIT_TRAIL.md)
- [Booking Payment Notification Flow](./BOOKING_PAYMENT_NOTIFICATION_FLOW.md)
- [Frontend Booking Flow Guide](./FRONTEND_BOOKING_FLOW_GUIDE.md) (User-side focused)
- API Swagger Documentation: `/api-docs`

---

## Changelog

- **2024-01-15**: Added export functionality documentation
- **2024-01-15**: Added rejection_reason and cancellation_reason to responses
- **2024-01-15**: Added student_count to academy booking list
- **2024-01-15**: Added status_message for better UX
- **2024-01-15**: Added can_accept_reject flag for academy actions
