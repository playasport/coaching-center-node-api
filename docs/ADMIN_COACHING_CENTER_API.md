# Admin Coaching Center Management API Documentation

Complete API documentation for managing coaching centers in the admin panel, including all endpoints, request/response payloads, and examples.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
   - [Statistics](#1-get-coaching-center-statistics)
   - [List All Centers](#2-get-all-coaching-centers)
   - [Get Center by ID](#3-get-coaching-center-by-id)
   - [Get Centers by User ID](#4-get-coaching-centers-by-user-id)
   - [Create Center](#5-create-coaching-center)
   - [Update Center](#6-update-coaching-center)
   - [Toggle Status](#7-toggle-coaching-center-status)
   - [Delete Center](#8-delete-coaching-center)
   - [Remove Media](#9-remove-media-from-coaching-center)
   - [Upload Media](#10-upload-media-files)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Overview

The Admin Coaching Center Management API provides comprehensive endpoints for managing coaching centers in the system. All endpoints require admin authentication and appropriate permissions.

**Base URL**: `/admin/coaching-centers`

**Version**: v1

---

## Authentication

All endpoints require:

1. **Bearer Token Authentication**
   ```
   Authorization: Bearer {adminAccessToken}
   ```

2. **Admin Role**: User must have admin role (super_admin, admin, employee, etc.)

3. **Permissions**: User must have appropriate permissions:
   - `coaching_center:view` - For GET endpoints
   - `coaching_center:create` - For POST endpoints
   - `coaching_center:update` - For PATCH endpoints
   - `coaching_center:delete` - For DELETE endpoints

---

## Endpoints

### 1. Get Coaching Center Statistics

Retrieve comprehensive statistics about coaching centers for dashboard analytics. Supports the same filters as the listing endpoint (except pagination).

**Endpoint**: `GET /admin/coaching-centers/stats`

**Permission Required**: `coaching_center:view`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Filter from date (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | string | No | Filter until date (YYYY-MM-DD) | `2024-12-31` |
| `userId` | string | No | Filter by Academy owner ID | `f316a86c-2909-4d32-8983-eb225c715bcb` |
| `status` | string | No | Filter by center status | `draft` or `published` |
| `isActive` | string | No | Filter by active status | `"true"` or `"false"` |
| `sportId` | string | No | Filter by sport ID | `507f1f77bcf86cd799439011` |
| `search` | string | No | Search by center name, email, or mobile number | `Elite` |

#### Request Examples

**Basic Request (All Time Statistics)**:
```http
GET /admin/coaching-centers/stats
Authorization: Bearer {adminAccessToken}
```

**With Date Range**:
```http
GET /admin/coaching-centers/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {adminAccessToken}
```

**With Multiple Filters**:
```http
GET /admin/coaching-centers/stats?status=published&isActive=true&sportId=507f1f77bcf86cd799439011&search=Elite
Authorization: Bearer {adminAccessToken}
```

#### Response (200 OK)

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
        "Chennai": 35
      },
      "byState": {
        "Delhi": 50,
        "Maharashtra": 70,
        "Karnataka": 40,
        "Tamil Nadu": 35
      },
      "allowingDisabled": 150,
      "onlyForDisabled": 10
    }
  }
}
```

---

### 2. Get All Coaching Centers

Retrieve paginated list of all coaching centers with filtering and sorting options. **Returns only basic information** for listing purposes. Use the individual route (`GET /admin/coaching-centers/:id`) to get full details including sports, locations, age, allowed genders, etc.

**Endpoint**: `GET /admin/coaching-centers`

**Permission Required**: `coaching_center:view`

**Note**: This endpoint returns only basic information. For complete details including sports, locations, age, allowed genders, operational timing, etc., use the individual route `GET /admin/coaching-centers/:id`.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (min: 1) |
| `limit` | number | No | 10 | Items per page (min: 1, max: 100) |
| `userId` | string | No | - | Filter by Academy owner ID |
| `status` | string | No | - | Filter by status: `draft` or `published` |
| `isActive` | string | No | - | Filter by active status: `"true"` or `"false"` |
| `sportId` | string | No | - | Filter by sport ID |
| `search` | string | No | - | Search by center name, email, or mobile number |
| `sortBy` | string | No | `createdAt` | Field to sort by (e.g., `createdAt`, `center_name`) |
| `sortOrder` | string | No | `desc` | Sort order: `asc` or `desc` |

#### Request Example

```http
GET /admin/coaching-centers?page=1&limit=10&status=published&isActive=true&sortBy=createdAt&sortOrder=desc
Authorization: Bearer {adminAccessToken}
```

#### Response (200 OK)

**Note**: This endpoint returns only basic information. Full details are available in the individual route.

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
          },
          {
            "id": "sport-456",
            "name": "Football"
          }
        ],
        "location": {
          "latitude": 28.6139,
          "longitude": 77.209,
          "address": {
            "line1": "123 Sports Complex",
            "line2": "Near Metro Station",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "pincode": "110001"
          }
        },
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

#### Fields Returned (Basic Info Only)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Coaching center ID |
| `center_name` | string | Center name |
| `email` | string | Center email |
| `mobile_number` | string | Center mobile number |
| `logo` | string \| null | Logo URL |
| `status` | string | Status: `draft` or `published` |
| `is_active` | boolean | Active status |
| `user` | object | Academy owner basic info (id, firstName, lastName, email, mobile) |
| `sports` | array | Array of sports with id and name only |
| `location` | object | Location details with latitude, longitude, and full address |
| `createdAt` | date | Creation timestamp |
| `updatedAt` | date | Last update timestamp |

**Fields NOT included in listing** (available in individual route):
- `sport_details` (full sport details with images/videos)
- `age` (age range)
- `allowed_genders` (allowed genders)
- `operational_timing` (operating hours)
- `documents` (general documents)
- `facility` (facilities)
- `bank_information` (bank details)
- `experience` (years of experience)
- `allowed_disabled` (disability access)
- `is_only_for_disabled` (exclusive for disabled)
- `rules_regulation` (rules and regulations)

---

### 3. Get Coaching Center by ID

Retrieve **complete detailed information** about a specific coaching center, including all fields like sports, locations, age, allowed genders, operational timing, documents, facilities, etc.

**Endpoint**: `GET /admin/coaching-centers/:id`

**Permission Required**: `coaching_center:view`

**Note**: This endpoint returns all fields including detailed information not available in the listing endpoint.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Coaching center ID (UUID or MongoDB ObjectId) |

#### Request Example

```http
GET /admin/coaching-centers/cc-123
Authorization: Bearer {adminAccessToken}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Coaching center retrieved successfully",
  "data": {
    "coachingCenter": {
      "id": "cc-123",
      "center_name": "Elite Sports Academy",
      "mobile_number": "9876543210",
      "email": "elite@example.com",
      "logo": "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png",
      "documents": [
        {
          "unique_id": "doc-1",
          "url": "https://example.com/cert.pdf",
          "is_active": true,
          "is_deleted": false
        }
      ],
      "sport_details": [
        {
          "sport_id": "507f1f77bcf86cd799439011",
          "description": "Professional cricket coaching with international level facilities",
          "images": [
            {
              "unique_id": "img-1",
              "url": "https://example.com/img1.jpg",
              "is_active": true,
              "is_deleted": false
            }
          ],
          "videos": [
            {
              "unique_id": "vid-1",
              "url": "https://example.com/vid1.mp4",
              "thumbnail": "https://example.com/thumb1.jpg",
              "is_active": true,
              "is_deleted": false
            }
          ]
        }
      ],
      "age": {
        "min": 5,
        "max": 18
      },
      "location": {
        "latitude": 28.6139,
        "longitude": 77.209,
        "address": {
          "line1": "123 Sports Complex",
          "line2": "Near Metro Station",
          "city": "New Delhi",
          "state": "Delhi",
          "country": "India",
          "pincode": "110001"
        }
      },
      "operational_timing": {
        "operating_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "opening_time": "09:00",
        "closing_time": "18:00"
      },
      "allowed_genders": ["male", "female"],
      "allowed_disabled": false,
      "is_only_for_disabled": false,
      "experience": 5,
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
      "facility": [
        {
          "id": "facility-123",
          "name": "Swimming Pool"
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 4. Get Coaching Centers by User ID

Retrieve all coaching centers belonging to a specific academy owner.

**Endpoint**: `GET /admin/coaching-centers/user/:userId`

**Permission Required**: `coaching_center:view`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Academy owner User ID (UUID) |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page |
| `sortBy` | string | No | `createdAt` | Field to sort by |
| `sortOrder` | string | No | `desc` | Sort order: `asc` or `desc` |

#### Request Example

```http
GET /admin/coaching-centers/user/f316a86c-2909-4d32-8983-eb225c715bcb?page=1&limit=10
Authorization: Bearer {adminAccessToken}
```

#### Response (200 OK)

Same structure as "Get All Coaching Centers" response.

---

### 5. Create Coaching Center

Create a new coaching center on behalf of an academy user. Admin can create centers by providing academy owner details.

**Endpoint**: `POST /admin/coaching-centers`

**Permission Required**: `coaching_center:create`

#### Request Body

```json
{
  "academy_owner": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.academy@example.com",
    "mobile": "9876543210"
  },
  "center_name": "Elite Sports Academy",
  "mobile_number": "9876543210",
  "email": "info@elitesportsacademy.com",
  "logo": "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png",
  "documents": [
    {
      "unique_id": "h8l9i1jk-02l4-1i53-i75h-70m60h154h1i",
      "url": "https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf"
    }
  ],
  "sports": ["507f1f77bcf86cd799439011"],
  "sport_details": [
    {
      "sport_id": "507f1f77bcf86cd799439011",
      "description": "Professional cricket coaching with international level facilities. Our coaches have played at state and national levels.",
      "images": [
        {
          "unique_id": "aeddb4dc-35e7-4b86-b08a-03f93a487a4b",
          "url": "https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg"
        }
      ],
      "videos": [
        {
          "unique_id": "c3g4d6ef-57g9-6d08-d20c-25h15c609c6d",
          "url": "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4",
          "thumbnail": "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg"
        }
      ]
    }
  ],
  "age": {
    "min": 5,
    "max": 18
  },
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "address": {
      "line1": "123 Sports Complex",
      "line2": "Near Metro Station",
      "city": "New Delhi",
      "state": "Delhi",
      "country": "India",
      "pincode": "110001"
    }
  },
  "operational_timing": {
    "operating_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "opening_time": "09:00",
    "closing_time": "18:00"
  },
  "allowed_genders": ["male", "female"],
  "allowed_disabled": false,
  "is_only_for_disabled": false,
  "experience": 5,
  "status": "published"
}
```

#### Field Descriptions

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `academy_owner` | object | Yes | Academy owner details | - |
| `academy_owner.firstName` | string | Yes | Owner's first name | - |
| `academy_owner.lastName` | string | No | Owner's last name | - |
| `academy_owner.email` | string | Yes | Owner's email | Valid email format |
| `academy_owner.mobile` | string | Yes | Owner's mobile | 10 digits, starts with 6-9 |
| `center_name` | string | Yes* | Center name | Max 255 chars, required if status=published |
| `mobile_number` | string | Yes* | Center mobile | 10 digits, required if status=published |
| `email` | string | Yes* | Center email | Valid email, required if status=published |
| `logo` | string | Yes* | Logo URL | Valid URL, required if status=published |
| `documents` | array | No | General documents | Array of media items |
| `sports` | array | Yes* | Sport IDs | At least 1, required if status=published |
| `sport_details` | array | Yes* | Sport-specific details | At least 1, required if status=published |
| `age` | object | Yes* | Age range | Required if status=published |
| `age.min` | number | Yes | Minimum age | Integer, 3-18 |
| `age.max` | number | Yes | Maximum age | Integer, 3-18, >= min |
| `location` | object | Yes* | Location details | Required if status=published |
| `location.latitude` | number | Yes | Latitude | -90 to 90 |
| `location.longitude` | number | Yes | Longitude | -180 to 180 |
| `location.address` | object | Yes | Address details | - |
| `location.address.line1` | string | No | Address line 1 | Max 255 chars |
| `location.address.line2` | string | Yes | Address line 2 | Max 255 chars |
| `location.address.city` | string | Yes | City | Max 100 chars |
| `location.address.state` | string | Yes | State | Max 100 chars |
| `location.address.country` | string | No | Country | Max 100 chars |
| `location.address.pincode` | string | Yes | Pincode | 6 digits |
| `operational_timing` | object | Yes* | Operating hours | Required if status=published |
| `operational_timing.operating_days` | array | Yes | Operating days | At least 1 day |
| `operational_timing.opening_time` | string | Yes | Opening time | HH:MM format (00:00-23:59) |
| `operational_timing.closing_time` | string | Yes | Closing time | HH:MM format, must be after opening |
| `allowed_genders` | array | Yes | Allowed genders | At least 1: `male`, `female`, `other` |
| `allowed_disabled` | boolean | Yes | Allow disabled participants | - |
| `is_only_for_disabled` | boolean | Yes | Only for disabled | - |
| `experience` | number | Yes | Years of experience | Integer, >= 0 |
| `status` | string | No | Status | `draft` or `published`, default: `draft` |
| `facility` | array | No | Facility IDs or new facilities | - |
| `rules_regulation` | array | No | Rules and regulations | Array of strings, max 500 chars each |

*Required if `status` is `published`

**Bank information:** `bank_information` is **not** accepted in create or update requests (admin or academy). Bank details are managed via the payout account API.

#### Response (201 Created)

```json
{
  "success": true,
  "message": "Coaching center created successfully",
  "data": {
    "coachingCenter": {
      "id": "cc-123",
      "center_name": "Elite Sports Academy",
      "status": "published",
      "is_active": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Note**: If user with provided email/mobile already exists, that user will be used. Otherwise, a new academy user will be created with default password `Academy@123`.

---

### 6. Update Coaching Center

Update an existing coaching center. Supports partial updates.

**Endpoint**: `PATCH /admin/coaching-centers/:id`

**Permission Required**: `coaching_center:update`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Coaching center ID |

#### Request Body

All fields are optional. Only provide fields you want to update. `bank_information` is not accepted.

```json
{
  "center_name": "Updated Elite Sports Academy",
  "mobile_number": "9876543210",
  "email": "info@elitesportsacademy.com",
  "logo": "https://bucket.s3.region.amazonaws.com/logos/elite-academy.png",
  "status": "published",
  "is_active": true,
  "userId": "f316a86c-2909-4d32-8983-eb225c715bcb",
  "sports": ["507f1f77bcf86cd799439011"],
  "sport_details": [
    {
      "sport_id": "507f1f77bcf86cd799439011",
      "description": "Updated cricket coaching description",
      "images": [
        {
          "unique_id": "aeddb4dc-35e7-4b86-b08a-03f93a487a4b",
          "url": "https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg"
        }
      ],
      "videos": [
        {
          "unique_id": "c3g4d6ef-57g9-6d08-d20c-25h15c609c6d",
          "url": "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4",
          "thumbnail": "https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg"
        }
      ]
    }
  ],
  "age": {
    "min": 5,
    "max": 18
  },
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "address": {
      "line1": "123 Sports Complex",
      "line2": "Updated Address",
      "city": "New Delhi",
      "state": "Delhi",
      "country": "India",
      "pincode": "110001"
    }
  },
  "operational_timing": {
    "operating_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "opening_time": "07:00",
    "closing_time": "10:00"
  },
  "allowed_genders": ["male", "female", "other"],
  "allowed_disabled": true,
  "is_only_for_disabled": false,
  "experience": 12
}
```

**Special Fields**:
- `userId`: Admin can change center ownership by providing a different user ID
- `status`: Changing to `published` triggers validation and media processing

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Coaching center updated successfully",
  "data": {
    "coachingCenter": {
      "id": "cc-123",
      "center_name": "Updated Elite Sports Academy",
      "status": "published",
      "is_active": true,
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

---

### 7. Toggle Coaching Center Status

Activate or deactivate a coaching center (toggle `is_active` field).

**Endpoint**: `PATCH /admin/coaching-centers/:id/toggle-status`

**Permission Required**: `coaching_center:update`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Coaching center ID |

#### Request Example

```http
PATCH /admin/coaching-centers/cc-123/toggle-status
Authorization: Bearer {adminAccessToken}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Coaching center updated successfully",
  "data": {
    "coachingCenter": {
      "id": "cc-123",
      "is_active": false,
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

---

### 8. Delete Coaching Center

Soft delete a coaching center (marks as deleted but doesn't remove from database).

**Endpoint**: `DELETE /admin/coaching-centers/:id`

**Permission Required**: `coaching_center:delete`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Coaching center ID |

#### Request Example

```http
DELETE /admin/coaching-centers/cc-123
Authorization: Bearer {adminAccessToken}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Coaching center deleted successfully",
  "data": null
}
```

---

### 9. Remove Media from Coaching Center

Soft delete media (logo, documents, images, videos) from a coaching center.

**Endpoint**: `DELETE /admin/coaching-centers/:id/media`

**Permission Required**: `coaching_center:delete`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Coaching center ID |

#### Request Body

```json
{
  "mediaType": "image",
  "uniqueId": "aeddb4dc-35e7-4b86-b08a-03f93a487a4b",
  "sportId": "507f1f77bcf86cd799439011"
}
```

#### Field Descriptions

| Field | Type | Required | Description | Values |
|-------|------|----------|-------------|--------|
| `mediaType` | string | Yes | Type of media to remove | `logo`, `document`, `image`, `video` |
| `uniqueId` | string | Yes | Unique ID of the media item | - |
| `sportId` | string | Yes* | Sport ID (required for images/videos) | - |

*Required only for `image` and `video` media types

#### Request Example

```http
DELETE /admin/coaching-centers/cc-123/media
Authorization: Bearer {adminAccessToken}
Content-Type: application/json

{
  "mediaType": "image",
  "uniqueId": "aeddb4dc-35e7-4b86-b08a-03f93a487a4b",
  "sportId": "507f1f77bcf86cd799439011"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Media removed successfully",
  "data": {
    "success": true
  }
}
```

---

### 10. Upload Media Files

Upload media files (logo, images, videos, documents) for coaching centers.

**Endpoint**: `POST /admin/coaching-centers/media`

**Permission Required**: Admin authentication (no specific permission required)

**Content-Type**: `multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `logo` | file | No | Logo image file |
| `images` | file[] | No | Array of image files |
| `videos` | file[] | No | Array of video files |
| `documents` | file[] | No | Array of document files |

#### Request Example (cURL)

```bash
curl -X POST "http://localhost:3001/api/v1/admin/coaching-centers/media" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -F "logo=@/path/to/logo.jpg" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "videos=@/path/to/video1.mp4" \
  -F "documents=@/path/to/certificate.pdf"
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Media files uploaded successfully",
  "data": {
    "logo": {
      "url": "https://bucket.s3.region.amazonaws.com/temp/logos/logo-uuid.jpg",
      "type": "logo"
    },
    "images": {
      "urls": [
        "https://bucket.s3.region.amazonaws.com/temp/images/image1-uuid.jpg",
        "https://bucket.s3.region.amazonaws.com/temp/images/image2-uuid.jpg"
      ],
      "count": 2,
      "type": "image"
    },
    "videos": {
      "urls": [
        "https://bucket.s3.region.amazonaws.com/temp/videos/video1-uuid.mp4"
      ],
      "count": 1,
      "type": "video"
    },
    "documents": {
      "urls": [
        "https://bucket.s3.region.amazonaws.com/temp/documents/certificate-uuid.pdf"
      ],
      "count": 1,
      "type": "document"
    }
  }
}
```

**Note**: Files are initially saved in `temp/` folder. They will be moved to permanent location when center is published.

---

## Data Models

### CoachingCenter Object

```typescript
{
  id: string;                    // UUID
  user: ObjectId;                // Academy owner reference
  addedBy?: ObjectId | null;      // Admin who created (if created via admin)
  center_name: string;            // Center name
  mobile_number: string;          // 10-digit mobile number
  email: string;                  // Email address
  rules_regulation?: string[];    // Array of rules
  logo?: string;                  // Logo URL
  sports: ObjectId[];             // Array of sport references
  sport_details: SportDetail[];   // Sport-specific details
  age: {
    min: number;                  // 3-18
    max: number;                  // 3-18, >= min
  };
  location: {
    latitude: number;             // -90 to 90
    longitude: number;            // -180 to 180
    address: {
      line1?: string;
      line2: string;
      city: string;
      state: string;
      country?: string;
      pincode: string;            // 6 digits
    };
  };
  facility: ObjectId[];           // Array of facility references
  operational_timing: {
    operating_days: string[];     // ["monday", "tuesday", ...]
    opening_time: string;         // "HH:MM" format
    closing_time: string;         // "HH:MM" format
  };
  documents: MediaItem[];         // General documents
  bank_information?: {            // Not accepted in create/update (admin or academy). May appear in GET responses (legacy). Use payout account for bank details.
    bank_name: string;
    account_number: string;       // 9-18 digits
    ifsc_code: string;           // Format: AAAA0XXXXX
    account_holder_name: string;
    gst_number?: string;         // GST format
  };
  status: "draft" | "published";
  allowed_genders: ("male" | "female" | "other")[];
  allowed_disabled: boolean;
  is_only_for_disabled: boolean;
  experience: number;            // Years of experience
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### SportDetail Object

```typescript
{
  sport_id: string;              // Sport ID
  description: string;           // 5-2000 characters
  images: MediaItem[];
  videos: VideoItem[];
}
```

### MediaItem Object

```typescript
{
  unique_id: string;             // UUID
  url: string;                   // Media URL
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date;
}
```

### VideoItem Object

```typescript
{
  unique_id: string;             // UUID
  url: string;                   // Video URL
  thumbnail?: string;            // Thumbnail URL
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date;
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "body.email",
      "message": "Email is required"
    },
    {
      "field": "body.age.max",
      "message": "Maximum age must be greater than minimum age"
    }
  ]
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token"
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
  "message": "Coaching center not found"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Best Practices

### 1. Pagination

- Always use pagination for list endpoints
- Recommended page size: 10-50 items
- Maximum page size: 100 items

### 2. Filtering

- Use specific filters to reduce response size
- Combine multiple filters for precise results
- Use `search` parameter for text-based queries

### 3. Status Management

- Create centers as `draft` first
- Update to `published` only when all required fields are complete
- Use `toggle-status` for quick activation/deactivation

### 4. Media Management

- Upload media files first using `/media` endpoint
- Use returned URLs in create/update requests
- Media in `temp/` folder is moved to permanent location on publish

### 5. Validation

- For `published` status, all required fields must be provided
- Validate email and mobile number formats
- Ensure age range is valid (min <= max)
- Verify operational timing (closing > opening)

### 6. Statistics Filtering

- Use the same filters as listing endpoint for statistics (userId, status, isActive, sportId, search)
- Combine filters for precise analytics (e.g., published centers for a specific sport)
- Use date filters for time-based analysis
- Statistics respect all filters, allowing filtered analytics

### 7. Performance

- Use date filters for statistics to improve performance
- Cache statistics data when possible
- Use appropriate indexes for filtering

### 8. Security

- Never expose sensitive bank information in responses
- Validate all user inputs
- Use HTTPS for all API calls
- Implement rate limiting

---

## Related Documentation

- [Coaching Center Statistics API](./COACHING_CENTER_STATS_API.md)
- [Admin API Payloads Reference](./ADMIN_API_PAYLOADS_REFERENCE.md)
- [Admin Panel README](../postman/ADMIN_PANEL_README.md)

---

## Version History

- **v1.0.0** (2024-01-XX): Initial release with comprehensive coaching center management APIs

---

## Support

For issues or questions, please contact the development team or refer to the main API documentation.

