# Academy Payout API - Frontend Integration Guide

Simple guide for frontend developers to integrate Academy Payout APIs.

## Base URL
```
/api/v1/academy/my-payouts
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <access_token>
```

---

## API Endpoints

### 1. Get Payouts List
**GET** `/academy/my-payouts`

Get paginated list of payouts with basic information.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |
| `status` | string | No | Filter by status: `pending`, `processing`, `completed`, `failed`, `cancelled`, `refunded` |
| `dateFrom` | string | No | Filter from date (YYYY-MM-DD) |
| `dateTo` | string | No | Filter to date (YYYY-MM-DD) |

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "data": [
      {
        "id": "payout-uuid",
        "booking_id": "BK123456",
        "payout_amount": 4050,
        "currency": "INR",
        "status": "pending",
        "payout_status": "pending",
        "students": ["John Doe", "Jane Smith"]
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

#### React/TypeScript Example
```typescript
interface PayoutListItem {
  id: string;
  booking_id: string | null;
  payout_amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payout_status: string;
  students: string[]; // Array of student names
}

const fetchPayouts = async (page = 1, status?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
  });
  
  if (status) params.append('status', status);
  
  const response = await fetch(`/api/v1/academy/my-payouts?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

---

### 2. Get Payout Details
**GET** `/academy/my-payouts/:id`

Get detailed information about a specific payout.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout ID |

#### Response
```json
{
  "statusCode": 200,
  "data": {
    "id": "payout-uuid",
    "booking": {
      "id": "booking-uuid",
      "booking_id": "BK123456",
      "currency": "INR",
      "payout_status": "pending"
    },
    "payout_amount": 4050,
    "currency": "INR",
    "status": "pending",
    "failure_reason": null,
    "processed_at": null,
    "students": [
      {
        "id": "participant-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "gender": "male",
        "dob": "2010-05-15",
        "profilePhoto": "https://example.com/photo.jpg"
      }
    ]
  },
  "message": "Payout retrieved successfully"
}
```

#### React/TypeScript Example
```typescript
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  dob: string | null;
  profilePhoto: string | null;
}

interface PayoutDetails {
  id: string;
  booking: {
    id: string;
    booking_id: string | null;
    currency: string;
    payout_status: string;
  };
  payout_amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  processed_at: string | null;
  students: Student[];
}

const fetchPayoutDetails = async (payoutId: string) => {
  const response = await fetch(`/api/v1/academy/my-payouts/${payoutId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

---

### 3. Get Payout Statistics
**GET** `/academy/my-payouts/stats`

Get aggregated payout statistics.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dateFrom` | string | No | Filter from date (YYYY-MM-DD) |
| `dateTo` | string | No | Filter to date (YYYY-MM-DD) |

#### Response
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

#### React/TypeScript Example
```typescript
interface PayoutStats {
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  total_pending_amount: number;
  total_completed_amount: number;
  total_failed_amount: number;
}

const fetchPayoutStats = async (dateFrom?: string, dateTo?: string) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  
  const response = await fetch(`/api/v1/academy/my-payouts/stats?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  return data.data;
};
```

---

### 4. Download Payout Invoice
**GET** `/academy/my-payouts/:id/invoice`

Download payout invoice as PDF.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Payout ID |

#### Response
- Content-Type: `application/pdf`
- Binary PDF file

#### React/TypeScript Example
```typescript
const downloadInvoice = async (payoutId: string) => {
  const response = await fetch(`/api/v1/academy/my-payouts/${payoutId}/invoice`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to download invoice');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payout-invoice-${payoutId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

---

## Status Values

### Payout Status
- `pending` - Payout created, waiting for admin to initiate transfer
- `processing` - Transfer initiated, waiting for Razorpay to process
- `completed` - Transfer successful
- `failed` - Transfer failed
- `cancelled` - Payout cancelled by admin
- `refunded` - Payout refunded (booking refunded)

### Booking Payout Status
- `not_initiated` - Payout not yet created
- `pending` - Payout created, waiting for transfer
- `processing` - Transfer initiated
- `completed` - Transfer successful
- `failed` - Transfer failed
- `cancelled` - Payout cancelled
- `refunded` - Payout refunded

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "data": null,
  "message": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "data": null,
  "message": "Payout not found"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "data": null,
  "message": "Internal server error"
}
```

---

## Complete React Component Example

```typescript
import React, { useState, useEffect } from 'react';

interface Payout {
  id: string;
  booking_id: string | null;
  payout_amount: number;
  currency: string;
  status: string;
  payout_status: string;
  students: string[];
}

const PayoutList: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPayouts();
  }, [page]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/academy/my-payouts?page=${page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (data.statusCode === 200) {
        setPayouts(data.data.data);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      processing: 'blue',
      completed: 'green',
      failed: 'red',
      cancelled: 'gray',
      refunded: 'orange',
    };
    return colors[status] || 'gray';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>My Payouts</h1>
      
      <table>
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Students</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id}>
              <td>{payout.booking_id || 'N/A'}</td>
              <td>{formatCurrency(payout.payout_amount, payout.currency)}</td>
              <td>
                <span style={{ color: getStatusColor(payout.status) }}>
                  {payout.status}
                </span>
              </td>
              <td>{payout.students.join(', ')}</td>
              <td>
                <a href={`/payouts/${payout.id}`}>View Details</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button 
          disabled={page === 1} 
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          disabled={page === totalPages} 
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PayoutList;
```

---

## Best Practices

1. **Error Handling**: Always handle errors gracefully and show user-friendly messages
2. **Loading States**: Show loading indicators while fetching data
3. **Pagination**: Implement proper pagination controls
4. **Currency Formatting**: Use `Intl.NumberFormat` for proper currency display
5. **Status Badges**: Use color-coded badges for payout statuses
6. **Date Formatting**: Format dates in user-friendly format (e.g., "Jan 15, 2024")
7. **Token Management**: Store access token securely and refresh when expired
8. **Caching**: Consider caching payout list data for better performance

---

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/academy/my-payouts` | GET | Get payouts list |
| `/academy/my-payouts/:id` | GET | Get payout details |
| `/academy/my-payouts/stats` | GET | Get payout statistics |
| `/academy/my-payouts/:id/invoice` | GET | Download invoice PDF |

---

## Support

For issues or questions, contact the backend team or refer to the main API documentation.
