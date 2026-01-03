# Batch Management - Frontend API Integration Guide

This guide provides complete frontend integration examples for batch management operations in the PlayASport admin panel.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.playasport.in/api/v1
```

## Authentication

All batch endpoints require admin authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-admin-jwt-token>
```

---

## Table of Contents

1. [Create Batch](#1-create-batch)
2. [Get All Batches](#2-get-all-batches)
3. [Get Batch by ID](#3-get-batch-by-id)
4. [Get Batches by User ID](#4-get-batches-by-user-id)
5. [Get Batches by Center ID](#5-get-batches-by-center-id)
6. [Update Batch](#6-update-batch)
7. [Toggle Batch Status](#7-toggle-batch-status)
8. [Delete Batch](#8-delete-batch)
9. [Common Patterns](#9-common-patterns)
10. [Error Handling](#10-error-handling)

---

## 1. Create Batch

### Endpoint
```
POST /admin/batches
```

### Request Payload

#### With Common Timing (Same time for all days)

```json
{
  "name": "Morning Yoga Batch",
  "description": "Early morning yoga sessions for all levels",
  "sportId": "507f1f77bcf86cd799439011",
  "centerId": "507f1f77bcf86cd799439011",
  "coach": "507f1f77bcf86cd799439012",
  "gender": ["male", "female"],
  "certificate_issued": true,
  "scheduled": {
    "start_date": "2024-04-01",
    "end_date": "2024-06-30",
    "start_time": "07:00",
    "end_time": "08:30",
    "training_days": ["monday", "wednesday", "friday"]
  },
  "duration": {
    "count": 3,
    "type": "month"
  },
  "capacity": {
    "min": 10,
    "max": 25
  },
  "age": {
    "min": 12,
    "max": 18
  },
  "admission_fee": 500,
  "base_price": 3000,
  "discounted_price": 2500,
  "status": "published"
}
```

#### With Individual Timing (Different time for each day)

```json
{
  "name": "Flexible Training Batch",
  "description": "Training with different timings for each day",
  "sportId": "507f1f77bcf86cd799439011",
  "centerId": "507f1f77bcf86cd799439011",
  "gender": ["male", "female"],
  "certificate_issued": false,
  "scheduled": {
    "start_date": "2024-04-01",
    "individual_timings": [
      {
        "day": "monday",
        "start_time": "09:00",
        "end_time": "11:00"
      },
      {
        "day": "wednesday",
        "start_time": "14:00",
        "end_time": "16:00"
      },
      {
        "day": "friday",
        "start_time": "17:00",
        "end_time": "19:00"
      }
    ],
    "training_days": ["monday", "wednesday", "friday"]
  },
  "duration": {
    "count": 2,
    "type": "month"
  },
  "capacity": {
    "min": 15,
    "max": 30
  },
  "age": {
    "min": 10,
    "max": 16
  },
  "base_price": 5000,
  "status": "draft"
}
```

#### With Day-based Duration (Must select exactly duration.count days)

```json
{
  "name": "Weekend Special",
  "description": "2-day weekend training program",
  "sportId": "507f1f77bcf86cd799439011",
  "centerId": "507f1f77bcf86cd799439011",
  "gender": ["male", "female", "others"],
  "certificate_issued": true,
  "scheduled": {
    "start_date": "2024-04-06",
    "start_time": "10:00",
    "end_time": "12:00",
    "training_days": ["saturday", "sunday"]
  },
  "duration": {
    "count": 2,
    "type": "day"
  },
  "capacity": {
    "min": 8,
    "max": 16
  },
  "age": {
    "min": 8,
    "max": 14
  },
  "base_price": 2000,
  "status": "published"
}
```

### Frontend Implementation (React/TypeScript)

```typescript
interface BatchCreatePayload {
  name: string;
  description?: string;
  sportId: string;
  centerId: string;
  coach?: string;
  gender: ('male' | 'female' | 'others')[];
  certificate_issued: boolean;
  scheduled: {
    start_date: string; // YYYY-MM-DD
    end_date?: string; // YYYY-MM-DD
    start_time?: string; // HH:mm (for common timing)
    end_time?: string; // HH:mm (for common timing)
    individual_timings?: Array<{
      day: string;
      start_time: string; // HH:mm
      end_time: string; // HH:mm
    }>;
    training_days: string[];
  };
  duration: {
    count: number; // 1-1000
    type: 'day' | 'week' | 'month' | 'year';
  };
  capacity: {
    min: number; // 1-1000
    max?: number; // 1-1000
  };
  age: {
    min: number; // 3-18
    max: number; // 3-18
  };
  admission_fee?: number; // 0 to 10000000
  base_price: number; // 0 to 10000000
  discounted_price?: number; // 0 to 10000000, must be <= base_price
  status?: 'draft' | 'published' | 'inactive';
}

const createBatch = async (payload: BatchCreatePayload) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const response = await fetch(`${API_BASE_URL}/admin/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create batch');
    }

    return data;
  } catch (error) {
    console.error('Error creating batch:', error);
    throw error;
  }
};
```

### Success Response (201)

```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "batch": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Morning Yoga Batch",
      "description": "Early morning yoga sessions for all levels",
      "sport": {
        "_id": "507f1f77bcf86cd799439011",
        "custom_id": "sport-123",
        "name": "Yoga",
        "logo": "https://example.com/yoga-logo.png"
      },
      "center": {
        "_id": "507f1f77bcf86cd799439011",
        "center_name": "Elite Sports Academy",
        "email": "contact@elitesports.com",
        "mobile_number": "+919876543210"
      },
      "coach": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Doe",
        "mobileNo": "+919876543211",
        "email": "john@example.com"
      },
      "gender": ["male", "female"],
      "certificate_issued": true,
      "scheduled": {
        "start_date": "2024-04-01T00:00:00.000Z",
        "end_date": "2024-06-30T00:00:00.000Z",
        "start_time": "07:00",
        "end_time": "08:30",
        "training_days": ["monday", "wednesday", "friday"]
      },
      "duration": {
        "count": 3,
        "type": "month"
      },
      "capacity": {
        "min": 10,
        "max": 25
      },
      "age": {
        "min": 12,
        "max": 18
      },
      "admission_fee": 500,
      "base_price": 3000,
      "discounted_price": 2500,
      "status": "published",
      "is_active": true,
      "is_deleted": false,
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-03-15T10:30:00.000Z"
    }
  }
}
```

### Error Response (400)

#### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Batch name is required",
    "base_price": "Base price must be a valid positive number",
    "scheduled.training_days": "When duration type is 'day', the number of training days must exactly match the duration count"
  }
}
```

#### Active Batch Restriction Error

```json
{
  "success": false,
  "message": "Cannot update batch details while batch is active. Please deactivate the batch first by setting is_active to false."
}
```

#### Status Restriction Error

```json
{
  "success": false,
  "message": "Cannot change status from 'published' to 'draft'. Published batches can only be changed to 'inactive'."
}
```

---

## 2. Get All Batches

### Endpoint
```
GET /admin/batches
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 10, max: 100) | `20` |
| `userId` | string | Filter by Academy owner ID | `f316a86c-2909-4d32-8983-eb225c715bcb` |
| `centerId` | string | Filter by Coaching Center ID | `507f1f77bcf86cd799439011` |
| `sportId` | string | Filter by Sport ID | `507f1f77bcf86cd799439011` |
| `status` | string | Filter by status | `published`, `draft`, or `inactive` |
| `isActive` | string | Filter by active status | `true` or `false` |
| `search` | string | Search by batch name | `Morning` |
| `sortBy` | string | Sort field (default: createdAt) | `name`, `createdAt`, `base_price` |
| `sortOrder` | string | Sort order (default: desc) | `asc` or `desc` |

### Frontend Implementation

```typescript
interface GetBatchesParams {
  page?: number;
  limit?: number;
  userId?: string;
  centerId?: string;
  sportId?: string;
  status?: 'published' | 'draft' | 'inactive';
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const getAllBatches = async (params: GetBatchesParams = {}) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.centerId) queryParams.append('centerId', params.centerId);
    if (params.sportId) queryParams.append('sportId', params.sportId);
    if (params.status) queryParams.append('status', params.status);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/admin/batches?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch batches');
    }

    return data;
  } catch (error) {
    console.error('Error fetching batches:', error);
    throw error;
  }
};
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Batches retrieved successfully",
  "data": {
    "batches": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Morning Yoga Batch",
        "description": "Early morning yoga sessions",
        "sport": {
          "_id": "507f1f77bcf86cd799439011",
          "custom_id": "sport-123",
          "name": "Yoga",
          "logo": "https://example.com/yoga-logo.png"
        },
        "center": {
          "_id": "507f1f77bcf86cd799439011",
          "center_name": "Elite Sports Academy",
          "email": "contact@elitesports.com",
          "mobile_number": "+919876543210"
        },
        "coach": {
          "_id": "507f1f77bcf86cd799439012",
          "fullName": "John Doe",
          "mobileNo": "+919876543211",
          "email": "john@example.com"
        },
        "gender": ["male", "female"],
        "certificate_issued": true,
        "scheduled": {
          "start_date": "2024-04-01T00:00:00.000Z",
          "end_date": "2024-06-30T00:00:00.000Z",
          "start_time": "07:00",
          "end_time": "08:30",
          "training_days": ["monday", "wednesday", "friday"]
        },
        "duration": {
          "count": 3,
          "type": "month"
        },
        "capacity": {
          "min": 10,
          "max": 25
        },
        "age": {
          "min": 12,
          "max": 18
        },
        "admission_fee": 500,
        "base_price": 3000,
        "discounted_price": 2500,
        "status": "published",
        "is_active": true,
        "createdAt": "2024-03-15T10:30:00.000Z",
        "updatedAt": "2024-03-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

## 3. Get Batch by ID

### Endpoint
```
GET /admin/batches/:id
```

### Frontend Implementation

```typescript
const getBatchById = async (batchId: string) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const response = await fetch(`${API_BASE_URL}/admin/batches/${batchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch batch');
    }

    return data;
  } catch (error) {
    console.error('Error fetching batch:', error);
    throw error;
  }
};
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Batch retrieved successfully",
  "data": {
    "batch": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Morning Yoga Batch",
      "description": "Early morning yoga sessions for all levels",
      "sport": {
        "_id": "507f1f77bcf86cd799439011",
        "custom_id": "sport-123",
        "name": "Yoga",
        "logo": "https://example.com/yoga-logo.png"
      },
      "center": {
        "_id": "507f1f77bcf86cd799439011",
        "center_name": "Elite Sports Academy",
        "email": "contact@elitesports.com",
        "mobile_number": "+919876543210"
      },
      "coach": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Doe",
        "mobileNo": "+919876543211",
        "email": "john@example.com"
      },
      "gender": ["male", "female"],
      "certificate_issued": true,
      "scheduled": {
        "start_date": "2024-04-01T00:00:00.000Z",
        "end_date": "2024-06-30T00:00:00.000Z",
        "start_time": "07:00",
        "end_time": "08:30",
        "training_days": ["monday", "wednesday", "friday"]
      },
      "duration": {
        "count": 3,
        "type": "month"
      },
      "capacity": {
        "min": 10,
        "max": 25
      },
      "age": {
        "min": 12,
        "max": 18
      },
      "admission_fee": 500,
      "base_price": 3000,
      "discounted_price": 2500,
      "status": "published",
      "is_active": true,
      "is_deleted": false,
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-03-15T10:30:00.000Z"
    }
  }
}
```

---

## 4. Get Batches by User ID

### Endpoint
```
GET /admin/batches/user/:userId
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 10) | `20` |
| `sortBy` | string | Sort field (default: createdAt) | `name`, `createdAt` |
| `sortOrder` | string | Sort order (default: desc) | `asc` or `desc` |

