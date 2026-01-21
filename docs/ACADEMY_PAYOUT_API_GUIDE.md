# Academy Payout API Guide

This guide provides comprehensive documentation for the Academy Payout APIs, allowing academy users to view their payout information.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [Status Codes](#status-codes)
7. [Best Practices](#best-practices)

---

## Overview

The Academy Payout API allows authenticated academy users to:
- View their payout list with basic information
- Get detailed payout information by ID
- View payout statistics (pending, completed, failed amounts)

### Base URL
```
/api/v1/academy/my-payouts
```

### Key Features
- **Security**: Only returns payouts belonging to the authenticated academy user
- **Filtering**: Filter by status, date range
- **Pagination**: Supports pagination for list endpoints
- **Statistics**: Aggregate payout statistics

---

## Authentication

All endpoints require authentication using Bearer token.

### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Requirements
- Valid access token (JWT)
- Token must belong to an academy user (role: `academy`)
- Token must not be expired

---

## API Endpoints

### 1. Get Payouts List

Retrieve a paginated list of payouts for the authenticated academy user with basic information.

**Endpoint:** `GET /api/v1/academy/my-payouts`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by payout status: `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded` |
| `dateFrom` | string (date) | No | - | Filter from date (ISO 8601 format: `YYYY-MM-DD`) |
| `dateTo` | string (date) | No | - | Filter to date (ISO 8601 format: `YYYY-MM-DD`) |
| `page` | integer | No | 1 | Page number (starts from 1) |
| `limit` | integer | No | 20 | Number of items per page (max: 100) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "data": [
      {
        "id": "payout-uuid-123",
        "booking_id": "BK123456",
        "payout_amount": 4050,
        "currency": "INR",
        "status": "pending",
        "payout_status": "pending"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Payouts retrieved successfully"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique payout ID |
| `booking_id` | string \| null | Booking reference ID |
| `payout_amount` | number | Amount to be paid to academy |
| `currency` | string | Currency code (e.g., "INR") |
| `status` | string | Payout status from Payout model: `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded` |
| `payout_status` | string | Payout status from Booking model: `not_initiated`, `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded` |

---

### 2. Get Payout Details

Retrieve detailed payout information for a specific payout ID. Only returns payout if it belongs to the authenticated academy user.

**Endpoint:** `GET /api/v1/academy/my-payouts/:id`

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout ID (UUID) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid-123",
    "booking": {
      "id": "booking-uuid-456",
      "booking_id": "BK123456",
      "currency": "INR",
      "payout_status": "pending"
    },
    "payout_amount": 4050,
    "currency": "INR",
    "status": "pending",
    "failure_reason": null,
    "processed_at": null
  },
  "message": "Payout retrieved successfully"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique payout ID |
| `booking` | object | Booking information |
| `booking.id` | string | Booking UUID |
| `booking.booking_id` | string \| null | Booking reference ID |
| `booking.currency` | string | Currency code |
| `booking.payout_status` | string | Payout status from Booking model |
| `payout_amount` | number | Amount to be paid to academy |
| `currency` | string | Currency code |
| `status` | string | Payout status |
| `failure_reason` | string \| null | Failure reason (if failed) |
| `processed_at` | string \| null | Processing timestamp (ISO 8601) |

---

### 3. Get Payout Statistics

Get aggregated payout statistics for the authenticated academy user.

**Endpoint:** `GET /api/v1/academy/my-payouts/stats`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dateFrom` | string (date) | No | Filter from date (ISO 8601 format: `YYYY-MM-DD`) |
| `dateTo` | string (date) | No | Filter to date (ISO 8601 format: `YYYY-MM-DD`) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "total_pending": 5,
    "total_processing": 2,
    "total_completed": 50,
    "total_failed": 1,
    "total_pending_amount": 25000,
    "total_completed_amount": 200000,
    "total_failed_amount": 5000
  },
  "message": "Payout statistics retrieved successfully"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `total_pending` | integer | Count of pending payouts |
| `total_processing` | integer | Count of processing payouts |
| `total_completed` | integer | Count of completed payouts |
| `total_failed` | integer | Count of failed payouts |
| `total_pending_amount` | number | Total amount of pending payouts |
| `total_completed_amount` | number | Total amount of completed payouts |
| `total_failed_amount` | number | Total amount of failed payouts |

---

## Request/Response Examples

### Example 1: Get Payouts List (Filtered)

**Request:**
```bash
GET /api/v1/academy/my-payouts?status=pending&page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "data": [
      {
        "id": "payout-001",
        "booking_id": "BK123456",
        "payout_amount": 4050,
        "currency": "INR",
        "status": "pending",
        "payout_status": "pending"
      },
      {
        "id": "payout-002",
        "booking_id": "BK123457",
        "payout_amount": 2430,
        "currency": "INR",
        "status": "pending",
        "payout_status": "pending"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "message": "Payouts retrieved successfully"
}
```

### Example 2: Get Payout Details

**Request:**
```bash
GET /api/v1/academy/my-payouts/payout-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-001",
    "booking": {
      "id": "booking-uuid-456",
      "booking_id": "BK123456",
      "currency": "INR",
      "payout_status": "pending"
    },
    "payout_amount": 4050,
    "currency": "INR",
    "status": "pending",
    "failure_reason": null,
    "processed_at": null
  },
  "message": "Payout retrieved successfully"
}
```

### Example 3: Get Payout Statistics

**Request:**
```bash
GET /api/v1/academy/my-payouts/stats?dateFrom=2026-01-01&dateTo=2026-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "total_pending": 5,
    "total_processing": 2,
    "total_completed": 50,
    "total_failed": 1,
    "total_pending_amount": 25000,
    "total_completed_amount": 200000,
    "total_failed_amount": 5000
  },
  "message": "Payout statistics retrieved successfully"
}
```

---

## Error Handling

### Error Response Structure

```json
{
  "statusCode": 401,
  "data": null,
  "message": "Unauthorized"
}
```

### Common Error Codes

| Status Code | Description | Possible Causes |
|-------------|-------------|-----------------|
| `401` | Unauthorized | Missing or invalid token, token expired |
| `404` | Not Found | Payout ID not found or doesn't belong to user |
| `500` | Internal Server Error | Server-side error |

### Error Examples

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "data": null,
  "message": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "data": null,
  "message": "Payout not found"
}
```

