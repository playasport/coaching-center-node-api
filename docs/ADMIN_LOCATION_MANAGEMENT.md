# Admin Location Management API Documentation

## Overview

The Admin Location Management API provides endpoints for managing countries, states, and cities in the system. This allows administrators to maintain the geographic hierarchy used throughout the application.

## Base URL

All endpoints are prefixed with `/api/v1/admin/locations`

## Authentication

All endpoints require:
- **Authentication**: Valid JWT token in the `Authorization` header
- **Admin Role**: User must have admin role (super_admin, admin, employee, or agent)
- **Permissions**: Specific permission checks based on action (location:view, location:create, location:update, location:delete)

## Endpoints

### Countries

#### 1. Get All Countries

Retrieve a paginated list of all countries with optional filtering and search.

**Endpoint:** `GET /admin/locations/countries`

**Permission Required:** `location:view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (minimum: 1) |
| limit | integer | No | 10 | Number of records per page (minimum: 1, maximum: 100) |
| search | string | No | - | Search by name, code, iso2, or iso3 (case-insensitive) |
| region | string | No | - | Filter by geographic region |
| subregion | string | No | - | Filter by geographic subregion |
| sortBy | string | No | name | Field to sort by (name, code, createdAt, updatedAt) |
| sortOrder | string | No | asc | Sort order (`asc` or `desc`) |

**Example Request:**

```bash
GET /api/v1/admin/locations/countries?page=1&limit=20&search=india&region=Asia&sortBy=name&sortOrder=asc
Authorization: Bearer <token>
```

**Example Response:**

```json
{
  "success": true,
  "message": "Countries retrieved successfully",
  "data": {
    "countries": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "India",
        "code": "IN",
        "iso2": "IN",
        "iso3": "IND",
        "phoneCode": "+91",
        "currency": "INR",
        "currencySymbol": "₹",
        "region": "Asia",
        "subregion": "Southern Asia",
        "latitude": 20.5937,
        "longitude": 78.9629,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 195,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### 2. Get Country by ID

Retrieve a specific country by its ID. Supports MongoDB ObjectId, code, iso2, or iso3.

**Endpoint:** `GET /admin/locations/countries/:id`

**Permission Required:** `location:view`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Country ID (ObjectId, code, iso2, or iso3) |

#### 3. Create Country

Create a new country.

**Endpoint:** `POST /admin/locations/countries`

**Permission Required:** `location:create`

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | string | Yes | 1-200 characters | Country name |
| code | string | No | Max 10 characters | Country code |
| iso2 | string | No | Exactly 2 characters | ISO 3166-1 alpha-2 code |
| iso3 | string | No | Exactly 3 characters | ISO 3166-1 alpha-3 code |
| phoneCode | string | No | Max 10 characters | Phone country code (e.g., +91) |
| currency | string | No | Max 10 characters | Currency code (e.g., INR) |
| currencySymbol | string | No | Max 10 characters | Currency symbol (e.g., ₹) |
| region | string | No | Max 100 characters | Geographic region |
| subregion | string | No | Max 100 characters | Geographic subregion |
| latitude | number | No | -90 to 90 | Latitude coordinate |
| longitude | number | No | -180 to 180 | Longitude coordinate |

**Example Request:**

```bash
POST /api/v1/admin/locations/countries
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "India",
  "code": "IN",
  "iso2": "IN",
  "iso3": "IND",
  "phoneCode": "+91",
  "currency": "INR",
  "currencySymbol": "₹",
  "region": "Asia",
  "subregion": "Southern Asia",
  "latitude": 20.5937,
  "longitude": 78.9629
}
```

#### 4. Update Country

Update an existing country. All fields are optional.

**Endpoint:** `PATCH /admin/locations/countries/:id`

**Permission Required:** `location:update`

#### 5. Delete Country

Delete a country. Cannot delete if country has associated states.

**Endpoint:** `DELETE /admin/locations/countries/:id`

**Permission Required:** `location:delete`

**Error Responses:**

- **400 Bad Request**: Cannot delete country with associated states
- **404 Not Found**: Country not found

### States

#### 1. Get All States

Retrieve a paginated list of all states with optional filtering and search.

**Endpoint:** `GET /admin/locations/states`

**Permission Required:** `location:view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| limit | integer | No | 10 | Number of records per page |
| search | string | No | - | Search by name, stateCode, or countryName |
| countryId | string | No | - | Filter by country ID |
| countryCode | string | No | - | Filter by country code |
| sortBy | string | No | name | Field to sort by |
| sortOrder | string | No | asc | Sort order |

**Example Request:**

```bash
GET /api/v1/admin/locations/states?page=1&limit=10&countryCode=IN&search=delhi
Authorization: Bearer <token>
```

#### 2. Get State by ID

Retrieve a specific state by its ID. Supports MongoDB ObjectId or stateCode.

**Endpoint:** `GET /admin/locations/states/:id`

**Permission Required:** `location:view`

#### 3. Create State

Create a new state.

**Endpoint:** `POST /admin/locations/states`

**Permission Required:** `location:create`

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | string | Yes | 1-200 characters | State name |
| countryId | string | Yes* | - | Country ID (required if countryCode not provided) |
| countryCode | string | Yes* | - | Country code (required if countryId not provided) |
| stateCode | string | No | Max 10 characters | State code |
| latitude | number | No | -90 to 90 | Latitude coordinate |
| longitude | number | No | -180 to 180 | Longitude coordinate |

*Either countryId or countryCode is required.

**Example Request:**

```bash
POST /api/v1/admin/locations/states
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Delhi",
  "countryCode": "IN",
  "stateCode": "DL",
  "latitude": 28.6139,
  "longitude": 77.209
}
```

#### 4. Update State

Update an existing state. All fields are optional.

**Endpoint:** `PATCH /admin/locations/states/:id`

**Permission Required:** `location:update`

#### 5. Delete State

Delete a state. Cannot delete if state has associated cities.

**Endpoint:** `DELETE /admin/locations/states/:id`

**Permission Required:** `location:delete`

**Error Responses:**

- **400 Bad Request**: Cannot delete state with associated cities
- **404 Not Found**: State not found

### Cities

#### 1. Get All Cities

Retrieve a paginated list of all cities with optional filtering and search.

**Endpoint:** `GET /admin/locations/cities`

**Permission Required:** `location:view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| limit | integer | No | 10 | Number of records per page |
| search | string | No | - | Search by name, stateName, or countryName |
| stateId | string | No | - | Filter by state ID |
| stateName | string | No | - | Filter by state name |
| countryId | string | No | - | Filter by country ID |
| countryCode | string | No | - | Filter by country code |
| sortBy | string | No | name | Field to sort by |
| sortOrder | string | No | asc | Sort order |

**Example Request:**

```bash
GET /api/v1/admin/locations/cities?page=1&limit=10&stateName=Delhi&countryCode=IN
Authorization: Bearer <token>
```

#### 2. Get City by ID

Retrieve a specific city by its ID. Supports MongoDB ObjectId or city name.

**Endpoint:** `GET /admin/locations/cities/:id`

**Permission Required:** `location:view`

#### 3. Create City

Create a new city.

**Endpoint:** `POST /admin/locations/cities`

**Permission Required:** `location:create`

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| name | string | Yes | 1-200 characters | City name |
| stateId | string | Yes* | - | State ID (required if stateName not provided) |
| stateName | string | Yes* | - | State name (required if stateId not provided) |
| latitude | number | No | -90 to 90 | Latitude coordinate |
| longitude | number | No | -180 to 180 | Longitude coordinate |

*Either stateId or stateName is required.

**Example Request:**

```bash
POST /api/v1/admin/locations/cities
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Delhi",
  "stateName": "Delhi",
  "latitude": 28.6139,
  "longitude": 77.209
}
```

#### 4. Update City

Update an existing city. All fields are optional.

**Endpoint:** `PATCH /admin/locations/cities/:id`

**Permission Required:** `location:update`

#### 5. Delete City

Delete a city.

**Endpoint:** `DELETE /admin/locations/cities/:id`

**Permission Required:** `location:delete`

## Data Models

### Country Schema

```typescript
{
  _id: string;              // MongoDB ObjectId
  name: string;             // Country name (required, indexed)
  code?: string;            // Country code
  iso2?: string;            // ISO 3166-1 alpha-2 code (indexed)
  iso3?: string;            // ISO 3166-1 alpha-3 code
  phoneCode?: string;       // Phone country code
  currency?: string;        // Currency code
  currencySymbol?: string;  // Currency symbol
  region?: string;          // Geographic region
  subregion?: string;       // Geographic subregion
  latitude?: number;        // Latitude coordinate
  longitude?: number;       // Longitude coordinate
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}
```

### State Schema

```typescript
{
  _id: string;              // MongoDB ObjectId
  name: string;             // State name (required, indexed)
  countryId?: string;       // Country ID (indexed)
  countryCode?: string;     // Country code (indexed)
  countryName?: string;     // Country name
  stateCode?: string;       // State code
  latitude?: number;        // Latitude coordinate
  longitude?: number;       // Longitude coordinate
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}
```

### City Schema

```typescript
{
  _id: string;              // MongoDB ObjectId
  name: string;             // City name (required, indexed)
  stateId?: string;         // State ID (indexed)
  stateName?: string;       // State name (indexed)
  stateCode?: string;       // State code
  countryId?: string;       // Country ID (indexed)
  countryCode?: string;     // Country code (indexed)
  countryName?: string;     // Country name
  latitude?: number;        // Latitude coordinate
  longitude?: number;       // Longitude coordinate
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last update timestamp
}
```

## Validation Rules

### Country
- **name**: Required, 1-200 characters, unique (case-insensitive)
- **code**: Optional, max 10 characters
- **iso2**: Optional, exactly 2 characters (auto-uppercased)
- **iso3**: Optional, exactly 3 characters (auto-uppercased)
- **latitude**: Optional, -90 to 90
- **longitude**: Optional, -180 to 180

### State
- **name**: Required, 1-200 characters, unique within country (case-insensitive)
- **countryId** or **countryCode**: Required (one of them)
- **stateCode**: Optional, max 10 characters
- **latitude**: Optional, -90 to 90
- **longitude**: Optional, -180 to 180

### City
- **name**: Required, 1-200 characters, unique within state (case-insensitive)
- **stateId** or **stateName**: Required (one of them)
- **latitude**: Optional, -90 to 90
- **longitude**: Optional, -180 to 180

## Search Functionality

### Countries
Searches across: name, code, iso2, iso3

### States
Searches across: name, stateCode, countryName

### Cities
Searches across: name, stateName, countryName

All searches are case-insensitive and use partial matching.

## Filtering

### Countries
- **region**: Filter by geographic region
- **subregion**: Filter by geographic subregion

### States
- **countryId**: Filter by country ID
- **countryCode**: Filter by country code

### Cities
- **stateId**: Filter by state ID
- **stateName**: Filter by state name
- **countryId**: Filter by country ID
- **countryCode**: Filter by country code

## Sorting

All endpoints support sorting by any field in the schema. Default sort fields:
- Countries: `name` (ascending)
- States: `name` (ascending)
- Cities: `name` (ascending)

## Pagination

All list endpoints support pagination with the following response structure:

```json
{
  "pagination": {
    "page": 1,           // Current page number
    "limit": 10,         // Records per page
    "total": 100,        // Total number of records
    "totalPages": 10,    // Total number of pages
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

- **400 Bad Request**: Validation error or business logic violation (e.g., duplicate name, cannot delete with associations)
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User lacks required permissions
- **404 Not Found**: Location not found
- **500 Internal Server Error**: Server error

## Permission Requirements

| Endpoint | Method | Permission Required |
|----------|--------|---------------------|
| Get All Countries | GET | `location:view` |
| Get Country by ID | GET | `location:view` |
| Create Country | POST | `location:create` |
| Update Country | PATCH | `location:update` |
| Delete Country | DELETE | `location:delete` |
| Get All States | GET | `location:view` |
| Get State by ID | GET | `location:view` |
| Create State | POST | `location:create` |
| Update State | PATCH | `location:update` |
| Delete State | DELETE | `location:delete` |
| Get All Cities | GET | `location:view` |
| Get City by ID | GET | `location:view` |
| Create City | POST | `location:create` |
| Update City | PATCH | `location:update` |
| Delete City | DELETE | `location:delete` |

**Note**: Super Admin users bypass all permission checks.

## Usage Examples

### Example 1: List Countries by Region

```bash
curl -X GET "https://api.example.com/api/v1/admin/locations/countries?page=1&limit=20&region=Asia&sortBy=name&sortOrder=asc" \
  -H "Authorization: Bearer <token>"
```

### Example 2: Create a New State

```bash
curl -X POST "https://api.example.com/api/v1/admin/locations/states" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maharashtra",
    "countryCode": "IN",
    "stateCode": "MH",
    "latitude": 19.7515,
    "longitude": 75.7139
  }'
