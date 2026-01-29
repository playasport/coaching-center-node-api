# Sports API Integration Guide

## Overview

This document provides comprehensive guidance for integrating with the Sports API endpoints. The API allows you to manage sports data including creating, updating, retrieving, and deleting sports. A key feature is the ability to upload sport images directly during creation or update operations.

**Base Path**: `/api/v1/admin/sports`

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Image Upload](#image-upload)
4. [Request Examples](#request-examples)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Authentication

All Sports API endpoints require authentication and admin role permissions.

### Headers Required

```http
Authorization: Bearer {access_token}
Content-Type: application/json (or multipart/form-data for image uploads)
```

### Getting Access Token

1. Authenticate using the admin login endpoint
2. Extract the `accessToken` from the response
3. Include it in the `Authorization` header for subsequent requests

**Example:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## API Endpoints

### 1. Get All Sports

Retrieve a paginated list of all sports with optional filtering.

**Endpoint**: `GET /api/v1/admin/sports`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `limit` | integer | No | 10 | Number of items per page |
| `search` | string | No | - | Search by sport name |
| `isActive` | boolean | No | - | Filter by active status |
| `isPopular` | boolean | No | - | Filter by popular status |

**Example Request:**
```http
GET /api/v1/admin/sports?page=1&limit=20&isActive=true
Authorization: Bearer {token}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sports retrieved successfully",
  "data": {
    "sports": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "custom_id": "06da21af-f11c-4cd9-8ecc-b21d3de9ad2c",
        "name": "Cricket",
        "slug": "cricket",
        "logo": "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg",
        "is_active": true,
        "is_popular": true,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### 2. Get Sport by ID

Retrieve a specific sport by its ID (MongoDB ObjectId or custom_id).

**Endpoint**: `GET /api/v1/admin/sports/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Sport ID (MongoDB ObjectId or custom_id) |

**Example Request:**
```http
GET /api/v1/admin/sports/507f1f77bcf86cd799439011
Authorization: Bearer {token}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sport retrieved successfully",
  "data": {
    "sport": {
      "_id": "507f1f77bcf86cd799439011",
      "custom_id": "06da21af-f11c-4cd9-8ecc-b21d3de9ad2c",
      "name": "Cricket",
      "slug": "cricket",
      "logo": "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg",
      "is_active": true,
      "is_popular": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 3. Create Sport

Create a new sport. Supports two methods: JSON with logo URL or multipart/form-data with image file upload.

**Endpoint**: `POST /api/v1/admin/sports`

**Content Types Supported:**
- `application/json` - With logo URL
- `multipart/form-data` - With image file upload

**Request Body (JSON Method):**

```json
{
  "name": "Cricket",
  "logo": "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg",
  "is_active": true,
  "is_popular": false
}
```

**Request Body (Multipart Method):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Sport name (1-100 characters) |
| `image` | file | No | Sport logo/image file (JPEG, PNG, WebP) - max 5MB |
| `is_active` | boolean/string | No | Whether the sport is active (default: true) |
| `is_popular` | boolean/string | No | Whether the sport is popular (default: false) |

**Validation Rules:**
- `name`: Required, 1-100 characters, trimmed
- `logo`: Optional, must be valid URL (if provided as JSON)
- `is_active`: Optional boolean, defaults to `true`
- `is_popular`: Optional boolean, defaults to `false`

**Example Request (JSON):**
```http
POST /api/v1/admin/sports
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Cricket",
  "is_active": true,
  "is_popular": false
}
```

**Example Request (Multipart with Image):**
```http
POST /api/v1/admin/sports
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: Cricket
image: [binary file data]
is_active: true
is_popular: false
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sport created successfully",
  "data": {
    "sport": {
      "_id": "507f1f77bcf86cd799439011",
      "custom_id": "06da21af-f11c-4cd9-8ecc-b21d3de9ad2c",
      "name": "Cricket",
      "slug": "cricket",
      "logo": "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg",
      "is_active": true,
      "is_popular": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

### 4. Update Sport

Update an existing sport. Supports both JSON with logo URL and multipart/form-data with image file upload.

**Endpoint**: `PATCH /api/v1/admin/sports/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Sport ID (MongoDB ObjectId or custom_id) |

**Content Types Supported:**
- `application/json` - With logo URL
- `multipart/form-data` - With image file upload

**Request Body (All fields optional):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Sport name (1-100 characters) |
| `logo` | string | No | Logo URL (for JSON method) |
| `image` | file | No | Sport logo/image file (for multipart method) |
| `is_active` | boolean/string | No | Whether the sport is active |
| `is_popular` | boolean/string | No | Whether the sport is popular |

**Example Request (JSON):**
```http
PATCH /api/v1/admin/sports/507f1f77bcf86cd799439011
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Cricket Updated",
  "is_popular": true
}
```

**Example Request (Multipart with Image):**
```http
PATCH /api/v1/admin/sports/507f1f77bcf86cd799439011
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: Cricket Updated
image: [binary file data]
is_popular: true
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sport updated successfully",
  "data": {
    "sport": {
      "_id": "507f1f77bcf86cd799439011",
      "custom_id": "06da21af-f11c-4cd9-8ecc-b21d3de9ad2c",
      "name": "Cricket Updated",
      "slug": "cricket",
      "logo": "https://bucket.s3.region.amazonaws.com/images/sports/cricket.jpg",
      "is_active": true,
      "is_popular": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-16T14:30:00.000Z"
    }
  }
}
```

---

### 5. Delete Sport

Delete a sport by ID.

**Endpoint**: `DELETE /api/v1/admin/sports/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Sport ID (MongoDB ObjectId or custom_id) |

**Example Request:**
```http
DELETE /api/v1/admin/sports/507f1f77bcf86cd799439011
Authorization: Bearer {token}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sport deleted successfully",
  "data": null
}
```

---

### 6. Delete Sport Image

Delete the image associated with a sport (removes from S3 and database).

**Endpoint**: `DELETE /api/v1/admin/sports/:id/image`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Sport ID (MongoDB ObjectId or custom_id) |

**Example Request:**
```http
DELETE /api/v1/admin/sports/507f1f77bcf86cd799439011/image
Authorization: Bearer {token}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sport image deleted successfully",
  "data": null
}
```

---

## Image Upload

### Overview

The Sports API supports direct image uploads when creating or updating sports. Images are automatically processed, resized, compressed, and uploaded to AWS S3.

### Supported Image Formats

| Format | MIME Type | Extension | Notes |
|--------|-----------|-----------|-------|
| **JPEG** | `image/jpeg`, `image/jpg` | `.jpg`, `.jpeg` | Recommended for photos |
| **PNG** | `image/png` | `.png` | Recommended for graphics with transparency |
| **WebP** | `image/webp` | `.webp` | Modern format with better compression |

### File Size Limitations

| Setting | Value | Description |
|---------|-------|-------------|
| **Max File Size** | **5 MB** | Maximum size per image file |

### Image Processing

Images uploaded through the API undergo automatic processing:

#### 1. **Automatic Resizing**
- Images wider than **1500px** are automatically resized
- Aspect ratio is preserved
- Height is adjusted proportionally

#### 2. **Automatic Compression**
- Images are compressed to optimize file size
- Target maximum size: **500 KB**
- Compression quality is adaptive (starts at 85%, reduces if needed)
- Format-specific compression:
  - **JPEG**: Quality adaptive (85% → 20% if needed)
  - **PNG**: Compression level 6-9 (adaptive)
  - **WebP**: Quality adaptive (85% → 20% if needed)

#### 3. **Storage Location**
- **Upload Path**: `images/sports/{sport-slug}.{extension}`
- **Example**: `images/sports/cricket.jpg`
- **Full URL Format**: `https://{bucket}.s3.{region}.amazonaws.com/images/sports/{sport-slug}.{extension}`

#### 4. **Automatic Replacement**
- When uploading a new image for an existing sport, the old image is automatically replaced
- Filename is based on sport slug, ensuring same sport = same filename = automatic replacement
- No manual cleanup required

### Image Upload Workflow

#### Method 1: Create Sport with Image Upload

```http
POST /api/v1/admin/sports
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: Cricket
image: [binary file]
is_active: true
is_popular: false
```

**Process:**
1. Sport is created with provided data
2. Image file is processed (resized & compressed)
3. Image is uploaded to S3 at `images/sports/cricket.jpg`
4. Sport record is updated with image URL
5. Response includes complete sport data with image URL

#### Method 2: Update Sport with Image Upload

```http
PATCH /api/v1/admin/sports/{id}
Authorization: Bearer {token}
Content-Type: multipart/form-data

name: Cricket Updated
image: [binary file]
is_popular: true
```

**Process:**
1. Sport is updated with provided data
2. If image file is present:
   - Image is processed (resized & compressed)
   - Old image is automatically replaced in S3 (same filename)
   - Sport record is updated with new image URL
3. Response includes updated sport data

### Filename Generation

The system generates filenames based on the sport's slug:

1. **Sport Slug**: Automatically generated from sport name
   - Converted to lowercase
   - Special characters removed
   - Spaces replaced with hyphens
   - Example: "Table Tennis" → "table-tennis"

2. **Filename Format**: `{sport-slug}.{original-extension}`
   - Example: `cricket.jpg`
   - Example: `table-tennis.png`

3. **Full Path**: `images/sports/{sport-slug}.{extension}`
   - Example: `images/sports/cricket.jpg`

### Image Upload Best Practices

1. **Format Selection**:
   - Use **JPEG** for photos (better compression)
   - Use **PNG** for graphics with transparency
   - Use **WebP** for modern browsers (best compression)

2. **File Size**:
   - Keep original files under 5 MB
   - System will compress, but smaller files upload faster

3. **Dimensions**:
   - Recommended width: 800-1500px
   - System will resize larger images automatically

4. **Image Quality**:
   - System optimizes automatically
   - No need to pre-compress images

---

## Request Examples

### JavaScript (Fetch API)

#### Create Sport with JSON

```javascript
const createSportJSON = async (token) => {
  const response = await fetch('https://api.example.com/api/v1/admin/sports', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Cricket',
      is_active: true,
      is_popular: false,
    }),
  });
  
  return await response.json();
};
```

#### Create Sport with Image Upload

```javascript
const createSportWithImage = async (token, sportData, imageFile) => {
  const formData = new FormData();
  formData.append('name', sportData.name);
  formData.append('image', imageFile);
  formData.append('is_active', sportData.is_active.toString());
  formData.append('is_popular', sportData.is_popular.toString());

  const response = await fetch('https://api.example.com/api/v1/admin/sports', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - browser will set it with boundary
    },
    body: formData,
  });
  
  return await response.json();
};
```

#### Update Sport with Image

```javascript
const updateSportWithImage = async (token, sportId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('is_popular', 'true');

  const response = await fetch(
    `https://api.example.com/api/v1/admin/sports/${sportId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );
  
  return await response.json();
};
```

### cURL Examples

#### Create Sport with JSON

```bash
curl -X POST https://api.example.com/api/v1/admin/sports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cricket",
    "is_active": true,
    "is_popular": false
  }'