### Frontend Implementation

```typescript
const getBatchesByUserId = async (
  userId: string,
  params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/admin/batches/user/${userId}?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch batches');
    }

    return data;
  } catch (error) {
    console.error('Error fetching batches by user:', error);
    throw error;
  }
};
```

---

## 5. Get Batches by Center ID

### Endpoint
```
GET /admin/batches/center/:centerId
```

### Query Parameters

Same as Get Batches by User ID.

### Frontend Implementation

```typescript
const getBatchesByCenterId = async (
  centerId: string,
  params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/admin/batches/center/${centerId}?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch batches');
    }

    return data;
  } catch (error) {
    console.error('Error fetching batches by center:', error);
    throw error;
  }
};
```

---

## 6. Update Batch

### Endpoint
```
PATCH /admin/batches/:id
```

**Important Validation Rules:**
1. **Active Batch Restriction:** If batch is active (`is_active = true`), details cannot be updated. You must first set `is_active` to `false`, then update other details.
2. **Status Restriction:** If current status is `"published"`, it cannot be changed to `"draft"` (can only change to `"inactive"`).
3. Use toggle-status endpoint to quickly toggle `is_active` without updating other fields.

### Request Payload

All fields are optional. Only include fields you want to update.

#### Simple Update (Only Top-level Fields)