---

## Status Codes

### Payout Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payout created but transfer not initiated |
| `processing` | Transfer initiated, awaiting Razorpay processing |
| `completed` | Transfer completed successfully |
| `failed` | Transfer failed |
| `cancelled` | Payout cancelled by admin |
| `refunded` | Payout refunded (full or partial) |

### Booking Payout Status Values

| Status | Description |
|--------|-------------|
| `not_initiated` | Payout not yet created |
| `pending` | Payout created, awaiting transfer |
| `processing` | Transfer in progress |
| `completed` | Transfer completed |
| `failed` | Transfer failed |
| `cancelled` | Payout cancelled |
| `refunded` | Refunded |

---

## Best Practices

### 1. Authentication
- Always include the `Authorization` header with a valid Bearer token
- Handle token expiration gracefully (refresh token if available)
- Store tokens securely (never in localStorage for web apps)

### 2. Pagination
- Use appropriate `limit` values (recommended: 20-50)
- Implement infinite scroll or "Load More" for better UX
- Always check `hasNextPage` before fetching next page

### 3. Filtering
- Use date filters to reduce payload size
- Filter by status for better performance
- Cache statistics data (refresh every 5-10 minutes)

### 4. Error Handling
- Always check response status codes
- Display user-friendly error messages
- Log errors for debugging (without exposing sensitive data)

### 5. Data Display
- Show `payout_status` from Booking model for user-facing status
- Display amounts with proper currency formatting
- Show timestamps in user's local timezone
- Format dates as "DD MMM YYYY, HH:mm" for better readability

### 6. Performance
- Fetch statistics separately (don't include in list response)
- Use pagination to avoid loading all payouts at once
- Implement client-side caching for frequently accessed data

### 7. Security
- Never expose sensitive data in client-side logs
- Validate all user inputs on client side
- Use HTTPS for all API calls

---

## Integration Examples

### React/Next.js Example

```typescript
// Fetch payouts list
const fetchPayouts = async (filters: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const response = await fetch(
    `/api/v1/academy/my-payouts?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch payouts');
  }
  
  return response.json();
};

// Fetch payout details
const fetchPayoutDetails = async (payoutId: string) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    `/api/v1/academy/my-payouts/${payoutId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch payout details');
  }
  
  return response.json();
};

// Fetch statistics
const fetchPayoutStats = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    '/api/v1/academy/my-payouts/stats',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }
  
  return response.json();
};
```

### cURL Examples

**Get Payouts List:**
```bash
curl -X GET 'https://api.playasport.in/api/v1/academy/my-payouts?status=pending&page=1&limit=20' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json'
```

**Get Payout Details:**
```bash
curl -X GET 'https://api.playasport.in/api/v1/academy/my-payouts/payout-uuid-123' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json'
```

**Get Statistics:**
```bash
curl -X GET 'https://api.playasport.in/api/v1/academy/my-payouts/stats?dateFrom=2026-01-01&dateTo=2026-01-31' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json'
```

---

## Support

For issues or questions:
- Check the [Admin Payout System Guide](./ADMIN_PAYOUT_SYSTEM_GUIDE.md) for system architecture
- Contact technical support: support@playasport.in
- API Documentation: `/api-docs` (Swagger UI)

---

**Last Updated:** January 2026  
**API Version:** v1
