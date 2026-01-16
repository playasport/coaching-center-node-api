# Academy Booking API Reference

This document provides a quick reference for frontend developers working with the Academy Booking API endpoints. It includes routes, payloads, and response structures.

## Base URL

```
/api/v1/academy/booking
```

## Authentication

All endpoints require:
- **Header**: `Authorization: Bearer <access_token>`
- **Role**: `ACADEMY` role is required

---

## 1. Get Bookings List

Retrieve a paginated list of bookings for coaching centers owned by the authenticated academy user.

### Endpoint

```
GET /api/v1/academy/booking
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (starts from 1) |
| `limit` | number | No | 10 | Number of records per page (max: 100) |
| `centerId` | string | No | - | Filter by coaching center ID |
| `batchId` | string | No | - | Filter by batch ID |
| `status` | string | No | - | Filter by booking status (see status enum below) |
| `paymentStatus` | string | No | - | Filter by payment status (see payment status enum below) |

**Status Enum Values:**
- `slot_booked`
- `approved`
- `rejected`
- `payment_pending`
- `confirmed`
- `cancelled`
- `completed`
- `requested`
- `pending`

**Payment Status Enum Values:**
- `not_initiated`
- `initiated`
- `pending`
- `processing`
- `success`
- `failed`
- `refunded`
- `cancelled`

### Request Example

```javascript
// Using fetch
const response = await fetch('/api/v1/academy/booking?page=1&limit=10&status=slot_booked', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Using axios
const response = await axios.get('/api/v1/academy/booking', {
  params: {
    page: 1,
    limit: 10,
    status: 'slot_booked',
    paymentStatus: 'success'
  },
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Response Structure

```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "data": [
      {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "booking_id": "BK-2024-0001",
        "user_name": "John Doe",
        "student_name": "Alice Smith, Bob Smith",
        "student_count": 2,
        "batch_name": "Morning Batch",
        "center_name": "ABC Sports Academy",
        "amount": 5000,
        "status": "confirmed",
        "status_message": "Booking confirmed! Payment received successfully.",
        "payment_status": "paid",
        "can_accept_reject": false,
        "rejection_reason": null,
        "cancellation_reason": null,
        "created_at": "2024-01-01T00:00:00.000Z"
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

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Booking UUID |
| `booking_id` | string | Unique booking reference ID (format: BK-YYYY-NNNN) |
| `user_name` | string | Full name of the user |
| `student_name` | string | Participant name(s) - comma-separated if multiple |
| `student_count` | number | Number of participants/students in the booking |
| `batch_name` | string | Name of the batch |
| `center_name` | string | Name of the coaching center |
| `amount` | number | Booking amount (batch amount only, excludes platform fee and GST) |
| `status` | string | Booking status |
| `status_message` | string | Custom message based on booking status and payment status |
| `payment_status` | string | Payment status (returns "paid" when payment status is "success") |
| `can_accept_reject` | boolean | Flag to indicate if accept/reject actions should be shown |
| `rejection_reason` | string \| null | Rejection reason if status is REJECTED |
| `cancellation_reason` | string \| null | Cancellation reason if status is CANCELLED |
| `created_at` | string | Booking creation timestamp (ISO 8601) |

---

## 2. Get Booking by ID

Retrieve detailed booking information by booking ID.

### Endpoint

```
GET /api/v1/academy/booking/{id}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (UUID) |

### Request Example

```javascript
// Using fetch
const bookingId = 'f316a86c-2909-4d32-8983-eb225c715bcb';
const response = await fetch(`/api/v1/academy/booking/${bookingId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Using axios
const response = await axios.get(`/api/v1/academy/booking/${bookingId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Response Structure

```json
{
  "success": true,
  "message": "Booking retrieved successfully",
  "data": {
    "_id": "696a26dc6a830138ed964cb0",
    "id": "14b31f41-2ec3-4f10-b83b-6c070b3b287b",
    "booking_id": "PS-2026-0007",
    "user": {
      "_id": "693a72393c18b3e80760dbda",
      "id": "862968bb-aa80-4c18-92bc-bca25f5d71a5",
      "firstName": "Indal",
      "lastName": "Singh",
      "email": "indalkumarsingh@playasport.in",
      "mobile": "9546576177",
      "profileImage": ""
    },
    "participants": [
      {
        "_id": "6965db5f734654f0a9344e33",
        "firstName": "Indal",
        "lastName": "Singh",
        "profilePhoto": "",
        "gender": "male",
        "age": "5",
        "dob": "2019-01-12T00:00:00.000Z"
      }
    ],
    "batch": {
      "_id": "6965c9841713b07ad0f77adc",
      "name": "test 2"
    },
    "center": {
      "_id": "6954d14414b396df0d2254d4",
      "center_name": "Monthly Cricket Training",
      "mobile_number": "9546576177",
      "logo": "",
      "email": "indalkumarsingh@playasport.in",
      "id": "61db8434-b1fd-4dc6-a040-16fc99943f2f"
    },
    "sport": {
      "_id": "693a9e96b4d798f46c938643",
      "name": "Cricket",
      "logo": ""
    },
    "amount": 5500,
    "currency": "INR",
    "status": "slot_booked",
    "status_message": "Booking request received. Waiting for academy approval.",
    "payment_status": "paid",
    "can_accept_reject": false,
    "notes": null,
    "cancellation_reason": null,
    "rejection_reason": null,
    "createdAt": "2026-01-16T11:54:04.769Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | MongoDB ObjectId |
| `id` | string | Booking UUID |
| `booking_id` | string | Unique booking reference ID |
| `user` | object | User details (see user object below) |
| `participants` | array | Array of participant objects (see participant object below) |
| `batch` | object | Batch details (`_id`, `name`) |
| `center` | object | Center details (`_id`, `center_name`, `mobile_number`, `logo`, `email`, `id`) |
| `sport` | object | Sport details (`_id`, `name`, `logo`) |
| `amount` | number | Booking amount (batch amount only, excludes platform fee and GST) |
| `currency` | string | Currency code (e.g., "INR") |
| `status` | string | Booking status |
| `status_message` | string | Custom message based on booking status and payment status |
| `payment_status` | string | Payment status (returns "paid" when payment status is "success") |
| `can_accept_reject` | boolean | Flag to indicate if accept/reject actions should be shown |
| `notes` | string \| null | Optional notes |
| `cancellation_reason` | string \| null | Cancellation reason if status is CANCELLED |
| `rejection_reason` | string \| null | Rejection reason if status is REJECTED |
| `createdAt` | string | Booking creation timestamp (ISO 8601) |

**User Object:**
- `_id`: MongoDB ObjectId
- `id`: User UUID
- `firstName`: First name
- `lastName`: Last name
- `email`: Email address
- `mobile`: Mobile number
- `profileImage`: Profile image URL

**Participant Object:**
- `_id`: MongoDB ObjectId
- `firstName`: First name
- `lastName`: Last name
- `profilePhoto`: Profile photo URL
- `gender`: Gender (e.g., "male", "female")
- `age`: Age as string (calculated from DOB)
- `dob`: Date of birth (ISO 8601)

---

## 3. Approve Booking Request

Approve a booking request. The booking must be in `SLOT_BOOKED` or `REQUESTED` status.

### Endpoint

```
POST /api/v1/academy/booking/{id}/approve
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (UUID) |

### Request Body

No request body required.

### Request Example

```javascript
// Using fetch
const bookingId = 'f316a86c-2909-4d32-8983-eb225c715bcb';
const response = await fetch(`/api/v1/academy/booking/${bookingId}/approve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Using axios
const response = await axios.post(`/api/v1/academy/booking/${bookingId}/approve`, {}, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Response Structure

```json
{
  "success": true,
  "message": "Booking request approved successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "booking_id": "BK-2024-0001",
    "status": "approved",
    "amount": 5000,
    "currency": "INR",
    "payment": {
      "status": "not_initiated"
    },
    "rejection_reason": null,
    "batch": {
      "id": "batch-uuid",
      "name": "Morning Batch"
    },
    "center": {
      "id": "center-uuid",
      "center_name": "ABC Sports Academy"
    },
    "sport": {
      "id": "sport-uuid",
      "name": "Cricket"
    },
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Booking UUID |
| `booking_id` | string | Unique booking reference ID |
| `status` | string | Updated booking status (should be "approved") |
| `amount` | number | Booking amount |
| `currency` | string | Currency code |
| `payment` | object | Payment details with `status` field |
| `rejection_reason` | string \| null | Rejection reason (null for approved bookings) |
| `batch` | object | Batch details (`id`, `name`) |
| `center` | object | Center details (`id`, `center_name`) |
| `sport` | object | Sport details (`id`, `name`) |
| `updatedAt` | string | Last update timestamp (ISO 8601) |

---

## 4. Reject Booking Request

Reject a booking request with a reason. The booking must be in `SLOT_BOOKED` or `REQUESTED` status.

### Endpoint

```
POST /api/v1/academy/booking/{id}/reject
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Booking ID (UUID) |

### Request Body

```json
{
  "reason": "Batch is full"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `reason` | string | Yes | Min: 1, Max: 1000 | Rejection reason |

### Request Example

```javascript
// Using fetch
const bookingId = 'f316a86c-2909-4d32-8983-eb225c715bcb';
const response = await fetch(`/api/v1/academy/booking/${bookingId}/reject`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Batch is full'
  })
});

// Using axios
const response = await axios.post(
  `/api/v1/academy/booking/${bookingId}/reject`,
  {
    reason: 'Batch is full'
  },
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

### Response Structure

```json
{
  "success": true,
  "message": "Booking request rejected successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "booking_id": "BK-2024-0001",
    "status": "rejected",
    "amount": 5000,
    "currency": "INR",
    "payment": {
      "status": "not_initiated"
    },
    "rejection_reason": "Batch is full",
    "batch": {
      "id": "batch-uuid",
      "name": "Morning Batch"
    },
    "center": {
      "id": "center-uuid",
      "center_name": "ABC Sports Academy"
    },
    "sport": {
      "id": "sport-uuid",
      "name": "Cricket"
    },
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Response Fields

Same as Approve Booking Request response, but:
- `status` will be "rejected"
- `rejection_reason` will contain the provided reason

---

## 5. Export Bookings

Export bookings to Excel, CSV, or PDF format with date range and type filters.

### Endpoint

```
GET /api/v1/academy/booking/export
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | Yes | Export format: `excel`, `csv`, or `pdf` |
| `centerId` | string | No | Filter by coaching center ID |
| `batchId` | string | No | Filter by batch ID |
| `status` | string | No | Filter by booking status (see status enum in Get Bookings List) |
| `paymentStatus` | string | No | Filter by payment status (see payment status enum in Get Bookings List) |
| `startDate` | string | No | Filter by start date (format: `YYYY-MM-DD`, e.g., `2024-01-01`) |
| `endDate` | string | No | Filter by end date (format: `YYYY-MM-DD`, e.g., `2024-12-31`) |
| `type` | string | No | Filter by booking type: `all`, `confirmed`, `pending`, `cancelled`, `rejected` |

### Request Example

```javascript
// Using fetch
const params = new URLSearchParams({
  format: 'excel',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  type: 'all'
});

const response = await fetch(`/api/v1/academy/booking/export?${params}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Handle file download
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `bookings-${new Date().toISOString()}.xlsx`;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
document.body.removeChild(a);

// Using axios
const response = await axios.get('/api/v1/academy/booking/export', {
  params: {
    format: 'excel',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    type: 'all'
  },
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  responseType: 'blob' // Important for file downloads
});

// Handle file download
const blob = new Blob([response.data]);
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `bookings-${new Date().toISOString()}.xlsx`;
link.click();
window.URL.revokeObjectURL(url);
```

### Response

The response is a file download with the appropriate content type:
- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **CSV**: `text/csv`
- **PDF**: `application/pdf`

### Response Headers

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="bookings-2024-01-15.xlsx"
```

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Forbidden - ACADEMY role required"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Booking not found"
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error message or business logic error"
}
```

---

## Status Messages Reference

The `status_message` field in booking responses provides user-friendly messages based on booking and payment status:

| Booking Status | Payment Status | Status Message |
|----------------|----------------|----------------|
| `CANCELLED` | Any | "Booking has been cancelled." |
| `COMPLETED` | Any | "Booking completed successfully." |
| `REJECTED` | Any | "Booking request has been rejected." |
| `CONFIRMED` | `SUCCESS` | "Booking confirmed! Payment received successfully." |
| `APPROVED` | `NOT_INITIATED` | "Booking approved. Waiting for customer payment." |
| `APPROVED` | `INITIATED` | "Payment initiated by customer. Waiting for payment completion." |
| `APPROVED` | `PENDING` / `PROCESSING` | "Payment is being processed." |
| `APPROVED` | `FAILED` | "Payment failed. Customer needs to retry payment." |
| `APPROVED` | `SUCCESS` | "Booking confirmed! Payment received." |
| `SLOT_BOOKED` | Any | "Booking request received. Waiting for academy approval." |
| `PAYMENT_PENDING` / `PENDING` | `INITIATED` | "Payment initiated. Waiting for completion." |
| `PAYMENT_PENDING` / `PENDING` | `PENDING` / `PROCESSING` | "Payment is being processed." |
| `PAYMENT_PENDING` / `PENDING` | `FAILED` | "Payment failed." |
| `PAYMENT_PENDING` / `PENDING` | Other | "Payment pending." |

---

## Notes

1. **Amount Field**: The `amount` field in responses shows only the batch amount (what the academy earns), excluding platform fees and GST.

2. **Payment Status**: When payment status is `SUCCESS`, the `payment_status` field returns `"paid"` instead of `"success"` for better UI display.

3. **Can Accept/Reject**: The `can_accept_reject` flag is `true` only when booking status is `SLOT_BOOKED` or `REQUESTED`.

4. **Export File Names**: Export files are automatically named with timestamps. You can customize the download filename in your frontend code.

5. **Date Format**: All date fields in responses use ISO 8601 format (e.g., `2024-01-15T10:00:00.000Z`).

6. **Pagination**: The list endpoint supports pagination with `page` and `limit` parameters. Use `hasNextPage` and `hasPrevPage` flags to control pagination UI.