```

#### Create Sport with Image Upload

```bash
curl -X POST https://api.example.com/api/v1/admin/sports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Cricket" \
  -F "image=@/path/to/cricket.jpg" \
  -F "is_active=true" \
  -F "is_popular=false"
```

#### Update Sport with Image

```bash
curl -X PATCH https://api.example.com/api/v1/admin/sports/SPORT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/new-cricket.jpg" \
  -F "is_popular=true"
```

### Axios Examples

#### Create Sport with Image Upload

```javascript
import axios from 'axios';

const createSportWithImage = async (token, sportData, imageFile) => {
  const formData = new FormData();
  formData.append('name', sportData.name);
  formData.append('image', imageFile);
  formData.append('is_active', sportData.is_active);
  formData.append('is_popular', sportData.is_popular);

  const response = await axios.post(
    'https://api.example.com/api/v1/admin/sports',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data;
};
```

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful message",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "name",
      "message": "Sport name is required"
    }
  ]
}
```

### Status Codes

| Code | Description |
|------|-------------|
| `200` | Success (GET, PATCH, DELETE) |
| `201` | Created (POST) |
| `400` | Bad Request (validation errors) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found (resource doesn't exist) |
| `500` | Internal Server Error |

---

## Error Handling

### Common Error Scenarios

#### 1. Validation Errors (400)

```json
{
  "success": false,
  "message": "Sport name must be at least 1 character",
  "errors": [
    {
      "field": "name",
      "message": "Sport name must be at least 1 character"
    }
  ]
}
```

#### 2. File Size Exceeded (400)

```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 5MB"
}
```

#### 3. Invalid File Type (400)

```json
{
  "success": false,
  "message": "Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp"
}
```

#### 4. Unauthorized (401)

```json
{
  "success": false,
  "message": "Unauthorized - Authentication required"
}
```

#### 5. Forbidden (403)

```json
{
  "success": false,
  "message": "Forbidden - Admin role required"
}
```

#### 6. Not Found (404)

```json
{
  "success": false,
  "message": "Sport not found"
}
```

### Error Handling Best Practices

1. **Check Status Codes**: Always check HTTP status codes
2. **Parse Error Messages**: Extract user-friendly error messages
3. **Handle Validation Errors**: Display field-specific errors to users
4. **Retry Logic**: Implement retry for network errors (5xx)
5. **Log Errors**: Log errors for debugging while showing user-friendly messages

**Example Error Handling:**

```javascript
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    if (status === 400 && data.errors) {
      // Validation errors
      data.errors.forEach(err => {
        console.error(`${err.field}: ${err.message}`);
      });
    } else {
      // Other errors
      console.error(data.message || 'An error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    console.error('Network error - no response received');
  } else {
    // Error setting up request
    console.error('Error:', error.message);
  }
};
```

---

## Best Practices

### 1. **Image Upload**

- ✅ **Do**: Use multipart/form-data for image uploads
- ✅ **Do**: Keep image files under 5 MB before upload
- ✅ **Do**: Use appropriate image formats (JPEG for photos, PNG for transparency)
- ✅ **Do**: Let the system handle compression (don't pre-compress)
- ❌ **Don't**: Upload extremely large images (> 10MB) - they will be rejected
- ❌ **Don't**: Set Content-Type manually when using FormData (let browser set it)

### 2. **Sport Names**

- ✅ **Do**: Use clear, descriptive names (1-100 characters)
- ✅ **Do**: Keep names consistent and professional
- ❌ **Don't**: Use special characters or emojis (will be cleaned in slug generation)
- ❌ **Don't**: Exceed 100 characters

### 3. **API Calls**

- ✅ **Do**: Include Authorization header in all requests
- ✅ **Do**: Handle errors gracefully
- ✅ **Do**: Use pagination for large lists
- ✅ **Do**: Cache responses when appropriate
- ❌ **Don't**: Make unnecessary requests
- ❌ **Don't**: Hardcode tokens (use environment variables)

### 4. **Idempotency**

- ✅ **Do**: Use sport `custom_id` for reliable references
- ✅ **Do**: Check if sport exists before creating duplicates
- ❌ **Don't**: Rely solely on MongoDB ObjectId in external systems

### 5. **Image Updates**

- ✅ **Do**: Upload new images when updating sport logos
- ✅ **Do**: Delete images when removing sport logos
- ✅ **Do**: Reuse the update endpoint instead of separate image upload endpoint
- ❌ **Don't**: Store image URLs manually - let the API handle it

### 6. **Performance**

- ✅ **Do**: Implement proper loading states
- ✅ **Do**: Use pagination for large datasets
- ✅ **Do**: Implement request debouncing for search
- ❌ **Don't**: Fetch all sports without pagination
- ❌ **Don't**: Block UI on image uploads (use async/await)

---

## Configuration

### Environment Variables

The following environment variables affect image upload behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_IMAGE_SIZE_MB` | 5 | Maximum image file size in MB |
| `IMAGE_MAX_WIDTH` | 1500 | Maximum image width in pixels (resized if exceeded) |
| `IMAGE_MAX_SIZE_KB` | 500 | Target maximum compressed file size in KB |

### AWS S3 Configuration

Image uploads require proper AWS S3 configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret access key |
| `AWS_S3_BUCKET` | Yes | S3 bucket name |
| `AWS_REGION` | Yes | AWS region |

---

## Support

For additional support or questions:

1. Check the Swagger documentation at `/api-docs`
2. Review error messages in API responses
3. Check server logs for detailed error information
4. Contact the development team for integration assistance

---

## Changelog

### Version 1.0.0 (Current)
- Initial Sports API documentation
- Image upload support with automatic processing
- CRUD operations for sports management
- Automatic image replacement based on sport slug

---

**Last Updated**: 2024-01-15

