# Coaching Center Ratings API Documentation

## Overview

The Coaching Center Ratings API allows users to rate academies (coaching centers) and view ratings. Each user can submit one rating per center and update it later. The **Get Academy by ID** response includes the latest 5 ratings, average rating, total ratings, and flags for the current user (`isAlreadyRated`, `canUpdateRating`).

**Client visibility:** Only **approved** ratings are shown on the client. The academy detail and the ratings list endpoints return only ratings with `status: 'approved'`. New ratings default to `status: 'pending'` until approved. Average and total counts are computed from approved ratings only.

**Base path (client):** `/api/v1/academies`

---

## 1. Get Academy by ID (with ratings)

Returns full academy details including **latest 5 ratings**, **averageRating**, **totalRatings**, and when the user is logged in: **isAlreadyRated**, **canUpdateRating**, with the user's rating first in the list if they have rated.

### Endpoint

```
GET /api/v1/academies/{id}
```

### Authentication

- **Required:** No (optional)
- **When provided:** Email/mobile are unmasked; response includes `isAlreadyRated`, `canUpdateRating`, and the current user's rating is placed first in `ratings` (if they have rated)
- **Header:** `Authorization: Bearer {accessToken}`

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Academy ID: CoachingCenter UUID, MongoDB ObjectId, or academy owner's user ID |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Academy retrieved successfully",
  "data": {
    "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
    "center_name": "Elite Sports Academy",
    "logo": "https://...",
    "location": { "latitude": 28.6139, "longitude": 77.209, "address": { ... } },
    "sports": [{ "id": "...", "name": "Cricket", "logo": "..." }],
    "averageRating": 4.2,
    "totalRatings": 24,
    "ratings": [
      {
        "id": "rating-id-1",
        "rating": 5,
        "comment": "Great coaching and facility.",
        "createdAt": "2024-02-15T10:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "profileImage": "https://..."
        }
      }
    ],
    "isAlreadyRated": true,
    "canUpdateRating": true,
    "isBookmarked": false,
    "sport_details": [ ... ],
    "facility": [ ... ],
    "batches": [ ... ],
    "mobile_number": "9876543210",
    "email": "academy@example.com"
  }
}
```

### Response fields (ratings-related)

| Field            | Type    | Description |
|------------------|---------|-------------|
| `ratings`        | array   | Latest 5 **approved** ratings. When user is logged in and has an approved rating, **their rating is first**. |
| `averageRating`  | number  | Average rating (0–5) across **approved** ratings only. |
| `totalRatings`   | number  | Total number of **approved** ratings. |
| `isAlreadyRated` | boolean | `true` if the current user has already rated this center (only meaningful when logged in). |
| `canUpdateRating`| boolean | `true` if the current user can update their rating (they have rated; only when logged in). |
| `isBookmarked`   | boolean | `true` if the current user has bookmarked this academy (only meaningful when logged in). |

### Request examples

```bash
# Without auth (public)
curl -X GET "http://localhost:3001/api/v1/academies/f316a86c-2909-4d32-8983-eb225c715bcb" \
  -H "Content-Type: application/json"

# With auth (user's rating first, isAlreadyRated, canUpdateRating)
curl -X GET "http://localhost:3001/api/v1/academies/f316a86c-2909-4d32-8983-eb225c715bcb" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json"
```

---

## 2. Submit or update rating

One rating per user per center. If the user has already rated, this updates their rating.

### Endpoint

```
POST /api/v1/academies/{id}/rate
```

### Authentication

- **Required:** Yes
- **Header:** `Authorization: Bearer {accessToken}`

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Coaching center ID (UUID or MongoDB ObjectId) |

### Request Body

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `rating`  | number | Yes      | Rating value 1–5 |
| `comment` | string | No       | Optional comment (max 500 characters) |

### Request example

```bash
curl -X POST "http://localhost:3001/api/v1/academies/f316a86c-2909-4d32-8983-eb225c715bcb/rate" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Excellent academy."}'
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "data": {
    "id": "rating-doc-id",
    "rating": 5,
    "comment": "Excellent academy.",
    "isUpdate": false
  }
}
```

- **`isUpdate`:** `true` if the user updated an existing rating; `false` if it was a new rating.

### Error responses

| Status | Description |
|--------|-------------|
| 400    | Invalid rating (must be 1–5) or missing `rating` |
| 401    | Unauthorized (missing or invalid token) |
| 404    | Coaching center or user not found |

---

## 3. Get paginated ratings for a center

Returns paginated list of **approved** ratings for an academy, with summary stats (average and total are for approved ratings only).

### Endpoint

```
GET /api/v1/academies/{id}/ratings
```

### Authentication

- **Required:** No (optional). If **not logged in**, only the **first 5 ratings** are returned (page and limit are ignored; `totalPages` is 1). If logged in, full pagination applies.

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Coaching center ID |

### Query Parameters (when logged in; ignored for guests)

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| `page`    | number | No       | 1       | Page number |
| `limit`   | number | No       | 20      | Items per page (max 100) |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Ratings retrieved successfully",
  "data": {
    "ratings": [
      {
        "id": "rating-id",
        "rating": 5,
        "comment": "Great experience.",
        "createdAt": "2024-02-15T10:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "firstName": "John",
          "lastName": "Doe",
          "profileImage": "https://..."
        }
      }
    ],
    "total": 24,
    "page": 1,
    "limit": 20,
    "totalPages": 2,
    "averageRating": 4.2,
    "totalRatings": 24
  }
}
```

### Request example

```bash
curl -X GET "http://localhost:3001/api/v1/academies/f316a86c-2909-4d32-8983-eb225c715bcb/ratings?page=1&limit=10" \
  -H "Content-Type: application/json"
```

---

## Client integration summary

| Goal | Action |
|------|--------|
| Show academy detail with latest ratings | `GET /academies/{id}` (optional auth). Use `data.ratings`, `data.averageRating`, `data.totalRatings`. |
| Show “You have already rated” / “Update rating” | Use `data.isAlreadyRated` and `data.canUpdateRating` from `GET /academies/{id}` (with auth). |
| Submit or update rating | `POST /academies/{id}/rate` with `{ "rating": 1-5, "comment": "optional" }` (auth required). |
| List all ratings (e.g. “View all”) | `GET /academies/{id}/ratings?page=1&limit=20`. |
| Pre-fill “My rating” form | When `data.isAlreadyRated === true`, use the first item in `data.ratings` from `GET /academies/{id}` (user’s rating is always first when logged in). |

---

## Swagger

Interactive API docs are available at:

- **Development:** `http://localhost:3001/api-docs`

Look under the **Academy** tag for these endpoints and the **AcademyDetail** schema (includes `ratings`, `averageRating`, `totalRatings`, `isAlreadyRated`, `canUpdateRating`).
