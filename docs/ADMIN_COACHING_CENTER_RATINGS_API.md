# Admin: Coaching Center Ratings API Documentation

## Overview

The Admin Coaching Center Ratings API lets admins list, view, and moderate coaching center ratings. Ratings can be in **pending**, **approved**, or **rejected** status. Only **approved** ratings are shown on the client; admins can approve or reject pending ratings and update status of any rating.

**Base path (admin):** `/api/v1/admin/ratings`  
(Exact prefix may depend on your app; e.g. `/api/v1/admin` + `/ratings`.)

**Related:** Client-facing ratings are documented in [COACHING_CENTER_RATINGS_API.md](./COACHING_CENTER_RATINGS_API.md).

---

## Permissions

All admin rating endpoints require:

1. **Admin authentication** (Bearer token).
2. **Admin role** (user must have at least one admin section permission).
3. **Section permission:** `coaching_center_ratings`

| Action   | Permission needed              | Endpoints |
|----------|--------------------------------|-----------|
| List/View| `coaching_center_ratings` **view**  | `GET /ratings`, `GET /ratings/:id` |
| Update   | `coaching_center_ratings` **update** | `PATCH /ratings/:id/status` |

Assign the section **coaching_center_ratings** with actions **view** and/or **update** to roles via the admin permissions UI (or seed) so that admins can access these routes.

---

## 1. Get paginated ratings (list)

Returns a paginated list of coaching center ratings with optional filters. Each item includes user and coaching center details.

### Endpoint

```
GET /api/v1/admin/ratings
```

### Authentication

- **Required:** Yes (admin Bearer token)
- **Header:** `Authorization: Bearer {adminAccessToken}`

### Query Parameters

| Parameter           | Type   | Required | Default | Description |
|--------------------|--------|----------|---------|-------------|
| `page`             | number | No       | 1       | Page number |
| `limit`           | number | No       | 20      | Items per page (max 100) |
| `status`          | string | No       | —       | Filter by status: `pending`, `approved`, or `rejected` |
| `coachingCenterId`| string | No       | —       | Filter by coaching center (UUID or MongoDB ObjectId) |

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

| Field                | Type   | Description |
|----------------------|--------|-------------|
| `ratings`            | array  | List of rating objects (see below). |
| `ratings[].id`       | string | Rating document ID (MongoDB _id). |
| `ratings[].rating`   | number | Score 1–5. |
| `ratings[].comment`  | string \| null | Optional comment. |
| `ratings[].status`   | string | `pending`, `approved`, or `rejected`. |
| `ratings[].user`     | object \| null | User who submitted (id, firstName, lastName, email, profileImage). |
| `ratings[].coachingCenter` | object \| null | Center (id, center_name). |
| `pagination`         | object | page, limit, total, totalPages. |

### Error responses

| Status | Description |
|--------|-------------|
| 401    | Unauthorized (missing or invalid token) |
| 403    | Forbidden (not admin or missing `coaching_center_ratings:view` permission) |

### Example

```bash
# All ratings, first page
curl -X GET "http://localhost:3001/api/v1/admin/ratings?page=1&limit=20" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json"

# Only pending ratings
curl -X GET "http://localhost:3001/api/v1/admin/ratings?status=pending" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json"

# Ratings for a specific coaching center
curl -X GET "http://localhost:3001/api/v1/admin/ratings?coachingCenterId=f316a86c-2909-4d32-8983-eb225c715bcb" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json"
```

---

## 2. Get a single rating by ID

Returns one rating by its MongoDB document ID (24-character hex string).

### Endpoint

```
GET /api/v1/admin/ratings/{id}
```

### Authentication

- **Required:** Yes (admin Bearer token)
- **Header:** `Authorization: Bearer {adminAccessToken}`

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
| 401    | Unauthorized |
| 403    | Forbidden (missing `coaching_center_ratings:view`) |
| 404    | Rating not found (invalid or non-existent id) |

### Example

```bash
curl -X GET "http://localhost:3001/api/v1/admin/ratings/674a1b2c3d4e5f6789012345" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json"
```

---

## 3. Update rating status

Sets a rating’s status to **approved**, **rejected**, or **pending**. When status is changed, the coaching center’s `averageRating`, `totalRatings`, and `ratings` array are recalculated (only approved ratings count).

### Endpoint

```
PATCH /api/v1/admin/ratings/{id}/status
```

### Authentication

- **Required:** Yes (admin Bearer token)
- **Header:** `Authorization: Bearer {adminAccessToken}`

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
| 400    | Invalid status (must be `approved`, `rejected`, or `pending`) |
| 401    | Unauthorized |
| 403    | Forbidden (missing `coaching_center_ratings:update`) |
| 404    | Rating not found |

### Example

```bash
# Approve a rating
curl -X PATCH "http://localhost:3001/api/v1/admin/ratings/674a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# Reject a rating
curl -X PATCH "http://localhost:3001/api/v1/admin/ratings/674a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'

# Set back to pending
curl -X PATCH "http://localhost:3001/api/v1/admin/ratings/674a1b2c3d4e5f6789012345/status" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json" \
  -d '{"status": "pending"}'
```

---

## Summary

| Method | Endpoint                     | Permission        | Description           |
|--------|-----------------------------|-------------------|----------------------|
| GET    | `/admin/ratings`            | view              | List ratings (paginated, filterable) |
| GET    | `/admin/ratings/:id`        | view              | Get one rating       |
| PATCH  | `/admin/ratings/:id/status` | update            | Set status (approved / rejected / pending) |

- **Section:** `coaching_center_ratings`
- **Actions used:** `view`, `update`
- Rating **id** in responses is the MongoDB document `_id` (24-character hex); use it for `GET /ratings/:id` and `PATCH /ratings/:id/status`.