```json
{
  "name": "Updated Batch Name",
  "base_price": 5500,
  "discounted_price": 5000
}
```

#### Complete Update with Nested Objects

```json
{
  "name": "Updated Morning Batch",
  "description": "Updated description",
  "gender": ["male", "female", "others"],
  "certificate_issued": true,
  "scheduled": {
    "start_date": "2024-12-01",
    "end_date": "2024-12-31",
    "start_time": "09:00",
    "end_time": "11:00",
    "training_days": ["monday", "wednesday", "friday"]
  },
  "duration": {
    "count": 3,
    "type": "month"
  },
  "capacity": {
    "min": 10,
    "max": 30
  },
  "age": {
    "min": 8,
    "max": 12
  },
  "admission_fee": 500,
  "base_price": 5000,
  "discounted_price": 4500
}
```

#### Update with Individual Timing

```json
{
  "scheduled": {
    "start_date": "2024-12-01",
    "individual_timings": [
      {
        "day": "monday",
        "start_time": "09:00",
        "end_time": "11:00"
      },
      {
        "day": "wednesday",
        "start_time": "14:00",
        "end_time": "16:00"
      }
    ],
    "training_days": ["monday", "wednesday"]
  }
}
```

#### Deactivate Batch First (Required if batch is active)

```json
{
  "is_active": false
}
```

