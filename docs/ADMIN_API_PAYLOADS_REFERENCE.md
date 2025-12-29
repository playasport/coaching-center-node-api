# Admin API Payloads Reference

This document provides comprehensive reference for input and output payloads for Admin Panel APIs, including recently added endpoints.

## Table of Contents

1. [Payment Management APIs](#payment-management-apis)
2. [Booking Management APIs](#booking-management-apis)
3. [Coaching Center Management APIs](#coaching-center-management-apis)

---

## Payment Management APIs

### 1. Get Payment by ID

**Endpoint**: `GET /admin/payments/:id`

**Headers**:
```json
{
  "Authorization": "Bearer {adminAccessToken}"
}
```

**Path Parameters**:
- `id` (string, required): Payment ID (transaction ID)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "payment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "booking": {
        "id": "507f1f77bcf86cd799439011",
        "booking_id": "BK123456",
        "amount": 5000,
        "currency": "INR",
        "status": "confirmed",
        "participants": [
          {
            "id": "507f1f77bcf86cd799439012",
            "firstName": "John",
            "lastName": "Doe"
          }
        ],
        "batch": {
          "id": "507f1f77bcf86cd799439013",
          "name": "Morning Batch"
        },
        "center": {
          "id": "507f1f77bcf86cd799439014",
          "center_name": "Sports Academy"
        },
        "sport": {
          "id": "507f1f77bcf86cd799439015",
          "name": "Cricket"
        }
      },
      "user": {
        "id": "507f1f77bcf86cd799439016",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "mobile": "+919876543210",
        "profileImage": "https://example.com/profile.jpg"
      },
      "razorpay_order_id": "order_MNOP1234567890",
      "razorpay_payment_id": "pay_ABCD1234567890",
      "razorpay_refund_id": null,
      "type": "payment",
      "status": "success",
      "source": "webhook",
      "amount": 5000,
      "currency": "INR",
      "payment_method": "card",
      "failure_reason": null,
      "metadata": null,
      "processed_at": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-15T10:25:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Note**: `razorpay_signature` is excluded from the response for security reasons.

**Error Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "Payment not found"
}
```

### 2. Get Payment Statistics

**Endpoint**: `GET /admin/payments/stats`

**Query Parameters**:
- `startDate` (string, optional): Filter from date (YYYY-MM-DD)
- `endDate` (string, optional): Filter until date (YYYY-MM-DD)

**Response (200 OK)**:
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

---

## Booking Management APIs

### 1. Get Booking Statistics

**Endpoint**: `GET /admin/bookings/stats`

**Query Parameters**:
- `startDate` (string, optional): Filter from date (YYYY-MM-DD)
- `endDate` (string, optional): Filter until date (YYYY-MM-DD)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Booking statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 1250,
      "byStatus": {
        "pending": 50,
        "confirmed": 1100,
        "cancelled": 80,
        "completed": 20
      },
      "byPaymentStatus": {
        "pending": 30,
        "processing": 20,
        "success": 1150,
        "failed": 30,
        "refunded": 10,
        "cancelled": 10
      },
      "totalAmount": 6250000,
      "amountByPaymentStatus": {
        "pending": 150000,
        "processing": 100000,
        "success": 5750000,
        "failed": 150000,
        "refunded": 50000,
        "cancelled": 50000
      },
      "byPaymentMethod": {
        "card": 700,
        "netbanking": 250,
        "upi": 200,
        "wallet": 100
      }
    }
  }
}
```

### 2. Download Booking Invoice

**Endpoint**: `GET /admin/bookings/:id/invoice`

**Path Parameters**:
- `id` (string, required): Booking ID

**Response (200 OK)**:
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="invoice-{bookingId}-{timestamp}.pdf"`
- **Body**: PDF binary data

The invoice PDF includes:
- Invoice header with number and date
- Company/platform information
- Billing details (user name, email, mobile)
- Booking details (sport, center, batch, schedule)
- Participant list
- Payment details (amount, status, method, order ID)
- Formatted currency and dates

**Error Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "Booking not found"
}
```

**Error Response (500 Internal Server Error)**:
```json
{
  "success": false,
  "message": "Failed to generate invoice PDF"
}
```

---

## Coaching Center Management APIs

### 1. Get Coaching Center Statistics

**Endpoint**: `GET /admin/coaching-centers/stats`

**Query Parameters**:
- `startDate` (string, optional): Filter from date (YYYY-MM-DD)
- `endDate` (string, optional): Filter until date (YYYY-MM-DD)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Coaching center statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 250,
      "byStatus": {
        "draft": 50,
        "published": 200
      },
      "byActiveStatus": {
        "active": 220,
        "inactive": 30
      },
      "bySport": {
        "Cricket": 80,
        "Football": 60,
        "Basketball": 40,
        "Tennis": 30,
        "Swimming": 40
      },
      "byCity": {
        "New Delhi": 50,
        "Mumbai": 45,
        "Bangalore": 40,
        "Chennai": 35,
        "Kolkata": 30,
        "Hyderabad": 25,
        "Pune": 25
      },
      "byState": {
        "Delhi": 50,
        "Maharashtra": 70,
        "Karnataka": 40,
        "Tamil Nadu": 35,
        "West Bengal": 30,
        "Telangana": 25
      },
      "allowingDisabled": 150,
      "onlyForDisabled": 10
    }
  }
}
```

### 2. Get All Coaching Centers

**Endpoint**: `GET /admin/coaching-centers`

**Query Parameters**:
- `page` (number, optional, default: 1): Page number
- `limit` (number, optional, default: 10): Items per page
- `userId` (string, optional): Filter by Academy owner ID
- `status` (string, optional): Filter by status (draft, published)
- `isActive` (string, optional): Filter by active status ("true", "false")
- `sportId` (string, optional): Filter by sport ID
- `search` (string, optional): Search by center name, email, or mobile number
- `sortBy` (string, optional, default: "createdAt"): Field to sort by
- `sortOrder` (string, optional, default: "desc"): Sort order (asc, desc)

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Coaching centers retrieved successfully",
  "data": {
    "coachingCenters": [
      {
        "id": "cc-123",
        "center_name": "Elite Sports Academy",
        "email": "elite@example.com",
        "mobile_number": "9876543210",
        "logo": "https://example.com/logo.png",
        "status": "published",
        "is_active": true,
        "user": {
          "id": "user-123",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "mobile": "+919876543210"
        },
        "sports": [
          {
            "id": "sport-123",
            "name": "Cricket"
          }
        ],
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
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

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "{Resource} not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request parameters",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error message"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Authentication

All admin endpoints require:
1. **Authentication**: Valid JWT token in Authorization header
2. **Admin Role**: User must have admin role (super_admin, admin, employee, etc.)
3. **Permissions**: User must have appropriate permissions for the action

**Header Format**:
```
Authorization: Bearer {adminAccessToken}
```

---

## Date Format

All date parameters should be in ISO 8601 format (YYYY-MM-DD):
- ✅ Valid: `2024-01-15`
- ❌ Invalid: `01/15/2024`, `15-01-2024`

---

## Pagination

Paginated endpoints return data in the following format:

```json
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## Notes

1. **Time Zones**: All timestamps are in UTC
2. **Currency**: Default currency is INR (Indian Rupees)
3. **Soft Deletes**: Deleted resources are excluded from results
4. **Case Sensitivity**: Search queries are case-insensitive
5. **Null Values**: Null fields may be omitted or set to `null` in responses
6. **Array Fields**: Empty arrays are returned as `[]` not `null`

---

## Related Documentation

- [Coaching Center Statistics API](./COACHING_CENTER_STATS_API.md)
- [Admin Transaction Payment Management](./ADMIN_TRANSACTION_PAYMENT_MANAGEMENT.md)
- [Admin Panel README](../postman/ADMIN_PANEL_README.md)

---

## Version

- **Last Updated**: 2024-01-XX
- **API Version**: v1
- **Base URL**: `http://localhost:3001/api/v1` (Development)

