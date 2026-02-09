# Search API – Frontend Developer Guide

Quick reference for frontend developers using the **Search** and **Autocomplete** APIs. Covers query parameters, filters, response shape, and examples.

---

## Base URL

```
/api/v1/search
```

## Authentication

**No authentication required.** Search and autocomplete are public endpoints.

---

## 1. Autocomplete API (search-as-you-type)

Use for live suggestions while the user types.

### Endpoint

```
GET /api/v1/search/autocomplete
```

### Query Parameters

| Parameter   | Type   | Required | Default | Description |
|------------|--------|----------|---------|-------------|
| `q`        | string | **Yes**  | -       | Search query (e.g. "cricket", "s&s"). |
| `size`     | number | No       | 5       | Max results per category (1–50). |
| `index`    | string | No       | all     | Restrict to one index: `sports_index`, `coaching_centres_index`, `reels_index`, `live_streams_index`. |
| `latitude` | number | No       | -       | User latitude for “nearest first” (coaching centres). |
| `longitude`| number | No       | -       | User longitude for “nearest first” (coaching centres). |
| `radius`   | number | No       | no limit| Max distance in km when lat/long provided. Omit or 0 = no limit. |
| `city`     | string | No       | -       | Filter coaching centres by city (MongoDB fallback). |
| `state`    | string | No       | -       | Filter coaching centres by state (MongoDB fallback). |
| `sportId`  | string | No       | -       | Filter coaching centres by one sport ID (MongoDB fallback). |
| `sportIds` | string | No       | -       | Filter by multiple sport IDs, comma-separated (MongoDB fallback). |
| `gender`   | string | No       | -       | Filter by allowed gender: `male`, `female`, `other` (MongoDB fallback). |
| `for_disabled` | boolean/string | No | false | If `true` or `1`, only centres with `allowed_disabled: true` (MongoDB fallback). |
| `min_age`  | number | No       | -       | Filter by age range – minimum age (years). Centres whose age range overlaps [min_age, max_age] are included (MongoDB fallback). |
| `max_age`  | number | No       | -       | Filter by age range – maximum age (years). Centres whose age range overlaps [min_age, max_age] are included (MongoDB fallback). |
| `sort_by`  | string | No       | -       | Use `distance` with lat/long to sort by nearest first. |

### Response (200)

```json
{
  "success": true,
  "message": "Autocomplete results",
  "data": {
    "query": "cricket",
    "query_original": "criket",
    "query_corrected": "cricket",
    "was_corrected": true,
    "corrections": [{ "original": "criket", "corrected": "Cricket" }],
    "total": 10,
    "total_available": 25,
    "size": 10,
    "from": 0,
    "has_more": true,
    "results": [
      {
        "index": "sports_index",
        "id": "sport-uuid",
        "name": "Cricket",
        "type": "sport",
        "priority": 1,
        "highlight": "<em>Cricket</em>"
      },
      {
        "index": "coaching_centres_index",
        "id": "center-uuid",
        "name": "Elite Cricket Academy",
        "type": "coaching_center",
        "priority": 2,
        "highlight": "Elite <em>Cricket</em> Academy",
        "_distance": 5.2
      }
    ],
    "totals_by_index": { "sports_index": 1, "coaching_centres_index": 24 },
    "indices_searched": ["sports_index", "coaching_centres_index", "live_streams_index", "reels_index"]
  }
}
```

- **`query_original` / `query_corrected` / `was_corrected` / `corrections`** – Only present when the backend corrected the query (e.g. typo). Use to show “Showing results for …” or “Did you mean …”.
- **`_distance`** – Present for coaching centres when `latitude` and `longitude` are sent (distance in km).

---

## 2. Full Search API

Use for the main search results page with pagination and filters.

### Endpoint

```
GET /api/v1/search
```

### Query Parameters

