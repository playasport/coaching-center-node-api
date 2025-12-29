# Coaching Center Statistics API Documentation

## Overview

The Coaching Center Statistics API provides comprehensive analytics and insights about coaching centers in the system. This endpoint is designed for admin dashboard usage and requires appropriate permissions.

## Endpoint

```
GET /admin/coaching-centers/stats
```

## Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **Header**: `Authorization: Bearer {adminAccessToken}`
- **Permission Required**: `coaching_center:view`

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | Filter statistics from this date (YYYY-MM-DD format) | `2024-01-01` |
| `endDate` | string | No | Filter statistics until this date (YYYY-MM-DD format) | `2024-12-31` |
| `userId` | string | No | Filter by Academy owner ID | `f316a86c-2909-4d32-8983-eb225c715bcb` |
| `status` | string | No | Filter by center status | `draft` or `published` |
| `isActive` | string | No | Filter by active status | `"true"` or `"false"` |
| `sportId` | string | No | Filter by sport ID | `507f1f77bcf86cd799439011` |
| `search` | string | No | Search by center name, email, or mobile number | `Elite` |

### Filtering

- **Date Filtering**: If `startDate` is provided, only coaching centers created on or after this date are included. If `endDate` is provided, only coaching centers created on or before this date are included. If both are provided, statistics are calculated for the date range. If neither is provided, statistics include all non-deleted coaching centers.
- **User Filtering**: Filter statistics for centers owned by a specific academy user
- **Status Filtering**: Filter by center status (`draft` or `published`)
- **Active Status Filtering**: Filter by active/inactive status
- **Sport Filtering**: Filter statistics for centers offering a specific sport
- **Search Filtering**: Search by center name, email, or mobile number (case-insensitive)
- **Combined Filters**: All filters can be combined for precise statistics

## Request Examples

### Basic Request (All Time Statistics)

```http
GET /admin/coaching-centers/stats
Authorization: Bearer {adminAccessToken}
```

### Request with Date Range

```http
GET /admin/coaching-centers/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {adminAccessToken}
```

### Request with Multiple Filters

```http
GET /admin/coaching-centers/stats?status=published&isActive=true&sportId=507f1f77bcf86cd799439011&search=Elite
Authorization: Bearer {adminAccessToken}
```

### cURL Example

```bash
# With date range
curl -X GET "http://localhost:3001/api/v1/admin/coaching-centers/stats?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json"

# With multiple filters
curl -X GET "http://localhost:3001/api/v1/admin/coaching-centers/stats?status=published&isActive=true&sportId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer {adminAccessToken}" \
  -H "Content-Type: application/json"
```

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Coaching center statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 250,
      "byStatus": {
        "draft": 50,
        "published": 200
      },
      "byActiveStatus": {
        "active": 220,
        "inactive": 30
      },
      "bySport": {
        "Cricket": 80,
        "Football": 60,
        "Basketball": 40,
        "Tennis": 30,
        "Swimming": 40
      },
      "byCity": {
        "New Delhi": 50,
        "Mumbai": 45,
        "Bangalore": 40,
        "Chennai": 35,
        "Kolkata": 30,
        "Hyderabad": 25,
        "Pune": 25
      },
      "byState": {
        "Delhi": 50,
        "Maharashtra": 70,
        "Karnataka": 40,
        "Tamil Nadu": 35,
        "West Bengal": 30,
        "Telangana": 25
      },
      "allowingDisabled": 150,
      "onlyForDisabled": 10
    }
  }
}
```

## Response Fields

### Root Level

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `message` | string | Human-readable message describing the result |
| `data` | object | Contains the statistics data |

### Stats Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of coaching centers (non-deleted) |
| `byStatus` | object | Count of centers grouped by status (draft, published) |
| `byActiveStatus` | object | Count of centers by active status |
| `bySport` | object | Count of centers by sport name (key: sport name, value: count) |
| `byCity` | object | Count of centers grouped by city (key: city name, value: count) |
| `byState` | object | Count of centers grouped by state (key: state name, value: count) |
| `allowingDisabled` | number | Number of centers that allow disabled participants |
| `onlyForDisabled` | number | Number of centers exclusively for disabled participants |

### byStatus Object

Contains counts for each status:
- `draft`: Centers in draft status
- `published`: Centers that are published

### byActiveStatus Object

| Field | Type | Description |
|-------|------|-------------|
| `active` | number | Number of active centers (`is_active: true`) |
| `inactive` | number | Number of inactive centers (`is_active: false`) |

### bySport Object

Dynamic object where:
- **Key**: Sport name (e.g., "Cricket", "Football")
- **Value**: Number of centers offering this sport

**Note**: A center can offer multiple sports, so counts may overlap.

### byCity Object

Dynamic object where:
- **Key**: City name from `location.address.city`
- **Value**: Number of centers in that city

### byState Object

Dynamic object where:
- **Key**: State name from `location.address.state`
- **Value**: Number of centers in that state

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions"
}
```

**Cause**: User doesn't have `coaching_center:view` permission.

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Use Cases

### 1. Dashboard Overview

Display key metrics on the admin dashboard:
- Total centers
- Published vs Draft ratio
- Active vs Inactive centers
- Average experience level

### 2. Geographic Analysis

Analyze center distribution:
- Which cities have the most centers
- State-wise distribution
- Identify underserved regions

### 3. Sport Coverage Analysis

Understand sport offerings:
- Most popular sports
- Sports with fewer centers (opportunities)
- Multi-sport centers

### 4. Compliance Monitoring

Track administrative completeness:
- Centers with bank information (payment ready)
- Centers without bank information (needs attention)

### 5. Accessibility Analysis

Monitor disability access:
- Centers allowing disabled participants
- Centers exclusively for disabled participants
- Accessibility coverage percentage

### 6. Time-Based Analysis

Use date filters to:
- Track growth over time periods
- Compare statistics between periods
- Generate monthly/quarterly reports

## Example Use Cases

### Monthly Growth Report

```http
GET /admin/coaching-centers/stats?startDate=2024-01-01&endDate=2024-01-31
```

Compare with previous month:
```http
GET /admin/coaching-centers/stats?startDate=2023-12-01&endDate=2023-12-31
```

### Year-to-Date Statistics

```http
GET /admin/coaching-centers/stats?startDate=2024-01-01&endDate=2024-12-31
```

## Notes

1. **Soft Deleted Centers**: Only non-deleted centers (`is_deleted: false`) are included in statistics
2. **Multiple Sports**: A center can offer multiple sports, so sport counts may overlap
3. **Null Values**: Cities or states with null values are excluded from geographic statistics
4. **Experience Calculation**: Average experience is calculated from the `experience` field and rounded to 2 decimal places
5. **Performance**: This endpoint uses MongoDB aggregation pipelines for efficient calculation
6. **Caching**: Consider implementing caching for frequently accessed statistics

## Related Endpoints

- `GET /admin/coaching-centers` - Get paginated list of coaching centers
- `GET /admin/coaching-centers/:id` - Get specific coaching center details
- `GET /admin/bookings/stats` - Get booking statistics
- `GET /admin/payments/stats` - Get payment statistics

## Version History

- **v1.0.0** (2024-01-XX): Initial release with comprehensive statistics

