# Academy & Search Filters – Quick Reference

Short reference: the same filters apply to **Get All Academies** and **Search/Autocomplete**, and list responses include **age** and **disability** flags.

---

## 1. Get All Academies

**Endpoint:** `GET /api/v1/academies`

| Param         | Type    | Description |
|---------------|--------|-------------|
| `page`        | number | Page number (default 1) |
| `limit`       | number | Per page (default 10, max 100) |
| `latitude`    | number | User latitude – for distance sort/filter |
| `longitude`   | number | User longitude – for distance sort/filter |
| `radius`      | number | Max distance (km). Omit or 0 = no limit |
| `city`        | string | Filter by city (partial, case-insensitive) |
| `state`       | string | Filter by state (partial, case-insensitive) |
| `sportId`     | string | Filter by one sport ID |
| `sportIds`    | string | Filter by multiple sport IDs (comma-separated) |
| `gender`      | string | `male` \| `female` \| `other` |
| `for_disabled`| bool/1 | `true` or `1` = only academies with `allowed_disabled: true` |
| `min_age`     | number | Age range – minimum (years) |
| `max_age`     | number | Age range – maximum (years) |

**Example:**  
`/api/v1/academies?page=1&limit=10&city=Mumbai&gender=female&min_age=5&max_age=18&for_disabled=true`

**Sport filter behaviour (Get All Academies):**  
When `sportId` or `sportIds` is used: (1) each academy’s **image** comes from that sport’s `sport_detail` (banner first); (2) filtered sport(s) appear **first** in the **sports** list.

**City/state vs location:**  
When `city` or `state` filter is applied, the **location filter** (latitude, longitude, radius) is **skipped** – no distance filtering or distance-based sorting. Same for Get All Academies, Search, and Autocomplete.

---

## 2. Search & Autocomplete (same filters)

- **Autocomplete:** `GET /api/v1/search/autocomplete?q=cricket&city=Delhi&min_age=8&max_age=15`
- **Full search:** `GET /api/v1/search?q=cricket academy&state=Maharashtra&sportId=xxx&for_disabled=true`

Search and Autocomplete support the same query params: `city`, `state`, `sportId`, `sportIds`, `gender`, `for_disabled`, `min_age`, `max_age`, `radius`, `latitude`, `longitude`. (Full details: `docs/SEARCH_API_FRONTEND_GUIDE.md`)

---

## 3. Academy List Response – Extra Fields

Each academy item (list and search hit) includes these fields:

| Field                  | Type   | Description |
|------------------------|--------|-------------|
| `age`                  | object | `{ min: number, max: number }` – age range (years). Omitted if not set (`undefined`/`null`) |
| `allowed_disabled`     | bool   | `true` = academy allows persons with disability |
| `is_only_for_disabled` | bool   | `true` = academy is only for specially challenged persons |

**Example list item:**
```json
{
  "id": "...",
  "center_name": "Elite Cricket Academy",
  "logo": "...",
  "image": "...",
  "location": { ... },
  "sports": [ ... ],
  "allowed_genders": [ "male", "female" ],
  "age": { "min": 5, "max": 18 },
  "allowed_disabled": true,
  "is_only_for_disabled": false,
  "distance": 2.5
}
```

---

## 4. Age Range Filter Logic

- **Filter:** Send `min_age` and/or `max_age`.
- **Match:** An academy is included when its age range **overlaps** the filter:  
  `academy.age.min <= max_age` and `academy.age.max >= min_age`.
- If only `min_age` is sent: `academy.age.max >= min_age`.
- If only `max_age` is sent: `academy.age.min <= max_age`.

---

*Full search/autocomplete params: `docs/SEARCH_API_FRONTEND_GUIDE.md`*