```

### Example 3: Search Cities by State

```bash
curl -X GET "https://api.example.com/api/v1/admin/locations/cities?page=1&limit=10&stateName=Delhi&search=mumbai" \
  -H "Authorization: Bearer <token>"
```

### Example 4: Update Country

```bash
curl -X PATCH "https://api.example.com/api/v1/admin/locations/countries/IN" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "South Asia",
    "subregion": "Southern Asia"
  }'
```

## Notes

1. **Hierarchical Relationships**: 
   - States must belong to a country
   - Cities must belong to a state
   - When creating/updating states or cities, the system automatically resolves and stores country information

2. **ID Support**: 
   - Countries: Supports ObjectId, code, iso2, or iso3
   - States: Supports ObjectId or stateCode
   - Cities: Supports ObjectId or city name

3. **Deletion Constraints**:
   - Cannot delete a country if it has associated states
   - Cannot delete a state if it has associated cities
   - Cities can be deleted freely

4. **Auto-population**: 
   - When creating a state, country information (countryId, countryCode, countryName) is automatically populated
   - When creating a city, state and country information is automatically populated

5. **Case Sensitivity**: 
   - Name uniqueness checks are case-insensitive
   - ISO codes are automatically uppercased

6. **Coordinates**: 
   - Latitude: -90 to 90
   - Longitude: -180 to 180

## Integration with Coaching Centers

Locations are referenced by coaching centers in their address information. The location hierarchy (country → state → city) is used throughout the application for filtering and searching coaching centers.

## Related Endpoints

- **Public Location List**: `GET /api/v1/location/countries`, `/states`, `/cities` - Returns location data (no authentication required)
- **Coaching Center Location**: Locations are used in coaching center addresses and filtering

