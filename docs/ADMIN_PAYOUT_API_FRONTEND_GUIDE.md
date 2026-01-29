# Admin Panel Payout API - Frontend Integration Guide

This guide provides comprehensive documentation for frontend developers to integrate the Admin Payout Management APIs in the Admin Panel. The API allows admins to view, manage, and process payouts to academies.

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Authentication](#base-url--authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Status Flow](#status-flow)
6. [Error Handling](#error-handling)
7. [Frontend Integration Examples](#frontend-integration-examples)
8. [Common Use Cases](#common-use-cases)
9. [Best Practices](#best-practices)

---

## Overview

The Admin Payout API provides endpoints for:
- Viewing and filtering payouts
- Initiating transfers to academy accounts
- Retrying failed transfers
- Cancelling pending payouts
- Processing refunds for bookings
- Viewing payout statistics

### Key Features
- **Permission-Based Access**: Requires `PAYOUT` section permissions (VIEW, CREATE, UPDATE)
- **Filtering & Pagination**: Advanced filtering and pagination support
- **Queue-Based Processing**: Transfers are processed asynchronously via queues
- **Audit Trail**: All actions are logged for audit purposes
- **Notifications**: Automatic notifications sent to academies on payout events

---

## Base URL & Authentication

### Base URL
```
Production: https://api.playasport.in/api/v1
Development: http://localhost:3001/api/v1
```

### Authentication

All endpoints require authentication using Bearer token in the Authorization header.

```javascript
headers: {
  'Authorization': `Bearer ${adminAccessToken}`,
  'Content-Type': 'application/json'
}
```

**Required:**
- Valid admin access token (JWT)
- Admin role (`ADMIN` or `SUPER_ADMIN`)
- Appropriate permissions:
  - `PAYOUT.VIEW` - For viewing payouts and statistics
  - `PAYOUT.CREATE` - For creating transfers and refunds
  - `PAYOUT.UPDATE` - For cancelling payouts

---

## API Endpoints

### 1. Get All Payouts

Retrieve a paginated list of payouts with optional filters.

**Endpoint:** `GET /admin/payouts`

**Required Permission:** `PAYOUT.VIEW`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by payout status: `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded` |
| `academyUserId` | string | No | Filter by academy user ID |
| `bookingId` | string | No | Filter by booking ID |
| `transactionId` | string | No | Filter by transaction ID |
| `dateFrom` | string (date) | No | Filter from date (ISO 8601: `YYYY-MM-DD`) |
| `dateTo` | string (date) | No | Filter to date (ISO 8601: `YYYY-MM-DD`) |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "data": [
      {
        "id": "payout-uuid-123",
        "booking": {
          "id": "booking-uuid-456",
          "booking_id": "BK123456"
        },
        "transaction": {
          "id": "transaction-uuid-789",
          "razorpay_order_id": "order_xxx",
          "razorpay_payment_id": "pay_xxx"
        },
        "academy_user": {
          "id": "academy-user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "academy@example.com"
        },
        "academy_payout_account": {
          "id": "account-uuid",
          "razorpay_account_id": "acc_xxx",
          "ready_for_payout": "ready"
        },
        "amount": 5000,
        "batch_amount": 4500,
        "commission_rate": 0.10,
        "commission_amount": 450,
        "payout_amount": 4050,
        "currency": "INR",
        "status": "pending",
        "razorpay_transfer_id": null,
        "refund_amount": null,
        "adjusted_payout_amount": null,
        "failure_reason": null,
        "processed_at": null,
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Payouts retrieved successfully"
}
```

---

### 2. Get Payout Statistics

Get aggregated payout statistics for dashboard.

**Endpoint:** `GET /admin/payouts/stats`

**Required Permission:** `PAYOUT.VIEW`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `academyUserId` | string | No | Filter by academy user ID |
| `dateFrom` | string (date) | No | Filter from date (ISO 8601: `YYYY-MM-DD`) |
| `dateTo` | string (date) | No | Filter to date (ISO 8601: `YYYY-MM-DD`) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "total_pending": 25,
    "total_processing": 5,
    "total_completed": 500,
    "total_failed": 10,
    "total_cancelled": 3,
    "total_refunded": 2,
    "total_pending_amount": 125000,
    "total_processing_amount": 25000,
    "total_completed_amount": 2500000,
    "total_failed_amount": 50000,
    "total_cancelled_amount": 15000,
    "total_refunded_amount": 10000
  },
  "message": "Payout statistics retrieved successfully"
}
```

---

### 3. Get Payout by ID

Retrieve detailed payout information by ID.

**Endpoint:** `GET /admin/payouts/:id`

**Required Permission:** `PAYOUT.VIEW`

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
      "amount": 5000,
      "currency": "INR",
      "status": "confirmed",
      "payout_status": "pending"
    },
    "transaction": {
      "id": "transaction-uuid-789",
      "razorpay_order_id": "order_xxx",
      "razorpay_payment_id": "pay_xxx",
      "status": "success"
    },
    "academy_user": {
      "id": "academy-user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "academy@example.com",
      "mobile": "+919876543210"
    },
    "academy_payout_account": {
      "id": "account-uuid",
      "razorpay_account_id": "acc_xxx",
      "ready_for_payout": "ready",
      "bank_information": {
        "account_number": "****1234",
        "ifsc_code": "SBIN0001234",
        "account_holder_name": "John Doe",
        "bank_name": "State Bank of India"
      }
    },
    "amount": 5000,
    "batch_amount": 4500,
    "commission_rate": 0.10,
    "commission_amount": 450,
    "payout_amount": 4050,
    "currency": "INR",
    "status": "pending",
    "razorpay_transfer_id": null,
    "refund_amount": null,
    "adjusted_payout_amount": null,
    "failure_reason": null,
    "processed_at": null,
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z"
  },
  "message": "Payout retrieved successfully"
}
```

---

### 4. Create Transfer

Initiate transfer to academy's Razorpay account. This queues the transfer job for asynchronous processing.

**Endpoint:** `POST /admin/payouts/:id/transfer`

**Required Permission:** `PAYOUT.CREATE`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout ID (UUID) |

**Request Body:** None (empty body)

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid-123",
    "status": "processing",
    "message": "Transfer job queued successfully"
  },
  "message": "Transfer initiated successfully"
}
```

**Error Responses:**

- `400` - Invalid payout status or account not ready
- `404` - Payout not found
- `403` - Insufficient permissions

---

### 5. Retry Failed Transfer

Retry a failed payout transfer.

**Endpoint:** `POST /admin/payouts/:id/retry`

**Required Permission:** `PAYOUT.CREATE`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout ID (UUID) |

**Request Body:** None (empty body)

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid-123",
    "status": "processing",
    "message": "Transfer retry job queued successfully"
  },
  "message": "Transfer retry initiated successfully"
}
```

---

### 6. Cancel Payout

Cancel a pending payout. Cannot cancel payouts that are already processing, completed, or failed.

**Endpoint:** `PATCH /admin/payouts/:id/cancel`

**Required Permission:** `PAYOUT.UPDATE`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout ID (UUID) |

**Request Body:**

```json
{
  "reason": "Booking cancelled by user"
}
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Cancellation reason (min 1 character) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid-123",
    "status": "cancelled",
    "failure_reason": "Booking cancelled by user"
  },
  "message": "Payout cancelled successfully"
}
```

---

### 7. Create Refund

Initiate refund for a confirmed booking. Can be full or partial refund.

**Endpoint:** `POST /admin/payouts/bookings/:bookingId/refund`

**Required Permission:** `PAYOUT.CREATE`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingId` | string | Yes | Booking ID (UUID) |