| Parameter   | Type   | Required | Default | Description |
|------------|--------|----------|---------|-------------|
| `q` or `query` | string | **Yes** | - | Search query. |
| `size`     | number | No       | 10      | Results per page (1–100). |
| `from`     | number | No       | 0       | Pagination offset. |
| `index`    | string | No       | all     | Restrict to one index (same values as autocomplete). |
| `latitude` | number | No       | -       | User latitude for distance and “nearest first”. |
| `longitude`| number | No       | -       | User longitude for distance and “nearest first”. |
| `radius`   | number | No       | **no limit** | Max distance in km. **Omit or 0 = no limit**; results still sorted by distance when lat/long sent. |
| `sort_by`  | string | No       | -       | Use `distance` with lat/long for nearest first. |
| `city`     | string | No       | -       | Filter coaching centres by city (MongoDB fallback). |
| `state`    | string | No       | -       | Filter coaching centres by state (MongoDB fallback). |
| `sportId`  | string | No       | -       | Filter coaching centres by one sport ID (MongoDB fallback). |
| `sportIds` | string | No       | -       | Filter by multiple sport IDs, comma-separated (MongoDB fallback). |
| `gender`   | string | No       | -       | Filter by allowed gender: `male`, `female`, `other` (MongoDB fallback). |
| `for_disabled` | boolean/string | No | false | If `true` or `1`, only centres that allow persons with disability (MongoDB fallback). |
| `min_age`  | number | No       | -       | Filter by age range – minimum age (years). Centres whose age range overlaps [min_age, max_age] are included (MongoDB fallback). |
| `max_age`  | number | No       | -       | Filter by age range – maximum age (years). Centres whose age range overlaps [min_age, max_age] are included (MongoDB fallback). |

### Response (200)

```json
{
  "success": true,
  "message": "Search results (MongoDB fallback)",
  "data": {
    "query": { "text": "cricket academy", "indices": ["coaching_centres_index", "sports_index", "live_streams_index", "reels_index"] },
    "query_original": "criket acadmy",
    "query_corrected": "cricket academy",
    "was_corrected": true,
    "corrections": [
      { "original": "criket", "corrected": "Cricket" },
      { "original": "acadmy", "corrected": "Academy" }
    ],
    "pagination": {
      "total": 15,
      "total_available": 25,
      "size": 10,
      "from": 0,
      "has_more": true
    },
    "results_by_index": {
      "coaching_centres": {
        "results": [...],
        "total": 12,
        "has_more": true
      },
      "sports": { "results": [...], "total": 1, "has_more": false },
      "live_streams": { "results": [], "total": 0, "has_more": false },
      "reels": { "results": [], "total": 0, "has_more": false }
    },
    "results": [...],
    "took": 0
  }
}
```

### Result item (coaching centre)

Each item in `results` (and inside `results_by_index.*.results`) has:

| Field        | Type   | Description |
|-------------|--------|-------------|
| `index`     | string | e.g. `coaching_centres`. |
| `id`        | string | Centre ID. |
| `score`     | number | Relevance score (often 0). |
| `source`    | object | Main payload (see below). |
| `highlight` | object | Highlighted snippets (if any). |

**`source` (coaching centre):**

| Field            | Type    | Description |
|-----------------|---------|-------------|
| `id`            | string  | Centre ID. |
| `name`          | string  | Centre name. |
| `description`   | string  | Description. |
| `address`       | string  | Address. |
| `latitude` / `longitude` | number | Coordinates. |
| `logo`          | string \| null | Logo URL. |
| `images`        | string[]| Image URLs (up to 2). |
| `allowed_gender`| string[]| e.g. `["male", "female"]`. |
| `sports_names`  | string[]| Sport names. |
| `location_name` | string \| null | Location name. |
| `experience`    | number \| null | Years of experience. |
| `pincode`       | string \| null | Pincode. |
| `distance`      | number \| null | Distance in km (when lat/long sent). |
| `allowed_disabled` | boolean | `true` if the academy serves/supports specially challenged (persons with disability). |
| `is_only_for_disabled` | boolean | `true` if the academy is **only** for specially challenged (exclusively). Use with `allowed_disabled`: if `is_only_for_disabled` show "Specifically for specially challenged"; else if `allowed_disabled` show "Serves specially challenged / inclusive". |

---

## 3. Behaviour and tips

### Auto-correction

- Backend may correct typos (e.g. "criket" → "cricket", "acadmy" → "academy") using sports, centre names, cities, etc.
- Use `was_corrected`, `query_original`, `query_corrected`, and `corrections` to show “Showing results for **cricket**” or “Did you mean …”.

### Normalisation

