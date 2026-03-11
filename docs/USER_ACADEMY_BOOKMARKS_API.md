# User Academy Bookmarks API Documentation

## Overview

The User Academy Bookmarks API allows authenticated users to save academies (coaching centers) to a personal bookmark list. Bookmarks are stored in a separate `UserAcademyBookmark` collection. When users add or remove bookmarks, the API returns the **updated list of bookmarked academies** with full academy details (same format as `AcademyListItem`).

**Base path:** `/api/v1/user/auth`

**Authentication:** All endpoints require USER role authentication via `Authorization: Bearer {accessToken}`.

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/auth/academy-bookmarks` | Get all bookmarked academies |
| POST | `/user/auth/academy-bookmarks` | Add academy to bookmarks |
| DELETE | `/user/auth/academy-bookmarks/{academyId}` | Remove academy from bookmarks |

---

## 1. Get Bookmarked Academies

Returns all academies the user has bookmarked, with full details. Ordered by most recently bookmarked first.

### Endpoint

```
GET /api/v1/user/auth/academy-bookmarks
```

### Authentication

- **Required:** Yes (USER role)
- **Header:** `Authorization: Bearer {accessToken}`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Bookmarked academies retrieved successfully",
  "data": {
    "bookmarks": [
      {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "center_name": "Elite Sports Academy",
        "logo": "https://...",
        "image": "https://...",
        "location": {
          "latitude": 28.6139,
          "longitude": 77.209,
          "address": {
            "line1": null,
            "line2": "Near Metro Station",
            "city": "New Delhi",
            "state": "Delhi",
            "country": "India",
            "pincode": "110001"
          }
        },
        "sports": [
          { "id": "...", "name": "Cricket", "logo": "...", "is_popular": true }
        ],
        "allowed_genders": ["male", "female"],
        "age": { "min": 5, "max": 18 },
        "allowed_disabled": true,
        "is_only_for_disabled": false,
        "averageRating": 4.2,
        "totalRatings": 24
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.bookmarks` | array | List of bookmarked academies in `AcademyListItem` format |
| `data.bookmarks[].id` | string | Academy ID (CoachingCenter UUID) |
| `data.bookmarks[].center_name` | string | Academy name |
| `data.bookmarks[].logo` | string \| null | Academy logo URL |
| `data.bookmarks[].image` | string \| null | One image from sport_details |
| `data.bookmarks[].location` | object | Location with coordinates and address |
| `data.bookmarks[].sports` | array | Sports offered (id, name, logo, is_popular) |
| `data.bookmarks[].averageRating` | number | Average rating (0-5) |
| `data.bookmarks[].totalRatings` | number | Total number of ratings |

### Request Example

```bash
curl -X GET "http://localhost:3001/api/v1/user/auth/academy-bookmarks" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json"
```

---

## 2. Add Academy to Bookmarks

Adds an academy to the user's bookmarks. Only **published, active, and approved** academies can be bookmarked. Returns the updated list of bookmarked academies after the change.

### Endpoint

```
POST /api/v1/user/auth/academy-bookmarks
```

### Authentication

- **Required:** Yes (USER role)
- **Header:** `Authorization: Bearer {accessToken}`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `academyId` | string | Yes | Academy ID - CoachingCenter UUID or MongoDB ObjectId |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Academy added to bookmarks",
  "data": {
    "bookmarks": [
      {
        "id": "f316a86c-2909-4d32-8983-eb225c715bcb",
        "center_name": "Elite Sports Academy",
        "logo": "https://...",
        "image": "https://...",
        "location": { ... },
        "sports": [ ... ],
        "allowed_genders": ["male", "female"],
        "age": { "min": 5, "max": 18 },
        "averageRating": 4.2,
        "totalRatings": 24
      }
    ],
    "added": true
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.bookmarks` | array | **Updated** list of bookmarked academies (populated) |
| `data.added` | boolean | `true` if academy was newly added; `false` if already bookmarked |

### Error Responses

| Status | Description |
|--------|-------------|
| 404 | Academy not found (invalid ID, or academy is not published/approved) |
| 401 | Unauthorized (missing or invalid token) |

### Request Example

```bash
curl -X POST "http://localhost:3001/api/v1/user/auth/academy-bookmarks" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"academyId": "f316a86c-2909-4d32-8983-eb225c715bcb"}'
```

---

## 3. Remove Academy from Bookmarks

Removes an academy from the user's bookmarks. Returns the updated list of bookmarked academies after the change.

### Endpoint

```
DELETE /api/v1/user/auth/academy-bookmarks/{academyId}
```

### Authentication

- **Required:** Yes (USER role)
- **Header:** `Authorization: Bearer {accessToken}`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `academyId` | string | Yes | Academy ID - CoachingCenter UUID or MongoDB ObjectId |

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Academy removed from bookmarks",
  "data": {
    "bookmarks": [],
    "removed": true
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.bookmarks` | array | **Updated** list of bookmarked academies (populated) |
| `data.removed` | boolean | `true` if bookmark was removed; `false` if academy was not bookmarked |

### Request Example

```bash
curl -X DELETE "http://localhost:3001/api/v1/user/auth/academy-bookmarks/f316a86c-2909-4d32-8983-eb225c715bcb" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json"
```

---

## Data Model

### UserAcademyBookmark Collection

- **user:** ObjectId (ref: User)
- **academy:** ObjectId (ref: CoachingCenter)
- **createdAt:** Date
- **updatedAt:** Date

Unique compound index on `(user, academy)` ensures one bookmark per user per academy.

### Academy ID Resolution

The `academyId` parameter accepts:
- **CoachingCenter UUID** (`id` field), e.g. `f316a86c-2909-4d32-8983-eb225c715bcb`
- **MongoDB ObjectId** (`_id`), e.g. `507f1f77bcf86cd799439011`

Only academies that are:
- `status: 'published'`
- `is_active: true`
- `approval_status: 'approved'`
- `is_deleted: false`

can be bookmarked.

---

## Frontend Integration Notes

1. **Optimistic updates:** After add/remove, the response includes the full updated list. Use `data.bookmarks` directly to update UI without a separate GET request.

2. **Empty state:** `bookmarks` is always an array (may be empty). No need to handle `null`.

3. **Duplicate add:** If the user adds an already-bookmarked academy, the API returns `added: false` with the current list. No error.

4. **Removal of non-bookmarked:** If the user removes an academy that wasn't bookmarked, the API returns `removed: false` with the current list. No error.