**Request Body:**

```json
{
  "amount": 1000,
  "reason": "Booking cancelled by user"
}
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | No | Refund amount (if not provided, full refund) |
| `reason` | string | Yes | Refund reason (min 1 character) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "booking": {
      "id": "booking-uuid-456",
      "status": "cancelled",
      "payout_status": "refunded"
    },
    "refund": {
      "id": "rfnd_xxx",
      "amount": 1000,
      "status": "initiated",
      "razorpay_refund_id": "rfnd_xxx"
    },
    "payout": {
      "id": "payout-uuid-123",
      "status": "refunded",
      "refund_amount": 1000
    }
  },
  "message": "Refund created successfully"
}
```

**Error Responses:**

- `400` - Invalid booking status or refund amount exceeds payment
- `404` - Booking not found
- `403` - Insufficient permissions

---

### 8. Get Refund Details

Get refund details from Razorpay.

**Endpoint:** `GET /admin/payouts/refunds/:refundId`

**Required Permission:** `PAYOUT.VIEW`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refundId` | string | Yes | Razorpay refund ID (e.g., `rfnd_xxx`) |

**Response Structure:**

```json
{
  "statusCode": 200,
  "data": {
    "id": "rfnd_xxx",
    "entity": "refund",
    "amount": 1000,
    "currency": "INR",
    "payment_id": "pay_xxx",
    "notes": {
      "reason": "Booking cancelled by user"
    },
    "receipt": null,
    "acquirer_data": {},
    "created_at": 1705747200,
    "batch_id": null,
    "status": "processed",
    "speed_processed": "normal",
    "speed_requested": "normal"
  },
  "message": "Refund details retrieved successfully"
}
```

---

## Data Models

### Payout Status

| Status | Description |
|--------|-------------|
| `pending` | Payout created, awaiting transfer initiation |
| `processing` | Transfer initiated, awaiting Razorpay processing |
| `completed` | Transfer completed successfully |
| `failed` | Transfer failed |
| `cancelled` | Payout cancelled by admin |
| `refunded` | Payout refunded (full or partial) |

### Booking Payout Status

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

## Status Flow

### Payout Lifecycle

```
Payment Success → Payout Created (pending)
                    ↓
            Admin Initiates Transfer
                    ↓
            Transfer Queued (processing)
                    ↓
        ┌────────────┴────────────┐
        ↓                         ↓
  Transfer Success          Transfer Failed
        ↓                         ↓
  Completed              Admin Retries Transfer
                              ↓
                        Processing Again