- Phrases like “near me”, “popular”, “best” are stripped from the query; only the core terms are searched.
- “S and S” / “s & s” are normalised to “s&s” so they match names like “S&S Football Academy”.
- For “near me” behaviour, **always send `latitude` and `longitude`**; order is by distance. Use `radius` only when you want to cap max distance.

### Radius

- **Default = no limit**: if `radius` is omitted or 0, all matching centres are returned (still sorted by distance when lat/long are sent).
- To restrict by distance, send `radius` in km (e.g. `radius=25`).

### Filters (MongoDB fallback)

When the backend uses MongoDB (Meilisearch disabled), these filters apply to **coaching centres**:

- `city`, `state` – partial, case-insensitive match.
- `sportId` / `sportIds` – centres that offer the given sport(s). IDs can be MongoDB ObjectId or `custom_id`.
- `gender` – centres that allow this gender: `male`, `female`, `other`.
- `for_disabled` – only centres with `allowed_disabled: true`.

When Meilisearch is enabled, filters may not apply the same way; behaviour is backend-dependent.

### Special characters

- For “s&s”, send **encoded**: `q=s%26s`.
- “s and s” and “s & s” can be sent as-is; they are normalised to match “S&S”.

---

## 4. Request examples

### Autocomplete (fetch)

```javascript
const params = new URLSearchParams({
  q: 'cricket',
  size: '5',
  latitude: '22.5944',
  longitude: '88.4089',
  radius: '50',
  for_disabled: 'false'
});

const res = await fetch(`/api/v1/search/autocomplete?${params}`);
const data = await res.json();
```

### Full search with filters (fetch)

```javascript
const params = new URLSearchParams({
  q: 'cricket academy',
  size: '10',
  from: '0',
  latitude: '22.5944',
  longitude: '88.4089',
  city: 'Mumbai',
  state: 'Maharashtra',
  sportId: '507f1f77bcf86cd799439011',
  gender: 'female',
  for_disabled: 'true'
});
// Omit radius for no distance limit; add radius=25 to limit to 25 km

const res = await fetch(`/api/v1/search?${params}`);
const data = await res.json();
```

### Full search (axios)

```javascript
const { data } = await axios.get('/api/v1/search', {
  params: {
    q: 'football',
    size: 10,
    from: 0,
    latitude: 22.5944,
    longitude: 88.4089,
    city: 'Kolkata',
    state: 'West Bengal',
    for_disabled: true
    // no radius = no distance limit, results sorted by distance
  }
});
```

### “Near me” + nearest first

Send user location; do not send `radius` if you don’t want a max distance:

```javascript
// User allows location
const position = await getCurrentPosition();
const params = new URLSearchParams({
  q: 'cricket academy near me',
  size: '10',
  latitude: String(position.coords.latitude),
  longitude: String(position.coords.longitude)
  // no radius = show all, sorted by nearest first
});

const res = await fetch(`/api/v1/search?${params}`);
```

### Persons with disability

Only centres that allow persons with disability:

```javascript
const params = new URLSearchParams({
  q: 'swimming',
  for_disabled: '1'
});
const res = await fetch(`/api/v1/search?${params}`);
```

---

## 5. Errors

| Status | Meaning |
|--------|--------|
| 400 | Missing or invalid `q` / `query`. |
| 500 | Server error. |
| 503 | Service unavailable (e.g. Meilisearch disabled; backend uses MongoDB fallback). |

---

## 6. Quick reference

| Need | Autocomplete | Full search | Params |
|------|--------------|-------------|--------|
| Suggestions while typing | `GET /api/v1/search/autocomplete` | - | `q`, `size`, optional `index`, `lat`/`long`/`radius`, filters |
| Search results + pagination | - | `GET /api/v1/search` | `q`, `size`, `from`, optional `index`, filters |
| Nearest first | Both | Both | `latitude`, `longitude`; omit `radius` for no limit |
| Limit by distance | Both | Both | `radius` (km) |
| Filter by city/state | Both | Both | `city`, `state` |
| Filter by sport | Both | Both | `sportId` or `sportIds` |
| Filter by gender | Both | Both | `gender`: `male` \| `female` \| `other` |
| Only disability-friendly | Both | Both | `for_disabled=true` or `1` |
| Show “Did you mean?” | Both | Both | Use `was_corrected`, `query_corrected`, `corrections` |

All search endpoints are public and do not require authentication.
