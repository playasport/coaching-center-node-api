# Academy Booking Routes - Complete Integration Guide

This guide provides comprehensive documentation for all academy-side booking management routes, including viewing bookings, approving/rejecting requests, and exporting data.

## Table of Contents

1. [Overview](#overview)
2. [Base URLs & Authentication](#base-urls--authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Status Management](#status-management)
6. [Approve/Reject Flow](#approvereject-flow)
7. [Export Functionality](#export-functionality)
8. [Error Handling](#error-handling)
9. [Complete Code Examples](#complete-code-examples)
10. [Best Practices](#best-practices)

---

## Overview

Academy booking routes allow academy owners to:
- ✅ **View all bookings** for their coaching centers
- ✅ **Filter bookings** by center, batch, status, and payment status
- ✅ **View booking details** by ID
- ✅ **Approve booking requests** from users
- ✅ **Reject booking requests** with reasons
- ✅ **Export bookings** to Excel, CSV, or PDF format

### Key Features

- **Multi-Center Support**: Academy owners can manage bookings across all their coaching centers
- **Status-Based Filtering**: Filter by booking status and payment status
- **Action Flags**: Use `can_accept_reject` flag to determine when to show approve/reject buttons
- **Status Messages**: Context-aware messages for better UX
- **Export Options**: Multiple export formats with comprehensive filtering

---

## Base URLs & Authentication

### Base URLs

```
Development: http://localhost:3000/api/v1
Production: https://api.playasport.in/api/v1
```

### Authentication

All academy booking endpoints require:
- **JWT Token** in Authorization header
- **ACADEMY Role** authorization

```javascript
headers: {
  'Authorization': `Bearer ${academyToken}`
}
```

---

## API Endpoints

### 1. Get Academy Bookings (List)

**Endpoint:** `GET /academy/booking`

**Description:** Retrieve a paginated list of bookings for all coaching centers owned by the authenticated academy user.

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (starts from 1) | `1` |
| `limit` | integer | No | Records per page (max: 100) | `10` |
| `centerId` | string | No | Filter by coaching center ID | `center-uuid` |
| `batchId` | string | No | Filter by batch ID | `batch-uuid` |
| `status` | string | No | Filter by booking status | `slot_booked` |
| `paymentStatus` | string | No | Filter by payment status | `not_initiated` |

**Status Values:**
- Booking Status: `slot_booked`, `approved`, `rejected`, `payment_pending`, `confirmed`, `cancelled`, `completed`, `requested`, `pending`
- Payment Status: `not_initiated`, `initiated`, `pending`, `processing`, `success`, `failed`, `refunded`, `cancelled`

**Example Request:**
```javascript
const response = await fetch(
  '/api/v1/academy/booking?page=1&limit=10&status=slot_booked&centerId=center123',
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
  "message": "Bookings retrieved successfully",
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
        "created_at": "2024-01-01T10:00:00.000Z"
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

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Booking UUID |
| `booking_id` | string | Human-readable booking ID (BK-YYYY-NNNN) |
| `user_name` | string | Full name of the user who made the booking |
| `student_name` | string | Comma-separated participant names |
| `student_count` | number | Number of participants/students |
| `batch_name` | string | Name of the batch |
| `center_name` | string | Name of the coaching center |
| `amount` | number | Booking amount (batch amount only) |
| `status` | string | Booking status |
| `status_message` | string | Context-aware status message |
| `payment_status` | string | Payment status (returns "paid" for SUCCESS) |
| `can_accept_reject` | boolean | Flag to show approve/reject buttons |
| `rejection_reason` | string\|null | Rejection reason if status is REJECTED |
| `cancellation_reason` | string\|null | Cancellation reason if status is CANCELLED |
| `created_at` | string | Booking creation timestamp |

---

### 2. Get Academy Booking by ID

**Endpoint:** `GET /academy/booking/{id}`

**Description:** Retrieve detailed information about a specific booking. The booking must belong to one of the academy's coaching centers.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (UUID) |

**Example Request:**
```javascript
const response = await fetch(`/api/v1/academy/booking/${bookingId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Response:**
```json
{
  "success": true,
  "message": "Booking retrieved successfully",
  "data": {
    "booking": {
      "id": "booking-uuid",
      "booking_id": "BK-2024-0001",
      "status": "slot_booked",
      "amount": 5000,
      "currency": "INR",
      "payment": {
        "status": "not_initiated",
        "razorpay_order_id": null
      },
      "user": {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "mobile": "+919876543210"
      },
      "participants": [
        {
          "id": "participant-uuid",
          "firstName": "Alice",
          "lastName": "Smith",
          "age": 12
        }
      ],
      "batch": {
        "id": "batch-uuid",
        "name": "Morning Cricket Batch"
      },
      "center": {
        "id": "center-uuid",
        "center_name": "Elite Sports Academy"
      },
      "sport": {
        "id": "sport-uuid",
        "name": "Cricket"
      },
      "rejection_reason": null,
      "cancellation_reason": null,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

---

### 3. Approve Booking Request

**Endpoint:** `POST /academy/booking/{id}/approve`

**Description:** Approve a booking request. The booking must be in `SLOT_BOOKED` status. After approval, the user will be able to proceed with payment.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (UUID) |

**Request Body:** None (empty body)

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
      "id": "batch-uuid",
      "name": "Morning Cricket Batch"
    },
    "center": {
      "id": "center-uuid",
      "center_name": "Elite Sports Academy"
    },
    "sport": {
      "id": "sport-uuid",
      "name": "Cricket"
    },
    "updatedAt": "2024-01-01T11:00:00.000Z"
  }
}
```

**Status Transition:**
- `SLOT_BOOKED` → `APPROVED`
- Payment status remains `NOT_INITIATED`

**What Happens:**
1. ✅ Booking status changes to `APPROVED`
2. ✅ User receives notifications (Email, SMS, WhatsApp, Push)
3. ✅ Admin receives email notification
4. ✅ User can now create payment order
5. ✅ Audit trail entry created

**UI Actions:**
- Show success message
- Update booking status in UI
- Hide "Approve" and "Reject" buttons
- Refresh booking list

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Booking request not found or already processed | Booking is not in SLOT_BOOKED status |
| 404 | Booking not found | Booking doesn't exist or doesn't belong to academy |

---

### 4. Reject Booking Request

**Endpoint:** `POST /academy/booking/{id}/reject`

**Description:** Reject a booking request with a reason. The booking must be in `SLOT_BOOKED` status. Slots will be released automatically.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (UUID) |

**Request Body:**

```json
{
  "reason": "Batch is full"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|------------|-------------|
| `reason` | string | Yes | Min: 1, Max: 1000 | Rejection reason |

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
      "id": "batch-uuid",
      "name": "Morning Cricket Batch"
    },
    "center": {
      "id": "center-uuid",
      "center_name": "Elite Sports Academy"
    },
    "sport": {
      "id": "sport-uuid",
      "name": "Cricket"
    },
    "updatedAt": "2024-01-01T11:00:00.000Z"
  }
}
```

**Status Transition:**
- `SLOT_BOOKED` → `REJECTED`
- Slots are released automatically
- Payment status remains `NOT_INITIATED`

**What Happens:**
1. ✅ Booking status changes to `REJECTED`
2. ✅ Rejection reason is stored
3. ✅ Slots are released (available for other bookings)
4. ✅ User receives notifications (Email, SMS, WhatsApp, Push) with rejection reason
5. ✅ Admin receives email notification
6. ✅ Audit trail entry created

**UI Actions:**
- Show success message
- Update booking status in UI
- Display rejection reason
- Hide "Approve" and "Reject" buttons
- Refresh booking list

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Validation error | Missing or invalid rejection reason |
| 400 | Booking request not found or already processed | Booking is not in SLOT_BOOKED status |
| 404 | Booking not found | Booking doesn't exist or doesn't belong to academy |

---

### 5. Export Academy Bookings

**Endpoint:** `GET /academy/booking/export`

**Description:** Export bookings to Excel, CSV, or PDF format with comprehensive filtering options.

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `format` | string | **Yes** | Export format | `excel`, `csv`, or `pdf` |
| `startDate` | string | No | Start date (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | End date (YYYY-MM-DD) | `2024-12-31` |
| `type` | string | No | Booking type filter | `all`, `confirmed`, `pending`, `cancelled`, `rejected` |
| `centerId` | string | No | Filter by center ID | `center-uuid` |
| `batchId` | string | No | Filter by batch ID | `batch-uuid` |
| `status` | string | No | Filter by booking status | `slot_booked` |
| `paymentStatus` | string | No | Filter by payment status | `success` |

**Type Filter Values:**

| Value | Description |
|-------|-------------|
| `all` | All bookings (default) |
| `confirmed` | Bookings with `CONFIRMED` status and `SUCCESS` payment |
| `pending` | Bookings with `SLOT_BOOKED`, `APPROVED`, `REQUESTED`, or `PAYMENT_PENDING` status |
| `cancelled` | Bookings with `CANCELLED` status |
| `rejected` | Bookings with `REJECTED` status |

**Example Request:**
```javascript
const params = new URLSearchParams({
  format: 'excel',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  type: 'all',
  centerId: 'center-uuid'
});

const response = await fetch(
  `/api/v1/academy/booking/export?${params.toString()}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

**Response:** Binary file (Excel, CSV, or PDF)

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

**File Formats:**

| Format | Extension | Content Type | Use Case |
|--------|-----------|--------------|----------|
| Excel | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Data analysis, editing |
| CSV | `.csv` | `text/csv` | Import into other systems |
| PDF | `.pdf` | `application/pdf` | Printing, sharing |

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Invalid format | Format must be `excel`, `csv`, or `pdf` |
| 400 | Invalid date format | Dates must be in YYYY-MM-DD format |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User doesn't have ACADEMY role |

---

## Request/Response Examples

### Example 1: Get Pending Bookings

```javascript
// Get all bookings waiting for approval
const getPendingBookings = async (token) => {
  const response = await fetch(
    '/api/v1/academy/booking?status=slot_booked&page=1&limit=20',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data;
};
```

### Example 2: Get Bookings by Center

```javascript
// Get bookings for a specific center
const getCenterBookings = async (centerId, token) => {
  const response = await fetch(
    `/api/v1/academy/booking?centerId=${centerId}&page=1&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data;
};
```

### Example 3: Get Confirmed Bookings with Payment

```javascript
// Get confirmed bookings with successful payment
const getConfirmedBookings = async (token) => {
  const response = await fetch(
    '/api/v1/academy/booking?status=confirmed&paymentStatus=success',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data;
};
```

---

## Status Management

### Booking Status Flow

```
SLOT_BOOKED ──→ APPROVED ──→ CONFIRMED
     │              │
     │              └──→ (User pays)
     │
     └──→ REJECTED (Academy rejects)
```

### Status Descriptions

| Status | Description | Academy Action | User Action |
|--------|-------------|----------------|-------------|
| `SLOT_BOOKED` | User booked slot, waiting for approval | Approve/Reject | Wait |
| `APPROVED` | Academy approved, waiting for payment | Wait | Pay Now |
| `CONFIRMED` | Payment successful, booking confirmed | View | View |
| `REJECTED` | Academy rejected the booking | View | View Reason |
| `CANCELLED` | Booking cancelled | View | View |
| `COMPLETED` | Batch completed | View | View |

### Status Message Examples

| Status | Payment Status | Status Message |
|--------|----------------|----------------|
| `SLOT_BOOKED` | `NOT_INITIATED` | "Booking request received. Please review and approve or reject." |
| `APPROVED` | `NOT_INITIATED` | "Booking approved. Waiting for customer payment." |
| `APPROVED` | `INITIATED` | "Payment initiated by customer. Waiting for payment completion." |
| `CONFIRMED` | `SUCCESS` | "Booking confirmed! Payment received successfully." |
| `REJECTED` | `NOT_INITIATED` | "Booking request has been rejected." |
| `CANCELLED` | `CANCELLED` | "Booking has been cancelled." |

---

## Approve/Reject Flow

### Complete Flow Diagram

```
1. User books slot
   ↓
2. Booking created with SLOT_BOOKED status
   ↓
3. Academy views booking list
   GET /academy/booking?status=slot_booked
   ↓
4a. Academy Approves
    POST /academy/booking/{id}/approve
    Status: SLOT_BOOKED → APPROVED
    ↓
    User receives notifications
    User can now pay
    ↓
4b. Academy Rejects
    POST /academy/booking/{id}/reject
    Status: SLOT_BOOKED → REJECTED
    ↓
    Slots released
    User receives notifications with reason
```

### When to Show Approve/Reject Buttons

```javascript
const showApproveRejectButtons = (booking) => {
  return booking.can_accept_reject === true && 
         booking.status === 'slot_booked';
};
```

**Show when:**
- `can_accept_reject === true`
- Status is `SLOT_BOOKED` or `REQUESTED`

**Hide when:**
- `can_accept_reject === false`
- Status is `APPROVED`, `CONFIRMED`, `REJECTED`, `CANCELLED`, or `COMPLETED`

---

## Export Functionality

### React/TypeScript Example

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

### Usage Example

```typescript
// Export all confirmed bookings for January 2024
await exportBookings({
  format: 'excel',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  type: 'confirmed'
}, token);

// Export pending bookings for a specific center
await exportBookings({
  format: 'pdf',
  type: 'pending',
  centerId: 'center-uuid'
}, token);
```

---

## Error Handling

### Common Error Scenarios

#### 1. Booking Not Found (404)

```javascript
if (error.status === 404) {
  showError('Booking not found');
  // Navigate back to bookings list
  navigate('/academy/bookings');
}
```

#### 2. Invalid Booking Status (400)

```javascript
if (error.message.includes('not in SLOT_BOOKED status')) {
  showError('This booking cannot be approved/rejected. It may have already been processed.');
  // Refresh booking details
  refreshBookingDetails();
}
```

#### 3. Missing Rejection Reason (400)

```javascript
if (error.message.includes('reason')) {
  showError('Rejection reason is required');
  // Focus on reason input field
  reasonInput.focus();
}
```

#### 4. Export Error (400/500)

```javascript
if (error.response?.status === 400) {
  showError('Invalid export parameters. Please check your filters.');
} else if (error.response?.status === 500) {
  showError('Export failed. Please try again later.');
}
```

#### 5. Unauthorized (401)

```javascript
if (error.status === 401) {
  showError('Session expired. Please login again.');
  // Redirect to login
  navigate('/login');
}
```

#### 6. Forbidden (403)

```javascript
if (error.status === 403) {
  showError('You do not have permission to access this resource.');
}
```

---

## Complete Code Examples

### React Component: Booking List with Approve/Reject

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Booking {
  id: string;
  booking_id: string;
  user_name: string;
  student_name: string;
  student_count: number;
  batch_name: string;
  center_name: string;
  amount: number;
  status: string;
  status_message: string;
  payment_status: string;
  can_accept_reject: boolean;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
}

const AcademyBookingList: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'slot_booked',
    page: 1,
    limit: 10
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status && { status: filters.status })
      });

      const response = await axios.get(
        `/api/v1/academy/booking?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setBookings(response.data.data.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      showError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const approveBooking = async (bookingId: string) => {
    try {
      const response = await axios.post(
        `/api/v1/academy/booking/${bookingId}/approve`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      showSuccess('Booking approved successfully');
      fetchBookings(); // Refresh list
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to approve booking');
    }
  };

  const rejectBooking = async (bookingId: string, reason: string) => {
    if (!reason.trim()) {
      showError('Please provide a rejection reason');
      return;
    }

    try {
      const response = await axios.post(
        `/api/v1/academy/booking/${bookingId}/reject`,
        { reason },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      showSuccess('Booking rejected successfully');
      fetchBookings(); // Refresh list
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to reject booking');
    }
  };

  return (
    <div className="booking-list">
      <h1>Academy Bookings</h1>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="slot_booked">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bookings">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <h3>{booking.booking_id}</h3>
              <p><strong>User:</strong> {booking.user_name}</p>
              <p><strong>Students:</strong> {booking.student_name} ({booking.student_count})</p>
              <p><strong>Batch:</strong> {booking.batch_name}</p>
              <p><strong>Center:</strong> {booking.center_name}</p>
              <p><strong>Amount:</strong> ₹{booking.amount}</p>
              <p><strong>Status:</strong> {booking.status}</p>
              <p>{booking.status_message}</p>

              {/* Approve/Reject Buttons */}
              {booking.can_accept_reject && booking.status === 'slot_booked' && (
                <div className="actions">
                  <button onClick={() => approveBooking(booking.id)}>
                    Approve
                  </button>
                  <RejectButton
                    bookingId={booking.id}
                    onReject={rejectBooking}
                  />
                </div>
              )}

              {/* Rejection Reason */}
              {booking.status === 'rejected' && booking.rejection_reason && (
                <div className="rejection-reason">
                  <strong>Rejection Reason:</strong> {booking.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Reject Button Component with Modal
const RejectButton: React.FC<{
  bookingId: string;
  onReject: (id: string, reason: string) => void;
}> = ({ bookingId, onReject }) => {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  const handleReject = () => {
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    onReject(bookingId, reason);
    setShowModal(false);
    setReason('');
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>Reject</button>
      
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Reject Booking</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter rejection reason (required)"
              rows={4}
            />
            <div className="modal-actions">
              <button onClick={handleReject}>Confirm Reject</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AcademyBookingList;
```

### React Component: Export Bookings

```typescript
import React, { useState } from 'react';
import axios from 'axios';

const ExportBookings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    format: 'excel' as 'excel' | 'csv' | 'pdf',
    startDate: '',
    endDate: '',
    type: 'all' as 'all' | 'confirmed' | 'pending' | 'cancelled' | 'rejected',
    centerId: '',
    batchId: ''
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('format', filters.format);
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.centerId) params.append('centerId', filters.centerId);
      if (filters.batchId) params.append('batchId', filters.batchId);

      const response = await axios.get(
        `/api/v1/academy/booking/export?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );

      // Download file
      const extension = filters.format === 'excel' ? 'xlsx' : 
                       filters.format === 'csv' ? 'csv' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `academy-bookings-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess('Export completed successfully');
    } catch (error) {
      showError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-bookings">
      <h2>Export Bookings</h2>
      
      <div className="export-filters">
        <div>
          <label>Format:</label>
          <select
            value={filters.format}
            onChange={(e) => setFilters({ ...filters, format: e.target.value as any })}
          >
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        <div>
          <label>Start Date:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>

        <div>
          <label>End Date:</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>

        <div>
          <label>Type:</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
          >
            <option value="all">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting...' : 'Export Bookings'}
      </button>
    </div>
  );
};

export default ExportBookings;
```

---

## Best Practices

### 1. Always Use API Flags

```javascript
// ✅ Good: Use can_accept_reject flag from API
if (booking.can_accept_reject) {
  showApproveRejectButtons();
}

// ❌ Bad: Don't calculate on frontend
if (booking.status === 'slot_booked') {
  showApproveRejectButtons();
}
```

### 2. Validate Rejection Reason

```javascript
// ✅ Good: Validate before sending
const rejectBooking = async (bookingId, reason) => {
  if (!reason || reason.trim().length === 0) {
    showError('Rejection reason is required');
    return;
  }
  
  if (reason.length > 1000) {
    showError('Rejection reason must be less than 1000 characters');
    return;
  }
  
  // Proceed with rejection
};
```

### 3. Refresh After Actions

```javascript
// ✅ Good: Refresh list after approve/reject
const approveBooking = async (bookingId) => {
  await api.post(`/academy/booking/${bookingId}/approve`);
  fetchBookings(); // Refresh list
};
```

### 4. Handle Loading States

```javascript
// ✅ Good: Show loading during API calls
const [loading, setLoading] = useState(false);

const approveBooking = async (bookingId) => {
  setLoading(true);
  try {
    await api.post(`/academy/booking/${bookingId}/approve`);
  } finally {
    setLoading(false);
  }
};
```

### 5. Use Status Messages

```javascript
// ✅ Good: Use status_message from API
<p>{booking.status_message}</p>

// ❌ Bad: Don't create custom messages
<p>Status: {booking.status}</p>
```

### 6. Error Handling

```javascript
// ✅ Good: Handle all error cases
try {
  await approveBooking(bookingId);
} catch (error) {
  if (error.status === 404) {
    showError('Booking not found');
  } else if (error.status === 400) {
    showError(error.message || 'Invalid request');
  } else {
    showError('An error occurred. Please try again.');
  }
}
```

### 7. Export File Handling

```javascript
// ✅ Good: Properly handle blob response
const response = await axios.get('/academy/booking/export', {
  responseType: 'blob' // Important!
});

const url = window.URL.createObjectURL(new Blob([response.data]));
// ... download logic
window.URL.revokeObjectURL(url); // Clean up
```

---

## Quick Reference

### Endpoint Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/academy/booking` | Get bookings list | ✅ ACADEMY |
| GET | `/academy/booking/{id}` | Get booking details | ✅ ACADEMY |
| POST | `/academy/booking/{id}/approve` | Approve booking | ✅ ACADEMY |
| POST | `/academy/booking/{id}/reject` | Reject booking | ✅ ACADEMY |
| GET | `/academy/booking/export` | Export bookings | ✅ ACADEMY |

### Status → Action Mapping

| Status | can_accept_reject | Show Approve? | Show Reject? |
|--------|-------------------|---------------|--------------|
| `SLOT_BOOKED` | `true` | ✅ | ✅ |
| `APPROVED` | `false` | ❌ | ❌ |
| `CONFIRMED` | `false` | ❌ | ❌ |
| `REJECTED` | `false` | ❌ | ❌ |
| `CANCELLED` | `false` | ❌ | ❌ |

---

## Support

For questions or issues, refer to:
- [Complete Booking Flow Guide](./FRONTEND_BOOKING_COMPLETE_GUIDE.md)
- [Booking Flow and Audit Trail](./BOOKING_FLOW_AND_AUDIT_TRAIL.md)
- API Swagger Documentation: `/api-docs`

---

## Changelog

- **2024-01-15**: Added export functionality documentation
- **2024-01-15**: Added rejection_reason and cancellation_reason to responses
- **2024-01-15**: Added student_count to booking list
- **2024-01-15**: Added status_message for better UX
- **2024-01-15**: Added can_accept_reject flag for action buttons
