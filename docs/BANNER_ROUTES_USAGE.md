# Banner Routes Usage Guide

## Overview

This guide explains how to use the Banner API routes for displaying banners in user-facing applications and coaching center panels. The banner system supports advanced features like scheduling, targeting, positioning, and analytics tracking.

---

## Table of Contents

1. [User/Public Banner Routes](#userpublic-banner-routes)
2. [Coaching Center Banner Routes](#coaching-center-banner-routes)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [Integration Examples](#integration-examples)
5. [Best Practices](#best-practices)
6. [Error Handling](#error-handling)

---

## User/Public Banner Routes

### Overview

Public banner routes allow any user (authenticated or not) to fetch active banners for display in the application. These routes are designed for frontend integration.

### Base URL

```
http://localhost:3000/api/v1/banners
```

### Endpoints

#### 1. Get Banners by Position

**Endpoint**: `GET /api/v1/banners/:position`

**Description**: Retrieve active banners for a specific position (e.g., homepage_top, sport_page). Banners are automatically filtered by:
- Scheduling (start/end dates)
- Targeting (audience, sport, center)
- Status (only active banners)
- Sorted by priority (highest first)

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `position` (required) - Banner position. Valid values:
  - `homepage_top` - Top of homepage
  - `homepage_middle` - Middle section of homepage
  - `homepage_bottom` - Bottom of homepage
  - `category_top` - Top of category pages
  - `category_sidebar` - Sidebar of category pages
  - `sport_page` - Sport-specific pages
  - `center_page` - Coaching center pages
  - `search_results` - Search results page
  - `mobile_app_home` - Mobile app home screen
  - `mobile_app_category` - Mobile app category screens

**Query Parameters**:
- `sportId` (optional) - Filter banners by sport ID
- `centerId` (optional) - Filter banners by center ID
- `limit` (optional) - Maximum number of banners to return (default: 10, max: 10)
- `targetAudience` (optional) - Filter by target audience:
  - `all` - Show to all users
  - `new_users` - Show only to new users
  - `existing_users` - Show only to existing users
  - `premium_users` - Show only to premium users
  - `mobile_users` - Show only to mobile app users
  - `web_users` - Show only to web users

**Example Request**:
```bash
GET /api/v1/banners/homepage_top?limit=5&sportId=507f1f77bcf86cd799439011&targetAudience=all
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Summer Sports Camp 2024",
        "description": "Join our exciting summer sports camp",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-camp.jpg",
        "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-camp-mobile.jpg",
        "linkUrl": "/sports/cricket",
        "linkType": "internal",
        "position": "homepage_top",
        "priority": 10
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Winter Registration Open",
        "description": "Register now for winter sports coaching",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/winter.jpg",
        "mobileImageUrl": null,
        "linkUrl": "/campaigns/winter-2024",
        "linkType": "internal",
        "position": "homepage_top",
        "priority": 8
      }
    ]
  }
}
```

#### 2. Track Banner View

**Endpoint**: `POST /api/v1/banners/:id/track/view`

**Description**: Increment the view count for a banner (for analytics). This endpoint is optional and failures are silently ignored.

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `id` (required) - Banner ID

**Example Request**:
```bash
POST /api/v1/banners/550e8400-e29b-41d4-a716-446655440000/track/view
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banner view tracked successfully",
  "data": null
}
```

#### 3. Track Banner Click

**Endpoint**: `POST /api/v1/banners/:id/track/click`

**Description**: Increment the click count for a banner (for analytics). This endpoint is optional and failures are silently ignored.

**Authentication**: Optional (public endpoint)

**Path Parameters**:
- `id` (required) - Banner ID

**Example Request**:
```bash
POST /api/v1/banners/550e8400-e29b-41d4-a716-446655440000/track/click
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banner click tracked successfully",
  "data": null
}
```

---

## Coaching Center Banner Routes

### Overview

Coaching center banner routes allow authenticated coaching center users to view banners that are displayed on their center pages. These routes automatically filter banners based on the user's coaching centers.

### Base URL

```
http://localhost:3000/api/v1/academy/banners
```

### Authentication

All coaching center banner routes require authentication with a valid JWT token and ACADEMY role.

**Header**:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### 1. Get All Center Banners

**Endpoint**: `GET /api/v1/academy/banners`

**Description**: Get all active banners that are displayed on the coaching center's page. Returns banners grouped by position (center_page, homepage_top, homepage_middle).

**Authentication**: Required (ACADEMY role)

**Query Parameters**:
- `sportId` (optional) - Filter banners by sport ID
- `limit` (optional) - Maximum number of banners per position (default: 5)

**Example Request**:
```bash
GET /api/v1/academy/banners?limit=5&sportId=507f1f77bcf86cd799439011
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": {
      "center_page": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Elite Academy Special Offer",
          "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/elite-academy.jpg",
          "linkUrl": "/centers/elite-academy",
          "linkType": "internal",
          "position": "center_page",
          "priority": 10
        }
      ],
      "homepage_top": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "title": "Summer Sports Camp",
          "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer.jpg",
          "linkUrl": "/campaigns/summer",
          "linkType": "internal",
          "position": "homepage_top",
          "priority": 8
        }
      ]
    }
  }
}
```

#### 2. Get Banners by Position

**Endpoint**: `GET /api/v1/academy/banners/:position`

**Description**: Get active banners for a specific position that are displayed on the coaching center's page.

**Authentication**: Required (ACADEMY role)

**Path Parameters**:
- `position` (required) - Banner position (same values as public routes)

**Query Parameters**:
- `sportId` (optional) - Filter banners by sport ID
- `limit` (optional) - Maximum number of banners to return (default: 10)

**Example Request**:
```bash
GET /api/v1/academy/banners/center_page?limit=10&sportId=507f1f77bcf86cd799439011
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Elite Academy Special Offer",
        "description": "Special discount for new students",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/elite-academy.jpg",
        "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/elite-academy-mobile.jpg",
        "linkUrl": "/centers/elite-academy",
        "linkType": "internal",
        "position": "center_page",
        "priority": 10
      }
    ]
  }
}
```

---

## API Endpoints Reference

### Public/User Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/banners/:position` | Get active banners by position | No |
| POST | `/api/v1/banners/:id/track/view` | Track banner view | No |
| POST | `/api/v1/banners/:id/track/click` | Track banner click | No |

### Coaching Center Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/academy/banners` | Get all center banners (grouped by position) | Yes (ACADEMY) |
| GET | `/api/v1/academy/banners/:position` | Get banners by position for center | Yes (ACADEMY) |

---

## Integration Examples

### React/Next.js Example - Homepage Banner

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

const HomepageBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get('/api/v1/banners/homepage_top', {
          params: { limit: 5 }
        });
        setBanners(response.data.data.banners);
        
        // Track views (optional, can be debounced)
        response.data.data.banners.forEach(banner => {
          axios.post(`/api/v1/banners/${banner.id}/track/view`).catch(() => {});
        });
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  const handleBannerClick = async (banner) => {
    // Track click
    await axios.post(`/api/v1/banners/${banner.id}/track/click`).catch(() => {});
    
    // Navigate to link
    if (banner.linkType === 'internal') {
      router.push(banner.linkUrl);
    } else {
      window.open(banner.linkUrl, '_blank');
    }
  };

  if (loading) return <div>Loading banners...</div>;
  if (banners.length === 0) return null;

  return (
    <div className="banner-carousel">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="banner-item"
          onClick={() => handleBannerClick(banner)}
        >
          <img
            src={
              typeof window !== 'undefined' && window.innerWidth < 768 && banner.mobileImageUrl
                ? banner.mobileImageUrl
                : banner.imageUrl
            }
            alt={banner.title}
            className="banner-image"
          />
        </div>
      ))}
    </div>
  );
};
```

### React Example - Sport Page Banner

```typescript
const SportPageBanner = ({ sportId }) => {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await axios.get('/api/v1/banners/sport_page', {
          params: { sportId, limit: 1 }
        });
        if (response.data.data.banners.length > 0) {
          setBanner(response.data.data.banners[0]);
          // Track view
          axios.post(`/api/v1/banners/${response.data.data.banners[0].id}/track/view`).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to fetch banner:', error);
      }
    };

    fetchBanner();
  }, [sportId]);

  if (!banner) return null;

  return (
    <div
      className="sport-banner"
      onClick={() => {
        axios.post(`/api/v1/banners/${banner.id}/track/click`).catch(() => {});
        if (banner.linkType === 'internal') {
          router.push(banner.linkUrl);
        } else {
          window.open(banner.linkUrl, '_blank');
        }
      }}
    >
      <img
        src={
          typeof window !== 'undefined' && window.innerWidth < 768 && banner.mobileImageUrl
            ? banner.mobileImageUrl
            : banner.imageUrl
        }
        alt={banner.title}
      />
    </div>
  );
};
```

### React Example - Coaching Center Banner View

```typescript
const CenterBannerView = () => {
  const [banners, setBanners] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const token = localStorage.getItem('academyAccessToken');
        const response = await axios.get('/api/v1/academy/banners', {
          params: { limit: 5 },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setBanners(response.data.data.banners);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  if (loading) return <div>Loading banners...</div>;

  return (
    <div className="center-banners">
      <h3>Banners on Your Center Page</h3>
      {Object.entries(banners).map(([position, positionBanners]) => (
        <div key={position} className="banner-position">
          <h4>{position}</h4>
          {positionBanners.map((banner) => (
            <div key={banner.id} className="banner-preview">
              <img src={banner.imageUrl} alt={banner.title} />
              <p>{banner.title}</p>
              <p>Priority: {banner.priority}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

---

## Best Practices

### 1. Image Handling

- **Responsive Images**: Always check for `mobileImageUrl` on mobile devices
- **Fallback**: Use `imageUrl` if `mobileImageUrl` is not available
- **Lazy Loading**: Implement lazy loading for banner images
- **Error Handling**: Handle image load errors gracefully

```typescript
const bannerImage = useMemo(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 768 && banner.mobileImageUrl) {
    return banner.mobileImageUrl;
  }
  return banner.imageUrl;
}, [banner]);
```

### 2. Tracking

- **View Tracking**: Track views when banner is displayed (can be debounced)
- **Click Tracking**: Track clicks when user interacts
- **Error Handling**: Don't block UI on tracking calls (use catch silently)
- **Debouncing**: Debounce view tracking to avoid excessive API calls

```typescript
// Debounced view tracking
const debouncedTrackView = useMemo(
  () => debounce((bannerId) => {
    axios.post(`/api/v1/banners/${bannerId}/track/view`).catch(() => {});
  }, 1000),
  []
);
```

### 3. Link Handling

- **Link Type**: Check `linkType` before navigation
- **Internal Links**: Use internal routing for `internal` links
- **External Links**: Open `external` links in new tab
- **Validation**: Always validate `linkUrl` before navigation

```typescript
const handleBannerClick = (banner) => {
  if (!banner.linkUrl) return;
  
  if (banner.linkType === 'internal') {
    router.push(banner.linkUrl);
  } else {
    window.open(banner.linkUrl, '_blank');
  }
};
```

### 4. Error Handling

- **API Errors**: Handle cases where banner fetch fails
- **Empty Results**: Handle cases where no banners are returned
- **Network Errors**: Implement retry logic for network failures
- **Graceful Degradation**: Don't break page if banner fetch fails

```typescript
try {
  const response = await axios.get('/api/v1/banners/homepage_top');
  setBanners(response.data.data.banners);
} catch (error) {
  console.error('Failed to fetch banners:', error);
  // Show fallback or empty state
  setBanners([]);
}
```

### 5. Performance

- **Caching**: Cache banner responses when appropriate
- **Lazy Loading**: Load banners only when needed
- **Pagination**: Use limit parameter to control number of banners
- **Image Optimization**: Use optimized images (compressed, appropriate dimensions)

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Invalid Position

```json
{
  "success": false,
  "message": "Invalid banner position",
  "data": null
}
```

**Solution**: Ensure the position parameter matches one of the valid enum values.

#### 401 Unauthorized - Missing Token (Coaching Center Routes)

```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null
}
```

**Solution**: Include a valid JWT token in the Authorization header for coaching center routes.

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to get active banners",
  "data": null
}
```

**Solution**: Check server logs and retry the request. This is usually a temporary server issue.

---

## Banner Position Reference

| Position | Description | Use Case |
|----------|-------------|----------|
| `homepage_top` | Top of homepage | Main promotional banners |
| `homepage_middle` | Middle section of homepage | Secondary promotions |
| `homepage_bottom` | Bottom of homepage | Footer promotions |
| `category_top` | Top of category pages | Category-specific banners |
| `category_sidebar` | Sidebar of category pages | Sidebar promotions |
| `sport_page` | Sport-specific pages | Sport-specific campaigns |
| `center_page` | Coaching center pages | Center-specific promotions |
| `search_results` | Search results page | Search-related promotions |
| `mobile_app_home` | Mobile app home screen | Mobile-specific banners |
| `mobile_app_category` | Mobile app category screens | Mobile category banners |

---

## Testing

### Using Postman

1. **Import Collection**: Import `PlayAsport-API-Collection.json` into Postman
2. **Set Variables**: Set `baseUrl` variable (default: `http://localhost:3000/api/v1`)
3. **Test Public Routes**: Test banner routes without authentication
4. **Test Academy Routes**: Set `accessToken` variable and test academy routes

### Using cURL

**Get Banners by Position**:
```bash
curl -X GET "http://localhost:3000/api/v1/banners/homepage_top?limit=5" \
  -H "accept: application/json"
```

**Track Banner View**:
```bash
curl -X POST "http://localhost:3000/api/v1/banners/550e8400-e29b-41d4-a716-446655440000/track/view" \
  -H "accept: application/json"
```

**Get Center Banners** (requires authentication):
```bash
curl -X GET "http://localhost:3000/api/v1/academy/banners?limit=5" \
  -H "accept: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Related Documentation

- [Admin Banner Management](./ADMIN_BANNER_MANAGEMENT.md) - Complete guide for admin banner management
- [Banner Usage Guide](./BANNER_USAGE_GUIDE.md) - Comprehensive usage guide for all panels
- [Swagger Documentation](http://localhost:3000/api-docs) - Interactive API documentation

---

## Support

For questions or issues:
- Check the [Admin Banner Management Documentation](./ADMIN_BANNER_MANAGEMENT.md)
- Review API documentation in Swagger UI
- Contact the development team