**Note:** If batch is active, you must send this first before updating any other fields.

### Frontend Implementation

```typescript
interface BatchUpdatePayload {
  name?: string;
  description?: string;
  sportId?: string;
  centerId?: string;
  coach?: string | null;
  gender?: ('male' | 'female' | 'others')[];
  certificate_issued?: boolean;
  scheduled?: {
    start_date: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    individual_timings?: Array<{
      day: string;
      start_time: string;
      end_time: string;
    }> | null;
    training_days: string[];
  };
  duration?: {
    count: number;
    type: 'day' | 'week' | 'month' | 'year';
  };
  capacity?: {
    min: number;
    max?: number | null;
  };
  age?: {
    min: number;
    max: number;
  };
  admission_fee?: number | null;
  base_price?: number;
  discounted_price?: number | null;
  status?: 'draft' | 'published' | 'inactive';
  is_active?: boolean;
}

const updateBatch = async (batchId: string, payload: BatchUpdatePayload) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const response = await fetch(`${API_BASE_URL}/admin/batches/${batchId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update batch');
    }

    return data;
  } catch (error) {
    console.error('Error updating batch:', error);
    throw error;
  }
};
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "batch": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Updated Morning Batch",
      "description": "Updated description",
      "sport": {
        "_id": "507f1f77bcf86cd799439011",
        "custom_id": "sport-123",
        "name": "Yoga",
        "logo": "https://example.com/yoga-logo.png"
      },
      "center": {
        "_id": "507f1f77bcf86cd799439011",
        "center_name": "Elite Sports Academy",
        "email": "contact@elitesports.com",
        "mobile_number": "+919876543210"
      },
      "coach": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Doe",
        "mobileNo": "+919876543211",
        "email": "john@example.com"
      },
      "gender": ["male", "female", "others"],
      "certificate_issued": true,
      "scheduled": {
        "start_date": "2024-12-01T00:00:00.000Z",
        "end_date": "2024-12-31T00:00:00.000Z",
        "start_time": "09:00",
        "end_time": "11:00",
        "training_days": ["monday", "wednesday", "friday"]
      },
      "duration": {
        "count": 3,
        "type": "month"
      },
      "capacity": {
        "min": 10,
        "max": 30
      },
      "age": {
        "min": 8,
        "max": 12
      },
      "admission_fee": 500,
      "base_price": 5000,
      "discounted_price": 4500,
      "status": "published",
      "is_active": true,
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-12-01T15:45:00.000Z"
    }
  }
}
```

---

## 7. Toggle Batch Status

### Endpoint
```
PATCH /admin/batches/:id/toggle-status
```

This endpoint toggles the `is_active` field (not the `status` field).

### Frontend Implementation

```typescript
const toggleBatchStatus = async (batchId: string) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const response = await fetch(
      `${API_BASE_URL}/admin/batches/${batchId}/toggle-status`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to toggle batch status');
    }

    return data;
  } catch (error) {
    console.error('Error toggling batch status:', error);
    throw error;
  }
};
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Batch activated successfully",
  "data": {
    "batch": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Morning Yoga Batch",
      "is_active": true,
      // ... other batch fields
    }
  }
}
```

---

## 8. Delete Batch

### Endpoint
```
DELETE /admin/batches/:id
```

This performs a soft delete (sets `is_deleted: true`).

### Frontend Implementation

```typescript
const deleteBatch = async (batchId: string) => {
  try {
    const token = localStorage.getItem('adminAccessToken');
    const response = await fetch(`${API_BASE_URL}/admin/batches/${batchId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete batch');
    }

    return data;
  } catch (error) {
    console.error('Error deleting batch:', error);
    throw error;
  }
};
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Batch deleted successfully",
  "data": null
}
```

---

## 9. Common Patterns

### Complete React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface Batch {
  _id: string;
  name: string;
  description?: string;
  gender: string[];
  certificate_issued: boolean;
  base_price: number;
  discounted_price?: number;
  status: 'draft' | 'published' | 'inactive';
  is_active: boolean;
  // ... other fields
}

export const useBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchBatches = async (params: GetBatchesParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllBatches(params);
      setBatches(data.data.batches);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async (payload: BatchCreatePayload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await createBatch(payload);
      await fetchBatches(); // Refresh list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBatch = async (batchId: string, payload: BatchUpdatePayload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await updateBatch(batchId, payload);
      await fetchBatches(); // Refresh list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update batch');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (batchId: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteBatch(batchId);
      await fetchBatches(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete batch');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    batches,
    loading,
    error,
    pagination,
    fetchBatches,
    createBatch,
    updateBatch,
    deleteBatch,
  };
};
```

### Batch Update Validation Helper

```typescript
export const canUpdateBatch = (batch: Batch): { canUpdate: boolean; reason?: string } => {
  if (batch.is_active === true) {
    return {
      canUpdate: false,
      reason: 'Cannot update batch details while batch is active. Please deactivate the batch first by setting is_active to false.',
    };
  }
  return { canUpdate: true };
};

export const canChangeStatus = (
  currentStatus: 'draft' | 'published' | 'inactive',
  newStatus: 'draft' | 'published' | 'inactive'
): { canChange: boolean; reason?: string } => {
  if (currentStatus === 'published' && newStatus === 'draft') {
    return {
      canChange: false,
      reason: 'Cannot change status from "published" to "draft". Published batches can only be changed to "inactive".',
    };
  }
  return { canChange: true };
};
```

### Form Validation Helper

```typescript
export const validateBatchForm = (formData: BatchCreatePayload): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Name validation
  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = 'Batch name is required';
  } else if (formData.name.length > 50) {
    errors.name = 'Batch name cannot exceed 50 characters';
  }

  // Description validation
  if (formData.description && formData.description.length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters';
  }

  // Gender validation
  if (!formData.gender || formData.gender.length === 0) {
    errors.gender = 'At least one gender must be selected';
  }

  // Base price validation
  if (formData.base_price === undefined || formData.base_price < 0) {
    errors.base_price = 'Base price is required and must be >= 0';
  } else if (formData.base_price > 10000000) {
    errors.base_price = 'Base price cannot exceed ₹1 crore';
  }

  // Discounted price validation
  if (formData.discounted_price !== undefined) {
    if (formData.discounted_price < 0) {
      errors.discounted_price = 'Discounted price must be >= 0';
    } else if (formData.discounted_price > formData.base_price) {
      errors.discounted_price = 'Discounted price must be <= base price';
    }
  }

  // Scheduled validation
  if (!formData.scheduled.start_date) {
    errors['scheduled.start_date'] = 'Start date is required';
  } else {
    const startDate = new Date(formData.scheduled.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      errors['scheduled.start_date'] = 'Start date cannot be in the past';
    }
  }

  // Timing validation
  const hasCommonTiming = formData.scheduled.start_time && formData.scheduled.end_time;
  const hasIndividualTiming = formData.scheduled.individual_timings && formData.scheduled.individual_timings.length > 0;

  if (!hasCommonTiming && !hasIndividualTiming) {
    errors.scheduled = 'Either common timing or individual timing must be provided';
  }

  // Training days validation
  if (!formData.scheduled.training_days || formData.scheduled.training_days.length === 0) {
    errors['scheduled.training_days'] = 'At least one training day must be selected';
  }

  // Duration validation for day type
  if (formData.duration.type === 'day') {
    if (formData.scheduled.training_days.length !== formData.duration.count) {
      errors['scheduled.training_days'] = `When duration type is "day", must select exactly ${formData.duration.count} training days`;
    }
  }

  return errors;
};
```

---

## 10. Error Handling

### Common Error Responses

#### 400 Bad Request (Validation Error)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Batch name is required",
    "base_price": "Base price must be a valid positive number",
    "scheduled.training_days": "At least one training day must be selected"
  }
}
```

#### 400 Bad Request (Active Batch Restriction)

```json
{
  "success": false,
  "message": "Cannot update batch details while batch is active. Please deactivate the batch first by setting is_active to false."
}
```

#### 400 Bad Request (Status Restriction)

```json
{
  "success": false,
  "message": "Cannot change status from 'published' to 'draft'. Published batches can only be changed to 'inactive'."
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - Authentication required"
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Batch not found"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

### Error Handling Utility

```typescript
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    return Object.values(errors).join(', ');
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
```

---

## Important Notes

1. **Status vs is_active:**
   - `status`: Can be updated, but if current status is `"published"`, it cannot be changed to `"draft"` (can only change to `"inactive"`)
   - `is_active`: Can be toggled using the toggle-status endpoint or updated directly

2. **Active Batch Update Restriction:**
   - If `is_active = true`, batch details cannot be updated
   - You must first set `is_active: false`, then update other fields
   - This prevents accidental changes to active batches that may have bookings

2. **Timing Modes:**
   - **Common Timing**: Provide `start_time` and `end_time` at scheduled root
   - **Individual Timing**: Provide `individual_timings` array (do NOT include `start_time`/`end_time` at root)

3. **Day-based Duration:**
   - When `duration.type === "day"`, must select exactly `duration.count` training days

4. **Price Limits:**
   - All prices: Maximum ₹1 crore (10,000,000)
   - `discounted_price` must be <= `base_price`

5. **Date Format:**
   - All dates: `YYYY-MM-DD` format
   - All times: `HH:mm` format (24-hour)

6. **Gender Values:**
   - Valid values: `"male"`, `"female"`, `"others"`
   - At least one must be selected

---

## Quick Reference

| Operation | Method | Endpoint | Auth Required |
|-----------|--------|----------|---------------|
| Create Batch | POST | `/admin/batches` | Yes |
| Get All Batches | GET | `/admin/batches` | Yes |
| Get Batch by ID | GET | `/admin/batches/:id` | Yes |
| Get Batches by User | GET | `/admin/batches/user/:userId` | Yes |
| Get Batches by Center | GET | `/admin/batches/center/:centerId` | Yes |
| Update Batch | PATCH | `/admin/batches/:id` | Yes |
| Toggle Status | PATCH | `/admin/batches/:id/toggle-status` | Yes |
| Delete Batch | DELETE | `/admin/batches/:id` | Yes |

---

For more details, refer to the [Batch API Documentation](./BATCH_API_DOCUMENTATION.md).

