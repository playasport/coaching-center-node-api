# Admin Facility Management API Documentation

## Overview

The Admin Facility Management API provides endpoints for managing facilities in the system. Facilities represent amenities or features available at coaching centers (e.g., Swimming Pool, Gym, Parking, etc.).

## Base URL

All endpoints are prefixed with `/api/v1/admin/facilities`

## Authentication

All endpoints require:
- **Authentication**: Valid JWT token in the `Authorization` header
- **Admin Role**: User must have admin role (super_admin, admin, employee, or agent)
- **Permissions**: Specific permission checks based on action (facility:view, facility:create, facility:update, facility:delete)

## Endpoints

### 1. Get All Facilities

Retrieve a paginated list of all facilities with optional filtering and search.

**Endpoint:** `GET /admin/facilities`

**Permission Required:** `facility:view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (minimum: 1) |
| limit | integer | No | 10 | Number of records per page (minimum: 1, maximum: 100) |
| search | string | No | - | Search by name, description, or custom_id (case-insensitive) |
| isActive | string | No | - | Filter by active status (`true` or `false`) |
| sortBy | string | No | createdAt | Field to sort by (name, createdAt, updatedAt) |
| sortOrder | string | No | desc | Sort order (`asc` or `desc`) |

**Example Request:**

```bash
GET /api/v1/admin/facilities?page=1&limit=10&search=swimming&isActive=true&sortBy=name&sortOrder=asc
Authorization: Bearer <token>
```

**Example Response:**

```json
{
  "success": true,
  "message": "Facilities retrieved successfully",
  "data": {
    "facilities": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "custom_id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Swimming Pool",
        "description": "Olympic size swimming pool with modern facilities",
        "icon": "https://example.com/icons/swimming.png",
        "is_active": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
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

### 2. Get Facility by ID

Retrieve a specific facility by its ID. Supports both MongoDB ObjectId and custom_id (UUID).

**Endpoint:** `GET /admin/facilities/:id`

**Permission Required:** `facility:view`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Facility ID (supports MongoDB ObjectId or custom_id UUID) |

**Example Request:**

```bash
GET /api/v1/admin/facilities/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Example Response:**

```json
{
  "success": true,
  "message": "Facility retrieved successfully",
  "data": {
    "facility": {
      "_id": "507f1f77bcf86cd799439011",
      "custom_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Swimming Pool",
      "description": "Olympic size swimming pool with modern facilities",
      "icon": "https://example.com/icons/swimming.png",
      "is_active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 3. Create Facility

Create a new facility.

**Endpoint:** `POST /admin/facilities`

**Permission Required:** `facility:create`

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | string | Yes | 1-100 characters | Name of the facility |
| description | string | No | Max 500 characters | Description of the facility |
| icon | string (URL) | No | Valid URL | Icon URL for the facility |
| is_active | boolean | No | - | Whether the facility is active (defaults to true) |

**Example Request:**

```bash
POST /api/v1/admin/facilities
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Swimming Pool",
  "description": "Olympic size swimming pool with modern facilities",
  "icon": "https://example.com/icons/swimming.png",
  "is_active": true
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Facility created successfully",
  "data": {
    "facility": {
      "_id": "507f1f77bcf86cd799439011",
      "custom_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Swimming Pool",
      "description": "Olympic size swimming pool with modern facilities",
      "icon": "https://example.com/icons/swimming.png",
      "is_active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request**: Facility with this name already exists
- **403 Forbidden**: Insufficient permissions

### 4. Update Facility

Update an existing facility. All fields are optional.

**Endpoint:** `PATCH /admin/facilities/:id`

**Permission Required:** `facility:update`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Facility ID (supports MongoDB ObjectId or custom_id UUID) |

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | string | No | 1-100 characters | Name of the facility |
| description | string | No | Max 500 characters | Description of the facility |
| icon | string (URL) | No | Valid URL | Icon URL for the facility |
| is_active | boolean | No | - | Whether the facility is active |

**Example Request:**

```bash
PATCH /api/v1/admin/facilities/507f1f77bcf86cd799439011
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Swimming Pool",
  "description": "Updated description",
  "icon": "https://example.com/icons/swimming-updated.png",
  "is_active": true
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Facility updated successfully",
  "data": {
    "facility": {
      "_id": "507f1f77bcf86cd799439011",
      "custom_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Updated Swimming Pool",
      "description": "Updated description",
      "icon": "https://example.com/icons/swimming-updated.png",
      "is_active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request**: Facility with this name already exists
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Facility not found

### 5. Delete Facility

Soft delete a facility by setting `is_active` to `false`. This maintains referential integrity.

**Endpoint:** `DELETE /admin/facilities/:id`

**Permission Required:** `facility:delete`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Facility ID (supports MongoDB ObjectId or custom_id UUID) |

**Example Request:**

```bash
DELETE /api/v1/admin/facilities/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Example Response:**

```json
{
  "success": true,
  "message": "Facility deleted successfully",
  "data": null
}
```

**Error Responses:**

- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Facility not found

## Data Model

### Facility Schema

```typescript
{
  _id: string;              // MongoDB ObjectId
  custom_id: string;         // UUID (auto-generated)
  name: string;              // Facility name (required, indexed)
  description: string | null; // Facility description (optional)
  icon: string | null;       // Icon URL (optional)
  is_active: boolean;        // Active status (default: true, indexed)
  createdAt: Date;           // Creation timestamp
  updatedAt: Date;           // Last update timestamp
}
```

## Validation Rules

### Name
- **Required**: Yes (for create)
- **Min Length**: 1 character
- **Max Length**: 100 characters
- **Unique**: Yes (case-insensitive)
- **Trimmed**: Yes (leading/trailing whitespace removed)

### Description
- **Required**: No
- **Max Length**: 500 characters
- **Nullable**: Yes

### Icon
- **Required**: No
- **Format**: Valid URL
- **Nullable**: Yes

### is_active
- **Required**: No
- **Type**: Boolean
- **Default**: true

## Search Functionality

The search parameter searches across:
- **name**: Case-insensitive partial match
- **description**: Case-insensitive partial match
- **custom_id**: Case-insensitive partial match

Example: `?search=pool` will match facilities with "pool" in name, description, or custom_id.

## Filtering

### Active Status Filter

Filter facilities by active status:
- `?isActive=true` - Returns only active facilities
- `?isActive=false` - Returns only inactive facilities
- No parameter - Returns all facilities regardless of status

## Sorting

### Sortable Fields

- `name` - Sort by facility name
- `createdAt` - Sort by creation date (default)
- `updatedAt` - Sort by last update date

### Sort Order

- `asc` - Ascending order
- `desc` - Descending order (default)

Example: `?sortBy=name&sortOrder=asc`

## Pagination

All list endpoints support pagination with the following response structure:

```json
{
  "pagination": {
    "page": 1,           // Current page number
    "limit": 10,         // Records per page
    "total": 50,         // Total number of records
    "totalPages": 5,     // Total number of pages
    "hasNextPage": true, // Whether there is a next page
    "hasPrevPage": false // Whether there is a previous page
  }
}
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "body.name",
      "message": "Name is required"
    }
  ]
}
```

### Common Error Codes

- **400 Bad Request**: Validation error or business logic violation (e.g., duplicate name)
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User lacks required permissions
- **404 Not Found**: Facility not found
- **500 Internal Server Error**: Server error

## Permission Requirements

| Endpoint | Method | Permission Required |
|----------|--------|---------------------|
| Get All Facilities | GET | `facility:view` |
| Get Facility by ID | GET | `facility:view` |
| Create Facility | POST | `facility:create` |
| Update Facility | PATCH | `facility:update` |
| Delete Facility | DELETE | `facility:delete` |

**Note**: Super Admin users bypass all permission checks.

## Usage Examples

### Example 1: List Active Facilities with Search

```bash
curl -X GET "https://api.example.com/api/v1/admin/facilities?page=1&limit=20&search=pool&isActive=true&sortBy=name&sortOrder=asc" \
  -H "Authorization: Bearer <token>"
```

### Example 2: Create a New Facility

```bash
curl -X POST "https://api.example.com/api/v1/admin/facilities" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gymnasium",
    "description": "Fully equipped gym with modern equipment",
    "icon": "https://example.com/icons/gym.png",
    "is_active": true
  }'
```

### Example 3: Update Facility Status

```bash
curl -X PATCH "https://api.example.com/api/v1/admin/facilities/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

### Example 4: Search Facilities

```bash
curl -X GET "https://api.example.com/api/v1/admin/facilities?search=swimming&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

## Notes

1. **Soft Delete**: Facilities are soft-deleted by setting `is_active` to `false`. This maintains referential integrity with coaching centers that reference these facilities.

2. **Name Uniqueness**: Facility names must be unique (case-insensitive). The system checks for duplicates on both create and update operations.

3. **ID Support**: All endpoints support both MongoDB ObjectId (24 hex characters) and custom_id (UUID format) for backward compatibility.

4. **Auto-generated Fields**: 
   - `custom_id`: Automatically generated UUID on creation
   - `createdAt` and `updatedAt`: Automatically managed by MongoDB

5. **Search Performance**: The search functionality uses MongoDB regex queries. For large datasets, consider implementing full-text search indexes.

6. **Pagination Limits**: Maximum limit is 100 records per page to prevent performance issues.

## Integration with Coaching Centers

Facilities are referenced by coaching centers in their facility lists. When a facility is soft-deleted (is_active = false), it will not appear in public facility lists but existing references are maintained.

## Related Endpoints

- **Public Facilities List**: `GET /api/v1/facilities` - Returns only active facilities (no authentication required)
- **Coaching Center Facilities**: Facilities are associated with coaching centers through the coaching center management API