```

### Refund Flow

```
Admin Initiates Refund
        ↓
Refund Created in Razorpay
        ↓
Booking Status → Cancelled (if full refund)
Payout Status → Refunded
        ↓
Refund Processed
```

---

## Error Handling

### Error Response Structure

```json
{
  "statusCode": 400,
  "data": null,
  "message": "Invalid payout status or account not ready"
}
```

### Common Error Codes

| Status Code | Description | Possible Causes |
|-------------|-------------|-----------------|
| `400` | Bad Request | Invalid parameters, invalid status, account not ready |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Payout/booking not found |
| `500` | Internal Server Error | Server-side error |

### Error Handling Example

```typescript
try {
  const response = await fetch('/api/v1/admin/payouts/payout-id/transfer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403) {
      // Handle permission error
      showError('You do not have permission to create transfers');
    } else if (response.status === 400) {
      // Handle validation error
      showError(data.message);
    } else {
      // Handle other errors
      showError('An error occurred. Please try again.');
    }
    return;
  }

  // Success
  showSuccess('Transfer initiated successfully');
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

---

## Frontend Integration Examples

### React/TypeScript Example

```typescript
// Types
interface Payout {
  id: string;
  booking: {
    id: string;
    booking_id: string;
  };
  academy_user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  amount: number;
  payout_amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  createdAt: string;
}

interface PayoutFilters {
  status?: string;
  academyUserId?: string;
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// API Service
class AdminPayoutService {
  private baseUrl = '/api/v1/admin/payouts';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getPayouts(filters: PayoutFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.academyUserId) params.append('academyUserId', filters.academyUserId);
    if (filters.bookingId) params.append('bookingId', filters.bookingId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payouts');
    }

    return response.json();
  }

  async getPayoutById(id: string) {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payout');
    }

    return response.json();
  }

  async getStats(filters: { academyUserId?: string; dateFrom?: string; dateTo?: string } = {}) {
    const params = new URLSearchParams();
    
    if (filters.academyUserId) params.append('academyUserId', filters.academyUserId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await fetch(`${this.baseUrl}/stats?${params}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }

    return response.json();
  }

  async createTransfer(payoutId: string) {
    const response = await fetch(`${this.baseUrl}/${payoutId}/transfer`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate transfer');
    }

    return response.json();
  }

  async retryTransfer(payoutId: string) {
    const response = await fetch(`${this.baseUrl}/${payoutId}/retry`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to retry transfer');
    }

    return response.json();
  }

  async cancelPayout(payoutId: string, reason: string) {
    const response = await fetch(`${this.baseUrl}/${payoutId}/cancel`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel payout');
    }

    return response.json();
  }

  async createRefund(bookingId: string, amount: number | undefined, reason: string) {
    const response = await fetch(`${this.baseUrl}/bookings/${bookingId}/refund`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount, reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create refund');
    }

    return response.json();
  }

  async getRefundDetails(refundId: string) {
    const response = await fetch(`${this.baseUrl}/refunds/${refundId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch refund details');
    }

    return response.json();
  }
}

// React Hook Example
import { useState, useEffect } from 'react';

export const usePayouts = (filters: PayoutFilters = {}) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const token = localStorage.getItem('adminAccessToken');
  const service = new AdminPayoutService(token || '');

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        const response = await service.getPayouts(filters);
        setPayouts(response.data.data);
        setPagination(response.data.pagination);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [filters.status, filters.academyUserId, filters.page]);

  return { payouts, loading, error, pagination };
};

// Component Example
const PayoutList: React.FC = () => {
  const [filters, setFilters] = useState<PayoutFilters>({ page: 1, limit: 20 });
  const { payouts, loading, error, pagination } = usePayouts(filters);
  const token = localStorage.getItem('adminAccessToken');
  const service = new AdminPayoutService(token || '');

  const handleTransfer = async (payoutId: string) => {
    if (!confirm('Are you sure you want to initiate this transfer?')) {
      return;
    }

    try {
      await service.createTransfer(payoutId);
      alert('Transfer initiated successfully');
      // Refresh list
      window.location.reload();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCancel = async (payoutId: string) => {
    const reason = prompt('Please provide a cancellation reason:');
    if (!reason || reason.trim().length === 0) {
      alert('Cancellation reason is required');
      return;
    }

    try {
      await service.cancelPayout(payoutId, reason);
      alert('Payout cancelled successfully');
      // Refresh list
      window.location.reload();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Payouts</h1>
      
      {/* Filters */}
      <div>
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Payouts Table */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Academy</th>
            <th>Booking ID</th>
            <th>Amount</th>
            <th>Payout Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id}>
              <td>{payout.id}</td>
              <td>{payout.academy_user.firstName} {payout.academy_user.lastName}</td>
              <td>{payout.booking.booking_id}</td>
              <td>{payout.amount} {payout.currency}</td>
              <td>{payout.payout_amount} {payout.currency}</td>
              <td>{payout.status}</td>
              <td>
                {payout.status === 'pending' && (
                  <>
                    <button onClick={() => handleTransfer(payout.id)}>
                      Initiate Transfer
                    </button>
                    <button onClick={() => handleCancel(payout.id)}>
                      Cancel
                    </button>
                  </>
                )}
                {payout.status === 'failed' && (
                  <button onClick={() => service.retryTransfer(payout.id)}>
                    Retry
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && (
        <div>
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
```

### cURL Examples

**Get Payouts:**
```bash
curl -X GET 'https://api.playasport.in/api/v1/admin/payouts?status=pending&page=1&limit=20' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json'
```

**Get Statistics:**
```bash
curl -X GET 'https://api.playasport.in/api/v1/admin/payouts/stats?dateFrom=2026-01-01&dateTo=2026-01-31' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json'
```

**Create Transfer:**
```bash
curl -X POST 'https://api.playasport.in/api/v1/admin/payouts/payout-uuid-123/transfer' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json'
```

**Cancel Payout:**
```bash
curl -X PATCH 'https://api.playasport.in/api/v1/admin/payouts/payout-uuid-123/cancel' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Booking cancelled by user"
  }'
```

**Create Refund:**
```bash
curl -X POST 'https://api.playasport.in/api/v1/admin/payouts/bookings/booking-uuid-456/refund' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 1000,
    "reason": "Booking cancelled by user"
  }'
```

---

## Common Use Cases

### 1. Payout Dashboard

Display payout statistics and recent payouts:

```typescript
const PayoutDashboard = () => {
  const [stats, setStats] = useState(null);
  const { payouts } = usePayouts({ limit: 10 });

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('adminAccessToken');
      const service = new AdminPayoutService(token || '');
      const response = await service.getStats();
      setStats(response.data);
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1>Payout Dashboard</h1>
      {stats && (
        <div>
          <div>Pending: {stats.total_pending} ({stats.total_pending_amount} INR)</div>
          <div>Processing: {stats.total_processing} ({stats.total_processing_amount} INR)</div>
          <div>Completed: {stats.total_completed} ({stats.total_completed_amount} INR)</div>
          <div>Failed: {stats.total_failed} ({stats.total_failed_amount} INR)</div>
        </div>
      )}
      <PayoutList />
    </div>
  );
};
```

### 2. Bulk Transfer Action

Initiate transfers for multiple pending payouts:

```typescript
const handleBulkTransfer = async (payoutIds: string[]) => {
  const token = localStorage.getItem('adminAccessToken');
  const service = new AdminPayoutService(token || '');
  
  const results = await Promise.allSettled(
    payoutIds.map(id => service.createTransfer(id))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  alert(`Transfers initiated: ${successful} successful, ${failed} failed`);
};
```

### 3. Refund Processing

Process refund with confirmation:

```typescript
const handleRefund = async (bookingId: string, amount?: number) => {
  const reason = prompt('Please provide refund reason:');
  if (!reason || reason.trim().length === 0) {
    alert('Refund reason is required');
    return;
  }

  const confirmMessage = amount
    ? `Are you sure you want to refund ${amount} INR?`
    : 'Are you sure you want to process a full refund?';

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const token = localStorage.getItem('adminAccessToken');
    const service = new AdminPayoutService(token || '');
    await service.createRefund(bookingId, amount, reason);
    alert('Refund processed successfully');
  } catch (error: any) {
    alert(`Error: ${error.message}`);
  }
};
```

---

## Best Practices

### 1. Permission Checking

Always check permissions before showing action buttons:

```typescript
const hasPermission = (section: string, action: string) => {
  const permissions = getUserPermissions(); // Your permission checking logic
  return permissions.includes(`${section}.${action}`);
};

// In component
{hasPermission('PAYOUT', 'CREATE') && (
  <button onClick={() => handleTransfer(payout.id)}>
    Initiate Transfer
  </button>
)}
```

### 2. Loading States

Show loading indicators during async operations:

```typescript
const [transferring, setTransferring] = useState<string | null>(null);

const handleTransfer = async (payoutId: string) => {
  setTransferring(payoutId);
  try {
    await service.createTransfer(payoutId);
    // Success
  } catch (error) {
    // Error
  } finally {
    setTransferring(null);
  }
};

// In render
<button
  disabled={transferring === payout.id}
  onClick={() => handleTransfer(payout.id)}
>
  {transferring === payout.id ? 'Processing...' : 'Initiate Transfer'}
</button>
```

### 3. Error Handling

Implement comprehensive error handling:

```typescript
const handleApiCall = async (apiCall: () => Promise<any>) => {
  try {
    return await apiCall();
  } catch (error: any) {
    if (error.response?.status === 403) {
      showError('You do not have permission to perform this action');
    } else if (error.response?.status === 400) {
      showError(error.response.data.message || 'Invalid request');
    } else if (error.response?.status === 404) {
      showError('Resource not found');
    } else {
      showError('An unexpected error occurred. Please try again.');
    }
    throw error;
  }
};
```

### 4. Polling for Status Updates

Poll for transfer status updates:

```typescript
const usePayoutStatus = (payoutId: string) => {
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!payoutId) return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem('adminAccessToken');
      const service = new AdminPayoutService(token || '');
      const response = await service.getPayoutById(payoutId);
      setStatus(response.data.status);

      // Stop polling if completed or failed
      if (['completed', 'failed', 'cancelled'].includes(response.data.status)) {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [payoutId]);

  return status;
};
```

### 5. Date Formatting

Format dates for display:

```typescript
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Usage
<td>{formatDate(payout.createdAt)}</td>
```

### 6. Amount Formatting

Format currency amounts:

```typescript
const formatCurrency = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

// Usage
<td>{formatCurrency(payout.payout_amount, payout.currency)}</td>
```

---

## Support

For issues or questions:
- Check the [Admin Payout System Guide](./ADMIN_PAYOUT_SYSTEM_GUIDE.md) for system architecture
- Check the [Admin Payout Quick Reference](./ADMIN_PAYOUT_QUICK_REFERENCE.md) for quick lookup
- Contact technical support: support@playasport.in
- API Documentation: `/api-docs` (Swagger UI)

---

**Last Updated:** January 2026  
**API Version:** v1
