# Academy: Coaching Center Ratings API Documentation

## Overview

The Academy Coaching Center Ratings API lets academy users (coaching center owners) list, view, and moderate ratings for **their own** coaching centers. Ratings can be in **pending**, **approved**, or **rejected** status. Only **approved** ratings are shown on the client; academies can approve or reject pending ratings and update status of any rating that belongs to one of their centers.

**Base path (academy):** `/api/v1/academy/ratings`  
(Exact prefix may depend on your app; e.g. `/api/v1` + `/academy/ratings`.)

**Related:**
- [ADMIN_COACHING_CENTER_RATINGS_API.md](./ADMIN_COACHING_CENTER_RATINGS_API.md) – Admin rating moderation.
- [COACHING_CENTER_RATINGS_API.md](./COACHING_CENTER_RATINGS_API.md) – Client-facing submit/list ratings.

---

## Authentication

All academy rating endpoints require:

1. **Academy authentication** (Bearer token from academy login).
2. **Academy role** (user must have role `academy`).

| Action   | Endpoints |
|----------|-----------|
| List     | `GET /academy/ratings` |
| View one | `GET /academy/ratings/:id` |
| Update   | `PATCH /academy/ratings/:id/status` |

Only ratings for coaching centers **owned by the authenticated academy user** are visible and editable. If the academy has multiple centers, they can filter by `coachingCenterId` or see all.

---

## 1. Get paginated ratings (list)

Returns a paginated list of ratings for coaching centers owned by the authenticated academy. Optional filters by status and by one of their coaching center IDs.

### Endpoint

```
GET /api/v1/academy/ratings
```

### Authentication

- **Required:** Yes (academy Bearer token)
- **Header:** `Authorization: Bearer {academyAccessToken}`

### Query Parameters

| Parameter           | Type   | Required | Default | Description |
|--------------------|--------|----------|---------|-------------|
| `page`             | number | No       | 1       | Page number |
| `limit`            | number | No       | 20      | Items per page (max 100) |
| `status`           | string | No       | —       | Filter by status: `pending`, `approved`, or `rejected` |
| `coachingCenterId` | string | No       | —       | Filter by one of your coaching center IDs (UUID or MongoDB ObjectId) |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Ratings retrieved successfully",
  "data": {
    "ratings": [
      {
        "id": "674a1b2c3d4e5f6789012345",
        "rating": 5,
        "comment": "Great coaching and facility.",
        "status": "pending",
        "createdAt": "2024-02-15T10:00:00.000Z",
        "updatedAt": "2024-02-15T10:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "profileImage": "https://..."
        },
        "coachingCenter": {
          "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
          "center_name": "Elite Sports Academy"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Response fields

| Field                  | Type   | Description |
|------------------------|--------|-------------|
| `ratings`              | array  | List of rating objects (see below). |
| `ratings[].id`         | string | Rating document ID (MongoDB _id). |
| `ratings[].rating`     | number | Score 1–5. |
| `ratings[].comment`   | string \| null | Optional comment. |
| `ratings[].status`     | string | `pending`, `approved`, or `rejected`. |
| `ratings[].user`       | object \| null | User who submitted (id, firstName, lastName, email, profileImage). |
| `ratings[].coachingCenter` | object \| null | Center (id, center_name). |
| `pagination`           | object | page, limit, total, totalPages. |

### Error responses

| Status | Description |
|--------|-------------|
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (user is not academy role) |

### Example

```bash
# All ratings for your centers, first page
curl -X GET "http://localhost:3001/api/v1/academy/ratings?page=1&limit=20" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json"

# Only pending ratings
curl -X GET "http://localhost:3001/api/v1/academy/ratings?status=pending" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json"

# Ratings for a specific coaching center (must be one you own)
curl -X GET "http://localhost:3001/api/v1/academy/ratings?coachingCenterId=f316a86c-2909-4d32-8983-eb225c715bcb" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json"
```

---

## 2. Get a single rating by ID

Returns one rating by its MongoDB document ID. Only returns the rating if it belongs to one of the academy's coaching centers.

### Endpoint

```
GET /api/v1/academy/ratings/{id}
```

### Authentication

- **Required:** Yes (academy Bearer token)
- **Header:** `Authorization: Bearer {academyAccessToken}`

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Rating document ID (MongoDB _id, 24 hex characters) |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Rating retrieved successfully",
  "data": {
    "rating": {
      "id": "674a1b2c3d4e5f6789012345",
      "rating": 5,
      "comment": "Great coaching and facility.",
      "status": "pending",
      "createdAt": "2024-02-15T10:00:00.000Z",
      "updatedAt": "2024-02-15T10:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "profileImage": "https://..."
      },
      "coachingCenter": {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "center_name": "Elite Sports Academy"
      }
    }
  }
}
```

### Error responses

| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 403 | Forbidden (not academy role) |
| 404 | Rating not found (invalid id or rating does not belong to your centers) |

### Example

```bash
curl -X GET "http://localhost:3001/api/v1/academy/ratings/674a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json"
```

---

## 3. Update rating status

Sets a rating's status to **approved**, **rejected**, or **pending**. Only allowed for ratings that belong to one of the academy's coaching centers. When status changes, the coaching center's `averageRating`, `totalRatings`, and `ratings` array are recalculated (only approved ratings count).

### Endpoint

```
PATCH /api/v1/academy/ratings/{id}/status
```

### Authentication

- **Required:** Yes (academy Bearer token)
- **Header:** `Authorization: Bearer {academyAccessToken}`

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Rating document ID (MongoDB _id) |

### Request Body

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `status` | string | Yes      | One of: `approved`, `rejected`, `pending` |

```json
{
  "status": "approved"
}
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Rating status updated successfully",
  "data": {
    "rating": {
      "id": "674a1b2c3d4e5f6789012345",
      "rating": 5,
      "comment": "Great coaching and facility.",
      "status": "approved",
      "createdAt": "2024-02-15T10:00:00.000Z",
      "updatedAt": "2024-02-15T11:30:00.000Z",
      "user": {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "profileImage": "https://..."
      },
      "coachingCenter": {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "center_name": "Elite Sports Academy"
      }
    }
  }
}
```

### Error responses

| Status | Description |
|--------|-------------|
| 400 | Invalid status (must be `approved`, `rejected`, or `pending`) |
| 401 | Unauthorized |
| 403 | Forbidden (not academy role) |
| 404 | Rating not found |

### Example

```bash
# Approve a rating
curl -X PATCH "http://localhost:3001/api/v1/academy/ratings/674a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# Reject a rating
curl -X PATCH "http://localhost:3001/api/v1/academy/ratings/674a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'

# Set back to pending
curl -X PATCH "http://localhost:3001/api/v1/academy/ratings/674a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer {academyAccessToken}" \
  -H "Content-Type: application/json" \
  -d '{"status": "pending"}'
```

---

## Summary

| Method | Endpoint                        | Description |
|--------|----------------------------------|-------------|
| GET    | `/academy/ratings`              | List ratings for your coaching centers (paginated, filterable) |
| GET    | `/academy/ratings/:id`          | Get one rating (only if it belongs to your centers) |
| PATCH  | `/academy/ratings/:id/status`   | Set status (approved / rejected / pending) |

- **Auth:** Academy Bearer token + `academy` role.
- **Scope:** All operations are restricted to coaching centers owned by the authenticated academy user.
- Rating **id** in responses is the MongoDB document `_id` (24-character hex); use it for `GET /academy/ratings/:id` and `PATCH /academy/ratings/:id/status`.
