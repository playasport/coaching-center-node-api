# Admin Batch Management & Fee Configuration API Documentation

## Overview

This document provides comprehensive API documentation for Admin Batch Management and Fee Configuration endpoints. These APIs allow administrators to manage batches (training sessions) and configure fee structures for coaching centers.

**Base URL**: `/api/v1`

**Authentication**: All endpoints require Bearer token authentication and admin role.

---

## Table of Contents

1. [Batch Management APIs](#batch-management-apis)
   - [Create Batch](#1-create-batch)
   - [Get All Batches](#2-get-all-batches)
   - [Get Batch by ID](#3-get-batch-by-id)
   - [Get Batches by User ID](#4-get-batches-by-user-id)
   - [Get Batches by Center ID](#5-get-batches-by-center-id)
   - [Update Batch](#6-update-batch)
   - [Toggle Batch Status](#7-toggle-batch-status)
   - [Delete Batch](#8-delete-batch)

2. [Fee Configuration APIs](#fee-configuration-apis)
   - [Get All Fee Types](#1-get-all-fee-types)
   - [Get Fee Type Form Structure](#2-get-fee-type-form-structure)

---

## Batch Management APIs

### Authentication & Permissions

All batch management endpoints require:
- **Authentication**: Bearer token in `Authorization` header
- **Role**: Admin role (`super_admin` or `admin`)
- **Permissions**: 
  - `batch:create` - For POST endpoints
  - `batch:view` - For GET endpoints
  - `batch:update` - For PATCH endpoints
  - `batch:delete` - For DELETE endpoints

---

### 1. Create Batch

Create a new batch for any coaching center. The `userId` is automatically extracted from the center.

**Endpoint**: `POST /admin/batches`

**Permission Required**: `batch:create`

#### Request Body

All fields are required except where noted.

```json
{
  "name": "Morning Cricket Batch",
  "sportId": "507f1f77bcf86cd799439011",
  "centerId": "507f1f77bcf86cd799439011",
  "coach": "507f1f77bcf86cd799439012",
  "scheduled": {
    "start_date": "2024-12-01",
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
  "admission_fee": 5000,
  "fee_structure": {
    "fee_type": "monthly",
    "fee_configuration": {
      "base_price": 2000,
      "classes_per_week_options": [
        {
          "days_per_week": 2,
          "price": 1500
        },
        {
          "days_per_week": 3,
          "price": 2000
        }
      ]
    },
    "admission_fee": 5000
  },
  "status": "draft"
}
```

#### Field Descriptions

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | Batch name | Max 255 characters |
| `sportId` | string | Yes | Sport ObjectId | Must be valid ObjectId |
| `centerId` | string | Yes | Coaching Center ObjectId or custom ID (UUID) | The `userId` will be automatically extracted from the center |
| `coach` | string | No | Employee ObjectId (optional) | Must be valid ObjectId or null |
| `scheduled` | object | Yes | Schedule information | All fields required |
| `scheduled.start_date` | string | Yes | Start date | Format: `YYYY-MM-DD`, must be today or future |
| `scheduled.start_time` | string | Yes | Start time | Format: `HH:MM` (24-hour) |
| `scheduled.end_time` | string | Yes | End time | Format: `HH:MM` (24-hour), must be after start_time |
| `scheduled.training_days` | array | Yes | Training days | Array of: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday` (min 1) |
| `duration` | object | Yes | Duration information | All fields required |
| `duration.count` | number | Yes | Duration count | Minimum: 1, integer |
| `duration.type` | string | Yes | Duration type | Enum: `day`, `month`, `week`, `year` |
| `capacity` | object | Yes | Capacity information | `min` is required |
| `capacity.min` | number | Yes | Minimum capacity | Minimum: 1, integer |
| `capacity.max` | number | No | Maximum capacity | Minimum: 1, integer, nullable, must be >= min |
| `age` | object | Yes | Age range | All fields required |
| `age.min` | number | Yes | Minimum age | Range: 3-18, integer |
| `age.max` | number | Yes | Maximum age | Range: 3-18, integer, must be >= min |
| `admission_fee` | number | No | Admission fee | Minimum: 0, nullable |
| `fee_structure` | object | Yes | Fee structure | `fee_type` and `fee_configuration` required |
| `fee_structure.fee_type` | string | Yes | Fee type | See [Fee Types](#fee-types) |
| `fee_structure.fee_configuration` | object | Yes | Dynamic configuration | Based on `fee_type` |
| `fee_structure.admission_fee` | number | No | Admission fee in fee structure | Minimum: 0, nullable |
| `status` | string | No | Batch status | Enum: `published`, `draft`, `inactive` (default: `draft`) |

#### Request Example

```bash
curl -X POST "http://localhost:3001/api/v1/admin/batches" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Cricket Batch",
    "sportId": "507f1f77bcf86cd799439011",
    "centerId": "507f1f77bcf86cd799439011",
    "coach": "507f1f77bcf86cd799439012",
    "scheduled": {
      "start_date": "2024-12-01",
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
    "admission_fee": 5000,
    "fee_structure": {
      "fee_type": "monthly",
      "fee_configuration": {
        "base_price": 2000,
        "classes_per_week_options": [
          {
            "days_per_week": 2,
            "price": 1500
          },
          {
            "days_per_week": 3,
            "price": 2000
          }
        ]
      },
      "admission_fee": 5000
    },
    "status": "draft"
  }'
```

#### Response Example

```json
{
  "success": true,
  "message": "Batch created successfully",
  "data": {
    "batch": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Morning Cricket Batch",
      "sport": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Cricket"
      },
      "center": {
        "id": "507f1f77bcf86cd799439013",
        "center_name": "Elite Sports Academy"
      },
      "user": {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "coach": {
        "id": "507f1f77bcf86cd799439014",
        "name": "Coach Smith"
      },
      "scheduled": {
        "start_date": "2024-12-01T00:00:00.000Z",
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
      "admission_fee": 5000,
      "fee_structure": {
        "fee_type": "monthly",
        "fee_configuration": {
          "base_price": 2000,
          "classes_per_week_options": [
            {
              "days_per_week": 2,
              "price": 1500
            },
            {
              "days_per_week": 3,
              "price": 2000
            }
          ]
        },
        "admission_fee": 5000
      },
      "status": "draft",
      "is_active": true,
      "createdAt": "2024-11-15T10:00:00.000Z",
      "updatedAt": "2024-11-15T10:00:00.000Z"
    }
  }
}
```

#### Response Status Codes

- `201` - Success
- `400` - Validation error or invalid data
- `403` - Forbidden (Insufficient permissions)
- `404` - Sport, center, or coach not found
- `401` - Unauthorized (Invalid or missing token)

**Note**: The `userId` is automatically extracted from the `centerId`. You don't need to provide it in the request body.

---

### 2. Get All Batches

Retrieve a paginated list of all batches with optional filters.

**Endpoint**: `GET /admin/batches`

**Permission Required**: `batch:view`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (default: 1) | `1` |
| `limit` | integer | No | Records per page (default: 10, max: 100) | `10` |
| `userId` | string | No | Filter by Academy owner ID (UUID) | `f316a86c-2909-4d32-8983-eb225c715bcb` |
| `centerId` | string | No | Filter by Coaching Center ID | `507f1f77bcf86cd799439011` |
| `sportId` | string | No | Filter by Sport ID | `507f1f77bcf86cd799439011` |
| `status` | string | No | Filter by batch status: `published`, `draft`, `inactive` | `published` |
| `isActive` | string | No | Filter by active status: `true`, `false` | `true` |
| `search` | string | No | Search by batch name | `Morning` |
| `sortBy` | string | No | Field to sort by (default: `createdAt`) | `name` |
| `sortOrder` | string | No | Sort order: `asc`, `desc` (default: `desc`) | `desc` |

#### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/batches?page=1&limit=10&status=published&isActive=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

```json
{
  "success": true,
  "message": "Batches retrieved successfully",
  "data": {
    "batches": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Morning Cricket Batch",
        "sport": {
          "id": "507f1f77bcf86cd799439012",
          "name": "Cricket"
        },
        "center": {
          "id": "507f1f77bcf86cd799439013",
          "center_name": "Elite Sports Academy"
        },
        "user": {
          "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "coach": {
          "id": "507f1f77bcf86cd799439014",
          "name": "Coach Smith"
        },
        "scheduled": {
          "start_date": "2024-12-01T00:00:00.000Z",
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
        "admission_fee": 5000,
        "fee_structure": {
          "fee_type": "monthly",
          "fee_configuration": {
            "base_price": 2000,
            "classes_per_week_options": [
              {
                "days_per_week": 2,
                "price": 1500
              },
              {
                "days_per_week": 3,
                "price": 2000
              }
            ]
          },
          "admission_fee": 5000
        },
        "status": "published",
        "is_active": true,
        "createdAt": "2024-11-15T10:00:00.000Z",
        "updatedAt": "2024-11-20T15:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Response Status Codes

- `200` - Success
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

### 3. Get Batch by ID

Retrieve a specific batch by its ID.

**Endpoint**: `GET /admin/batches/:id`

**Permission Required**: `batch:view`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | Yes | Batch ID (MongoDB ObjectId) | `507f1f77bcf86cd799439011` |

#### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/batches/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

```json
{
  "success": true,
  "message": "Batch retrieved successfully",
  "data": {
    "batch": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Morning Cricket Batch",
      "sport": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Cricket"
      },
      "center": {
        "id": "507f1f77bcf86cd799439013",
        "center_name": "Elite Sports Academy"
      },
      "user": {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "coach": {
        "id": "507f1f77bcf86cd799439014",
        "name": "Coach Smith"
      },
      "scheduled": {
        "start_date": "2024-12-01T00:00:00.000Z",
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
      "admission_fee": 5000,
      "fee_structure": {
        "fee_type": "monthly",
        "fee_configuration": {
          "base_price": 2000,
          "classes_per_week_options": [
            {
              "days_per_week": 2,
              "price": 1500
            },
            {
              "days_per_week": 3,
              "price": 2000
            }
          ]
        },
        "admission_fee": 5000
      },
      "status": "published",
      "is_active": true,
      "createdAt": "2024-11-15T10:00:00.000Z",
      "updatedAt": "2024-11-20T15:30:00.000Z"
    }
  }
}
```

#### Response Status Codes

- `200` - Success
- `404` - Batch not found
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

### 4. Get Batches by User ID

Retrieve all batches belonging to a specific academy user.

**Endpoint**: `GET /admin/batches/user/:userId`

**Permission Required**: `batch:view`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `userId` | string | Yes | User ID (UUID) | `f316a86c-2909-4d32-8983-eb225c715bcb` |

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (default: 1) | `1` |
| `limit` | integer | No | Records per page (default: 10) | `10` |
| `sortBy` | string | No | Field to sort by (default: `createdAt`) | `name` |
| `sortOrder` | string | No | Sort order: `asc`, `desc` (default: `desc`) | `desc` |

#### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/batches/user/f316a86c-2909-4d32-8983-eb225c715bcb?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

Same structure as [Get All Batches](#1-get-all-batches) response.

#### Response Status Codes

- `200` - Success
- `404` - User not found
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

### 5. Get Batches by Center ID

Retrieve all batches for a specific coaching center.

**Endpoint**: `GET /admin/batches/center/:centerId`

**Permission Required**: `batch:view`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `centerId` | string | Yes | Coaching Center ID | `507f1f77bcf86cd799439011` |

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (default: 1) | `1` |
| `limit` | integer | No | Records per page (default: 10) | `10` |
| `sortBy` | string | No | Field to sort by (default: `createdAt`) | `name` |
| `sortOrder` | string | No | Sort order: `asc`, `desc` (default: `desc`) | `desc` |

#### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/batches/center/507f1f77bcf86cd799439011?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

Same structure as [Get All Batches](#1-get-all-batches) response.

#### Response Status Codes

- `200` - Success
- `404` - Center not found
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

### 6. Update Batch

Update a batch. All fields are optional.

**Endpoint**: `PATCH /admin/batches/:id`

**Permission Required**: `batch:update`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | Yes | Batch ID | `507f1f77bcf86cd799439011` |

#### Request Body

All fields are optional. If a nested object is provided, all its required fields must be included.

```json
{
  "name": "Updated Morning Batch",
  "sportId": "507f1f77bcf86cd799439011",
  "centerId": "507f1f77bcf86cd799439011",
  "coach": "507f1f77bcf86cd799439012",
  "scheduled": {
    "start_date": "2024-12-01",
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
  "admission_fee": 5000,
  "fee_structure": {
    "fee_type": "monthly",
    "fee_configuration": {
      "base_price": 2000,
      "classes_per_week_options": [
        {
          "days_per_week": 2,
          "price": 1500
        },
        {
          "days_per_week": 3,
          "price": 2000
        }
      ]
    },
    "admission_fee": 5000
  },
  "status": "published"
}
```

#### Field Descriptions

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `name` | string | No | Batch name | - |
| `sportId` | string | No | Sport ObjectId | Must be valid ObjectId |
| `centerId` | string | No | Coaching Center ObjectId or custom ID | - |
| `coach` | string | No | Employee ObjectId (optional) | Must be valid ObjectId or null |
| `scheduled` | object | No | Schedule information | If provided, all fields required |
| `scheduled.start_date` | string | Conditional | Start date | Format: `YYYY-MM-DD` |
| `scheduled.start_time` | string | Conditional | Start time | Format: `HH:MM` (24-hour) |
| `scheduled.end_time` | string | Conditional | End time | Format: `HH:MM` (24-hour) |
| `scheduled.training_days` | array | Conditional | Training days | Array of: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday` (min 1) |
| `duration` | object | No | Duration information | If provided, all fields required |
| `duration.count` | number | Conditional | Duration count | Minimum: 1 |
| `duration.type` | string | Conditional | Duration type | Enum: `day`, `month`, `week`, `year` |
| `capacity` | object | No | Capacity information | If provided, `min` is required |
| `capacity.min` | number | Conditional | Minimum capacity | Minimum: 1 |
| `capacity.max` | number | No | Maximum capacity | Minimum: 1, nullable |
| `age` | object | No | Age range | If provided, all fields required |
| `age.min` | number | Conditional | Minimum age | Range: 3-18 |
| `age.max` | number | Conditional | Maximum age | Range: 3-18 |
| `admission_fee` | number | No | Admission fee | Minimum: 0, nullable |
| `fee_structure` | object | No | Fee structure | If provided, `fee_type` and `fee_configuration` required |
| `fee_structure.fee_type` | string | Conditional | Fee type | See [Fee Types](#fee-types). Use `GET /admin/fee-type-config` to get available types |
| `fee_structure.fee_configuration` | object | Conditional | Dynamic configuration | Based on `fee_type`. Use `GET /admin/fee-type-config/:feeType` to get form structure |
| `fee_structure.admission_fee` | number | No | Admission fee in fee structure | Minimum: 0, nullable |
| `status` | string | No | Batch status | Enum: `published`, `draft`, `inactive` |

#### Request Example - Simple Update

```bash
curl -X PATCH "http://localhost:3001/api/v1/admin/batches/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Batch Name",
    "status": "published"
  }'
```

#### Request Example - Complete Update

```bash
curl -X PATCH "http://localhost:3001/api/v1/admin/batches/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Morning Batch",
    "sportId": "507f1f77bcf86cd799439011",
    "centerId": "507f1f77bcf86cd799439011",
    "coach": "507f1f77bcf86cd799439012",
    "scheduled": {
      "start_date": "2024-12-01",
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
    "admission_fee": 5000,
    "fee_structure": {
      "fee_type": "monthly",
      "fee_configuration": {
        "base_price": 2000,
        "classes_per_week_options": [
          {
            "days_per_week": 2,
            "price": 1500
          },
          {
            "days_per_week": 3,
            "price": 2000
          }
        ]
      },
      "admission_fee": 5000
    },
    "status": "published"
  }'
```

#### Response Example

```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {
    "batch": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Updated Morning Batch",
      "sport": {
        "id": "507f1f77bcf86cd799439012",
        "name": "Cricket"
      },
      "center": {
        "id": "507f1f77bcf86cd799439013",
        "center_name": "Elite Sports Academy"
      },
      "user": {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "coach": {
        "id": "507f1f77bcf86cd799439014",
        "name": "Coach Smith"
      },
      "scheduled": {
        "start_date": "2024-12-01T00:00:00.000Z",
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
      "admission_fee": 5000,
      "fee_structure": {
        "fee_type": "monthly",
        "fee_configuration": {
          "base_price": 2000,
          "classes_per_week_options": [
            {
              "days_per_week": 2,
              "price": 1500
            },
            {
              "days_per_week": 3,
              "price": 2000
            }
          ]
        },
        "admission_fee": 5000
      },
      "status": "published",
      "is_active": true,
      "createdAt": "2024-11-15T10:00:00.000Z",
      "updatedAt": "2024-11-20T15:30:00.000Z"
    }
  }
}
```

#### Response Status Codes

- `200` - Success
- `400` - Validation error or invalid data
- `404` - Batch not found
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

### 7. Toggle Batch Status

Activate or deactivate a batch.

**Endpoint**: `PATCH /admin/batches/:id/toggle-status`

**Permission Required**: `batch:update`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | Yes | Batch ID | `507f1f77bcf86cd799439011` |

#### Request Example

```bash
curl -X PATCH "http://localhost:3001/api/v1/admin/batches/507f1f77bcf86cd799439011/toggle-status" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

```json
{
  "success": true,
  "message": "Batch status toggled successfully",
  "data": {
    "batch": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Morning Cricket Batch",
      "is_active": false,
      "status": "published",
      "updatedAt": "2024-11-20T16:00:00.000Z"
    }
  }
}
```

#### Response Status Codes

- `200` - Success
- `404` - Batch not found
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

### 8. Delete Batch

Delete a batch (soft delete).

**Endpoint**: `DELETE /admin/batches/:id`

**Permission Required**: `batch:delete`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | Yes | Batch ID | `507f1f77bcf86cd799439011` |

#### Request Example

```bash
curl -X DELETE "http://localhost:3001/api/v1/admin/batches/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

```json
{
  "success": true,
  "message": "Batch deleted successfully",
  "data": null
}
```

#### Response Status Codes

- `200` - Success
- `404` - Batch not found
- `403` - Forbidden (Insufficient permissions)
- `401` - Unauthorized (Invalid or missing token)

---

## Fee Configuration APIs

### Authentication & Permissions

Fee configuration endpoints require:
- **Authentication**: Bearer token in `Authorization` header
- **Role**: Admin role (`super_admin` or `admin`)
- **Permissions**: 
  - `batch:view` - For GET endpoints (same permission as batch viewing)

**Note**: Admin fee configuration endpoints are available at `/admin/fee-type-config`. These are similar to the academy endpoints but accessible to admin users.

---

### 1. Get All Fee Types

Retrieve all available fee types with their labels and descriptions.

**Endpoint**: `GET /admin/fee-type-config`

**Permission Required**: `batch:view`

#### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/fee-type-config" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

```json
{
  "success": true,
  "message": "Fee types retrieved successfully",
  "data": {
    "feeTypes": [
      {
        "value": "monthly",
        "label": "Monthly Fee",
        "description": "Fee charged on a monthly basis"
      },
      {
        "value": "daily",
        "label": "Daily Fee",
        "description": "Fee charged per day"
      },
      {
        "value": "weekly",
        "label": "Weekly Fee",
        "description": "Fee charged on a weekly basis"
      },
      {
        "value": "hourly",
        "label": "Hourly Fee",
        "description": "Fee charged per hour"
      },
      {
        "value": "per_batch",
        "label": "Per Batch Fee",
        "description": "Fee charged per batch"
      },
      {
        "value": "per_session",
        "label": "Per Session Fee",
        "description": "Fee charged per session"
      },
      {
        "value": "age_based",
        "label": "Age-Based Fee",
        "description": "Fee varies based on age group"
      },
      {
        "value": "coach_license_based",
        "label": "Coach License Based Fee",
        "description": "Fee varies based on coach license level"
      },
      {
        "value": "player_level_based",
        "label": "Player Level Based Fee",
        "description": "Fee varies based on player skill level"
      },
      {
        "value": "seasonal",
        "label": "Seasonal Fee",
        "description": "Fee varies by season"
      },
      {
        "value": "package_based",
        "label": "Package Based Fee",
        "description": "Fee based on selected package"
      },
      {
        "value": "group_discount",
        "label": "Group Discount Fee",
        "description": "Fee with group discount applied"
      },
      {
        "value": "advance_booking",
        "label": "Advance Booking Fee",
        "description": "Fee for advance bookings"
      },
      {
        "value": "weekend_pricing",
        "label": "Weekend Pricing",
        "description": "Different pricing for weekends"
      },
      {
        "value": "peak_hours",
        "label": "Peak Hours Pricing",
        "description": "Different pricing for peak hours"
      },
      {
        "value": "membership_based",
        "label": "Membership Based Fee",
        "description": "Fee based on membership type"
      },
      {
        "value": "custom",
        "label": "Custom Fee",
        "description": "Custom fee structure"
      }
    ]
  }
}
```

#### Response Status Codes

- `200` - Success
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Admin role required or insufficient permissions)

---

### 2. Get Fee Type Form Structure

Retrieve the form structure (fields) required for a specific fee type. This helps in building dynamic forms for fee configuration.

**Endpoint**: `GET /admin/fee-type-config/:feeType`

**Permission Required**: `batch:view`

#### Path Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `feeType` | string | Yes | Fee type | `monthly` |

#### Available Fee Types

- `monthly`
- `daily`
- `weekly`
- `hourly`
- `per_batch`
- `per_session`
- `age_based`
- `coach_license_based`
- `player_level_based`
- `seasonal`
- `package_based`
- `group_discount`
- `advance_booking`
- `weekend_pricing`
- `peak_hours`
- `membership_based`
- `custom`

#### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/fee-type-config/monthly" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example

```json
{
  "success": true,
  "message": "Fee type form structure retrieved successfully",
  "data": {
    "config": {
      "fee_type": "monthly",
      "label": "Monthly Fee",
      "description": "Fee charged on a monthly basis",
      "formFields": [
        {
          "name": "base_price",
          "label": "Base Price",
          "type": "number",
          "required": true,
          "placeholder": "Enter base price",
          "min": 0,
          "step": 0.01,
          "description": "Base monthly fee amount"
        },
        {
          "name": "classes_per_week_options",
          "label": "Classes Per Week Options",
          "type": "array",
          "required": false,
          "description": "Different pricing options based on classes per week",
          "fields": [
            {
              "name": "days_per_week",
              "label": "Days Per Week",
              "type": "number",
              "required": true,
              "min": 1,
              "max": 7
            },
            {
              "name": "price",
              "label": "Price",
              "type": "number",
              "required": true,
              "min": 0,
              "step": 0.01
            }
          ]
        },
        {
          "name": "admission_fee",
          "label": "Admission Fee",
          "type": "number",
          "required": false,
          "placeholder": "Enter admission fee (optional)",
          "min": 0,
          "step": 0.01,
          "description": "One-time admission fee"
        }
      ]
    }
  }
}
```

#### Form Field Types

The `formFields` array contains field definitions with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Field name (used as key in fee_configuration) |
| `label` | string | Display label for the field |
| `type` | string | Field type: `text`, `number`, `select`, `array`, `object`, `date`, `time`, `boolean` |
| `required` | boolean | Whether the field is required |
| `placeholder` | string | Placeholder text (optional) |
| `min` | number | Minimum value (for number fields) |
| `max` | number | Maximum value (for number fields) |
| `step` | number | Step value (for number fields) |
| `options` | array | Options for select fields: `[{value: string|number, label: string}]` |
| `fields` | array | Nested fields (for array/object types) |
| `description` | string | Field description (optional) |

#### Response Status Codes

- `200` - Success
- `404` - Fee type not found
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Admin role required or insufficient permissions)

---

## Fee Types

The following fee types are available in the system:

1. **monthly** - Monthly Fee
2. **daily** - Daily Fee
3. **weekly** - Weekly Fee
4. **hourly** - Hourly Fee
5. **per_batch** - Per Batch Fee
6. **per_session** - Per Session Fee
7. **age_based** - Age-Based Fee
8. **coach_license_based** - Coach License Based Fee
9. **player_level_based** - Player Level Based Fee
10. **seasonal** - Seasonal Fee
11. **package_based** - Package Based Fee
12. **group_discount** - Group Discount Fee
13. **advance_booking** - Advance Booking Fee
14. **weekend_pricing** - Weekend Pricing
15. **peak_hours** - Peak Hours Pricing
16. **membership_based** - Membership Based Fee
17. **custom** - Custom Fee

Each fee type has its own form structure that defines the required fields for `fee_configuration` in the batch's `fee_structure`.

---

## Common Response Structure

All API responses follow this structure:

```json
{
  "success": boolean,
  "message": string,
  "data": object | null
}
```

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error message for this field"
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `400` | Bad Request - Validation error or invalid data |
| `401` | Unauthorized - Invalid or missing authentication token |
| `403` | Forbidden - Insufficient permissions or role not allowed |
| `404` | Not Found - Resource not found |
| `500` | Internal Server Error - Server error |

---

## Notes

1. **Batch Status Values**:
   - `published` - Batch is published and visible
   - `draft` - Batch is in draft mode
   - `inactive` - Batch is inactive

2. **Training Days**: Must be lowercase day names: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

3. **Time Format**: All times must be in 24-hour format: `HH:MM` (e.g., `09:00`, `18:30`)

4. **Date Format**: All dates must be in ISO 8601 format: `YYYY-MM-DD` (e.g., `2024-12-01`)

5. **Fee Configuration**: The `fee_configuration` object structure varies based on the `fee_type`. Use the [Get Fee Type Form Structure](#2-get-fee-type-form-structure) endpoint to get the required fields for each fee type.

6. **Soft Delete**: Batch deletion is a soft delete - the batch is marked as deleted but not removed from the database.

7. **Toggle Status**: The toggle status endpoint toggles the `is_active` field, not the `status` field.

---

## Integration Examples

### Example: Creating a Batch with Monthly Fee Structure

1. First, get the fee type form structure:

```bash
GET /admin/fee-type-config/monthly
```

2. Use the form structure to build the fee_configuration:

```json
{
  "fee_structure": {
    "fee_type": "monthly",
    "fee_configuration": {
      "base_price": 2000,
      "classes_per_week_options": [
        {
          "days_per_week": 2,
          "price": 1500
        },
        {
          "days_per_week": 3,
          "price": 2000
        }
      ]
    },
    "admission_fee": 5000
  }
}
```

3. Include this in the batch update request:

```bash
PATCH /admin/batches/:id
```

---

## Support

For issues or questions regarding these APIs, please contact the development team or refer to the main API documentation.

