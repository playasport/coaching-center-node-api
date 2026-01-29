# User Management API Documentation

## Overview

This document provides API specifications for the User Management endpoints. All endpoints require admin authentication and appropriate permissions.

**Base Path**: `/api/v1/admin/users`

---

## Table of Contents

1. [Get All Users](#get-all-users)
2. [Get User by ID](#get-user-by-id)
3. [Create User](#create-user)
4. [Update User](#update-user)
5. [Delete User](#delete-user)
6. [Response Formats](#response-formats)
7. [Error Responses](#error-responses)

---

## Get All Users

Retrieve a paginated list of all users with optional filtering and searching capabilities.

### Endpoint

```
GET /api/v1/admin/users
```

### Authentication

**Required**: Yes  
**Header**: `Authorization: Bearer {access_token}`  
**Permission**: `user:view`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination (minimum: 1) |
| `limit` | integer | No | 10 | Number of records per page (minimum: 1, maximum: 100) |
| `search` | string | No | - | Search by first name, last name, email, or mobile number (case-insensitive) |
| `userType` | string | No | - | Filter by user type. Values: `student`, `guardian`, `other` |
| `isActive` | boolean | No | - | Filter by active status. Values: `true`, `false` |
| `role` | string | No | - | Filter by role name (e.g., `user`, `admin`, `super_admin`) |

### Query Parameter Details

#### `userType` Filter

- **`student`**: Returns users where `userType = "student"`
- **`guardian`**: Returns users where `userType = "guardian"`
- **`other`**: Returns users where `userType` is `null` or `undefined`

#### `search` Filter

Searches across the following fields:
- `firstName`
- `lastName`
- `email`
- `mobile`

The search is case-insensitive and uses partial matching.

#### `role` Filter

Filters users by role name. Matches users who have the specified role in their `roles` array.
- **Example values**: `user`, `admin`, `super_admin`, `academy`, `student`, `guardian`, etc.
- **Case-sensitive**: The role name must match exactly
- Users can have multiple roles; this filter returns users who have the specified role among their roles

#### Filter Combinations

All filters can be combined. When multiple filters are used, they are applied with AND logic:
- Search + userType: Returns users matching the search AND the specified userType
- Search + isActive: Returns users matching the search AND the specified active status
- userType + isActive: Returns users with the specified userType AND active status
- Role + other filters: Returns users with the specified role AND other criteria
- All filters: Returns users matching all specified criteria (search, userType, isActive, role)

### Request Examples

```
GET /api/v1/admin/users
GET /api/v1/admin/users?page=1&limit=20
GET /api/v1/admin/users?userType=student
GET /api/v1/admin/users?userType=guardian
GET /api/v1/admin/users?userType=other
GET /api/v1/admin/users?search=john
GET /api/v1/admin/users?isActive=true
GET /api/v1/admin/users?isActive=false
GET /api/v1/admin/users?userType=student&isActive=true
GET /api/v1/admin/users?role=user
GET /api/v1/admin/users?role=admin
GET /api/v1/admin/users?userType=student&isActive=true&search=john
GET /api/v1/admin/users?userType=student&isActive=true&search=john&role=user
GET /api/v1/admin/users?page=2&limit=25&userType=guardian&search=doe&role=user
```

### Success Response

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "mobile": "9876543210",
        "dob": "2000-01-15T00:00:00.000Z",
        "gender": "male",
        "profileImage": "https://bucket.s3.region.amazonaws.com/profile-images/user-id.jpg",
        "roles": [
          {
            "id": "507f1f77bcf86cd799439011",
            "name": "user",
            "description": "Regular user"
          }
        ],
        "userType": "student",
        "isActive": true,
        "participantCount": 2,
        "bookingCount": 5,
        "address": {
          "line1": "123 Main Street",
          "line2": "Apt 4B",
          "area": "Downtown",
          "city": "Mumbai",
          "state": "Maharashtra",
          "country": "India",
          "pincode": "400001"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "stats": {
      "totalUsers": 1000,
      "totalParticipants": 500,
      "activeBookings": 250,
      "userDetailsCount": {
        "usersWithBookings": 200,
        "usersWithParticipants": 300,
        "usersWithEnrolledBatches": 200,
        "usersWithEnrolledBatchSports": 180,
        "usersWithBookingsAndParticipants": 150
      }
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1000,
      "totalPages": 100,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Response Fields

#### User Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique user identifier |
| `firstName` | string | User's first name |
| `lastName` | string \| null | User's last name (nullable) |
| `email` | string | User's email address |
| `mobile` | string \| null | User's mobile number (nullable) |
| `dob` | string (ISO 8601) \| null | Date of birth (nullable) |
| `gender` | string \| null | Gender: `male`, `female`, `other` (nullable) |
| `profileImage` | string (URL) \| null | Profile image URL (nullable) |
| `roles` | array | Array of role objects |
| `userType` | string \| null | User type: `student`, `guardian`, or `null` |
| `isActive` | boolean | Whether the user account is active |
| `participantCount` | integer | Number of participants associated with this user |
| `bookingCount` | integer | Number of bookings made by this user |
| `address` | object \| null | Address object (nullable) |
| `createdAt` | string (ISO 8601) | Account creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

#### Role Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Role ID (MongoDB ObjectId) |
| `name` | string | Role name |
| `description` | string \| null | Role description (nullable) |

#### Address Object

| Field | Type | Description |
|-------|------|-------------|
| `line1` | string \| null | Address line 1 (nullable) |
| `line2` | string \| null | Address line 2 (nullable) |
| `area` | string \| null | Area/locality (nullable) |
| `city` | string \| null | City (nullable) |
| `state` | string \| null | State (nullable) |
| `country` | string \| null | Country (nullable) |
| `pincode` | string \| null | Postal/ZIP code (nullable) |

#### Stats Object

| Field | Type | Description |
|-------|------|-------------|
| `totalUsers` | integer | Total number of users in the system |
| `totalParticipants` | integer | Total number of participants (students) in the system |
| `activeBookings` | integer | Total number of active bookings |
| `userDetailsCount` | object | Count of users with various details (see UserDetailsCount Object below) |

#### UserDetailsCount Object

| Field | Type | Description |
|-------|------|-------------|
| `usersWithBookings` | integer | Number of users who have bookings |
| `usersWithParticipants` | integer | Number of users who have participants |
| `usersWithEnrolledBatches` | integer | Number of users who have enrolled batches (same as usersWithBookings) |
| `usersWithEnrolledBatchSports` | integer | Number of users who have enrolled in batch sports |
| `usersWithBookingsAndParticipants` | integer | Number of users who have both bookings and participants |

#### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Number of items per page |
| `total` | integer | Total number of items |
| `totalPages` | integer | Total number of pages |
| `hasNextPage` | boolean | Whether there is a next page |
| `hasPrevPage` | boolean | Whether there is a previous page |

---

## Get User by ID

Retrieve a specific user by their ID.

### Endpoint

```
GET /api/v1/admin/users/:id
```

### Authentication

**Required**: Yes  
**Header**: `Authorization: Bearer {access_token}`  
**Permission**: `user:view`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | User ID (supports both UUID format and MongoDB ObjectId format) |

### Request Examples

```
GET /api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000
GET /api/v1/admin/users/507f1f77bcf86cd799439011
```

### Success Response

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "mobile": "9876543210",
      "dob": "2000-01-15T00:00:00.000Z",
      "gender": "male",
      "profileImage": "https://bucket.s3.region.amazonaws.com/profile-images/user-id.jpg",
      "roles": [
        {
          "id": "507f1f77bcf86cd799439011",
          "name": "user",
          "description": "Regular user"
        }
      ],
      "userType": "student",
      "isActive": true,
      "address": {
        "line1": "123 Main Street",
        "line2": "Apt 4B",
        "area": "Downtown",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "400001"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## Create User

Create a new user account.

### Endpoint

```
POST /api/v1/admin/users
```

### Authentication

**Required**: Yes  
**Header**: `Authorization: Bearer {access_token}`  
**Permission**: `user:create`

### Request Headers

```
Content-Type: application/json
Authorization: Bearer {access_token}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address (must be unique, lowercase) |
| `password` | string | Yes | User's password (will be hashed) |
| `firstName` | string | Yes | User's first name |
| `lastName` | string | No | User's last name |
| `mobile` | string | No | User's mobile number |
| `gender` | string | No | Gender: `male`, `female`, `other` |
| `dob` | string (ISO 8601) | No | Date of birth |
| `roles` | array of strings | Yes | Array of role names (e.g., `["user"]`) |
| `userType` | string | No | User type: `student`, `guardian` (only applies when role includes "user") |
| `isActive` | boolean | No | Whether the user account is active (default: `true`) |
| `address` | object | No | Address object (see Address Object structure below) |

### Request Body Example

```json
{
  "email": "newuser@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "mobile": "9876543210",
  "gender": "male",
  "dob": "1990-01-01T00:00:00.000Z",
  "roles": ["user"],
  "userType": "student",
  "isActive": true,
  "address": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "area": "Downtown",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  }
}
```

### Success Response

**Status Code**: `201 Created`

**Response Body**:

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "newuser@example.com",
      "mobile": "9876543210",
      "dob": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "profileImage": null,
      "roles": [
        {
          "id": "507f1f77bcf86cd799439011",
          "name": "user",
          "description": "Regular user"
        }
      ],
      "userType": "student",
      "isActive": true,
      "address": {
        "line1": "123 Main Street",
        "line2": "Apt 4B",
        "area": "Downtown",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "pincode": "400001"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

## Update User

Update an existing user account.

### Endpoint

```
PATCH /api/v1/admin/users/:id
```

### Authentication

**Required**: Yes  
**Header**: `Authorization: Bearer {access_token}`  
**Permission**: `user:update`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | User ID (supports both UUID format and MongoDB ObjectId format) |

### Request Headers

```
Content-Type: application/json
Authorization: Bearer {access_token}
```

### Request Body

All fields are optional. Only include fields that need to be updated.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | No | User's first name |
| `lastName` | string | No | User's last name (can be set to `null`) |
| `mobile` | string | No | User's mobile number (can be set to `null`) |
| `gender` | string | No | Gender: `male`, `female`, `other` (can be set to `null`) |
| `dob` | string (ISO 8601) | No | Date of birth (can be set to `null`) |
| `roles` | array of strings | No | Array of role names (e.g., `["user"]`) |
| `userType` | string | No | User type: `student`, `guardian` (can be set to `null`) |
| `isActive` | boolean | No | Whether the user account is active |
| `address` | object | No | Address object (can be set to `null`) |

### Request Body Example

```json
{
  "firstName": "John Updated",
  "lastName": "Doe",
  "mobile": "9876543210",
  "gender": "male",
  "userType": "guardian",
  "isActive": true,
  "address": {
    "line1": "456 New Street",
    "line2": null,
    "area": "Uptown",
    "city": "Delhi",
    "state": "Delhi",
    "country": "India",
    "pincode": "110001"
  }
}
```

### Success Response

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John Updated",
      "lastName": "Doe",
      "email": "newuser@example.com",
      "mobile": "9876543210",
      "dob": "1990-01-01T00:00:00.000Z",
      "gender": "male",
      "profileImage": null,
      "roles": [
        {
          "id": "507f1f77bcf86cd799439011",
          "name": "user",
          "description": "Regular user"
        }
      ],
      "userType": "guardian",
      "isActive": true,
      "address": {
        "line1": "456 New Street",
        "line2": null,
        "area": "Uptown",
        "city": "Delhi",
        "state": "Delhi",
        "country": "India",
        "pincode": "110001"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T14:30:00.000Z"
    }
  }
}
```

---

## Delete User

Delete a user account (soft delete).

### Endpoint

```
DELETE /api/v1/admin/users/:id
```

### Authentication

**Required**: Yes  
**Header**: `Authorization: Bearer {access_token}`  
**Permission**: `user:delete`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | User ID (supports both UUID format and MongoDB ObjectId format) |

### Request Examples

```
DELETE /api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000
DELETE /api/v1/admin/users/507f1f77bcf86cd799439011
```

### Success Response

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

**Note**: This is a soft delete. The user record is marked as deleted (`isDeleted: true`) but not permanently removed from the database.

---

## Response Formats

### Success Response Structure

All successful responses follow this structure:

```json
{
  "success": true,
  "message": "Operation success message",
  "data": {
    // Response data here
  }
}
```

### Standard Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful responses |
| `message` | string | Human-readable success message |
| `data` | object \| null | Response data (null for delete operations) |

---

## Error Responses

### Error Response Structure

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

### HTTP Status Codes

| Status Code | Description | Common Scenarios |
|-------------|-------------|------------------|
| `400` | Bad Request | Validation errors, invalid input |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | User not found |
| `500` | Internal Server Error | Server-side errors |

### Error Response Examples

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "message": "Email already exists",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

#### 400 Bad Request - Invalid Role

```json
{
  "success": false,
  "message": "One or more roles are invalid",
  "errors": []
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
  "message": "User not found"
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

## Filter Usage Guide

### Filter Combinations

Filters can be combined to create more specific queries:

#### Example 1: Get Active Students

```
GET /api/v1/admin/users?userType=student&isActive=true
```

**Returns**: All users where `userType = "student"` AND `isActive = true`

#### Example 2: Search Guardians

```
GET /api/v1/admin/users?userType=guardian&search=john
```

**Returns**: All users where `userType = "guardian"` AND (firstName, lastName, email, or mobile contains "john")

#### Example 3: Get Inactive Other Users

```
GET /api/v1/admin/users?userType=other&isActive=false
```

**Returns**: All users where `userType` is null/undefined AND `isActive = false`

#### Example 4: Filter by Role

```
GET /api/v1/admin/users?role=user
```

**Returns**: All users who have the "user" role in their roles array

#### Example 5: Complex Filter

```
GET /api/v1/admin/users?userType=student&isActive=true&search=doe&role=user&page=1&limit=20
```

**Returns**: 
- Page 1
- 20 items per page
- Users where `userType = "student"` AND `isActive = true` AND `roles` contains "user" role AND (firstName, lastName, email, or mobile contains "doe")

### Filter Logic

- **Multiple filters**: Applied with AND logic (all conditions must match)
- **Search filter**: Uses OR logic internally (matches any of the searchable fields)
- **userType = "other"**: Matches users where userType is `null` or `undefined`

---

## Data Types Reference

### Date Format

All dates are returned in ISO 8601 format:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2024-01-15T10:30:00.000Z`
- Timezone: UTC

### Boolean Values

- `true` - Active, enabled, etc.
- `false` - Inactive, disabled, etc.

### Nullable Fields

Fields marked as nullable can have:
- A valid value of the specified type
- `null` value
- `undefined` (may be omitted from response)

---

## Notes

1. **Authentication**: All endpoints require a valid Bearer token in the Authorization header
2. **Permissions**: Each endpoint requires specific permissions (user:view, user:create, user:update, user:delete)
3. **Pagination**: Default page size is 10, maximum is 100
4. **Soft Delete**: Delete operations mark users as deleted but don't remove them from the database
5. **ID Format**: User IDs support both UUID format and MongoDB ObjectId format for backward compatibility
6. **Search**: Search is case-insensitive and uses partial matching
7. **Filter Combination**: All filters use AND logic when combined

---

**Last Updated**: 2024-01-15

**Recent Updates**:
- Added `participantCount` and `bookingCount` to each user in the list
- Added `stats` object with overall statistics including total users, total participants, active bookings, and user details counts

