# Banner Usage Guide

## Overview

This guide explains how to use the Banner Management System across three different panels:
1. **Admin Panel** - Create and manage banners
2. **Coaching Center Panel** - View and understand banner placement
3. **User Panel** - Display banners to end users

---

## Table of Contents

1. [Admin Panel Usage](#admin-panel-usage)
2. [Coaching Center Panel Usage](#coaching-center-panel-usage)
3. [User Panel Usage](#user-panel-usage)
4. [API Integration Examples](#api-integration-examples)
5. [Frontend Implementation Examples](#frontend-implementation-examples)
6. [Best Practices](#best-practices)

---

## Admin Panel Usage

### Overview

Admins use the admin panel to create, manage, and monitor all banners across the platform. The admin panel provides full CRUD operations and advanced management features.

### Access Requirements

- **Authentication**: Admin must be logged in
- **Permissions**: Requires banner permissions:
  - `banner:view` - View banners
  - `banner:create` - Create banners
  - `banner:update` - Update banners
  - `banner:delete` - Delete banners

### Key Features

#### 1. View All Banners

**Endpoint**: `GET /api/v1/admin/banners`

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `position` - Filter by position (e.g., `homepage_top`)
- `status` - Filter by status (e.g., `active`, `inactive`)
- `search` - Search by title or description
- `sortBy` - Sort field (default: `createdAt`)
- `sortOrder` - Sort order (`asc` or `desc`)

**Example Request**:
```bash
GET /api/v1/admin/banners?page=1&limit=20&position=homepage_top&status=active
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": [
      {
        "id": "banner-123",
        "title": "Summer Sports Camp 2024",
        "description": "Join our exciting summer camp",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer.jpg",
        "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-mobile.jpg",
        "linkUrl": "/sports/cricket",
        "linkType": "internal",
        "position": "homepage_top",
        "priority": 10,
        "status": "active",
        "targetAudience": "all",
        "isActive": true,
        "isOnlyForAcademy": false,
        "clickCount": 1250,
        "viewCount": 8500,
        "sportIds": null,
        "centerIds": null,
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-15T14:30:00.000Z"
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

#### 2. Create a New Banner

**Endpoint**: `POST /api/v1/admin/banners`

**Request Body**:
```json
{
  "title": "Winter Sports Registration",
  "description": "Register now for winter sports coaching",
  "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/winter.jpg",
  "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/winter-mobile.jpg",
  "linkUrl": "/sports/football",
  "linkType": "internal",
  "position": "homepage_top",
  "priority": 8,
  "status": "active",
  "targetAudience": "all",
  "isActive": true,
  "isOnlyForAcademy": false,
  "sportIds": ["sport-id-1"],
  "centerIds": null,
  "metadata": {
    "campaignId": "winter-2024"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Banner created successfully",
  "data": {
    "banner": {
      "id": "banner-456",
      "title": "Winter Sports Registration",
      ...
    }
  }
}
```

#### 3. Update Banner Status

**Endpoint**: `PATCH /api/v1/admin/banners/:id/status`

**Request Body**:
```json
{
  "status": "inactive"
}
```

#### 4. Reorder Banners

**Endpoint**: `POST /api/v1/admin/banners/reorder`

**Request Body**:
```json
{
  "bannerOrders": [
    { "id": "banner-123", "priority": 15 },
    { "id": "banner-456", "priority": 10 },
    { "id": "banner-789", "priority": 5 }
  ]
}
```

### Admin Panel Workflow

1. **Create Banner**:
   - Navigate to Banner Management section
   - Click "Create New Banner"
   - Fill in required fields (title, image, position)
   - Configure targeting, scheduling, and priority
   - Save banner

2. **Manage Banners**:
   - View all banners with filters
   - Edit banner details
   - Activate/deactivate banners
   - Reorder banners by priority

3. **Monitor Performance**:
   - View click and view counts
   - Analyze banner performance
   - Update or remove low-performing banners

4. **Status Management**:
   - Manually update banner status as needed
   - Monitor expired banners and update/remove them

---

## Coaching Center Panel Usage

### Overview

Coaching centers can view banners that are targeted to their center or general banners. They can see which banners are displayed on their center page and understand banner placement.

### Access Requirements

- **Authentication**: Coaching center must be logged in
- **Permissions**: Typically read-only access to view banners

### Key Features

#### 1. View Banners for Your Center

**Endpoint**: `GET /api/v1/academy/banners` (to be implemented)

**Query Parameters**:
- `position` - Filter by position (e.g., `center_page`)
- `limit` - Number of banners to return (default: 10)

**Example Request**:
```bash
GET /api/v1/academy/banners?position=center_page&limit=5
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": [
      {
        "id": "banner-123",
        "title": "Elite Academy Special Offer",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/elite-academy.jpg",
        "linkUrl": "/centers/elite-academy",
        "linkType": "internal",
        "position": "center_page",
        "priority": 10
      }
    ]
  }
}
```

#### 2. View Banner Analytics (if permitted)

Coaching centers may be able to see analytics for banners displayed on their center page:
- View count
- Click count
- Performance metrics

### Coaching Center Panel Workflow

1. **View Center Banners**:
   - Navigate to Banner section
   - View banners displayed on your center page
   - See banner details and links

2. **Request Banner Placement**:
   - Contact admin to request banner placement
   - Provide banner content and requirements
   - Admin creates and configures banner

3. **Monitor Performance**:
   - View analytics for banners on your center page
   - Understand user engagement

---

## User Panel Usage

### Overview

End users see banners displayed throughout the application based on their context (homepage, sport pages, center pages, etc.). Banners are automatically filtered by position, targeting, and scheduling.

### Access Requirements

- **Authentication**: Not required (public endpoint)
- **Permissions**: None required

### Key Features

#### 1. Fetch Banners by Position

**Endpoint**: `GET /api/v1/banners/:position` (to be implemented)

**Path Parameters**:
- `position` - Banner position (e.g., `homepage_top`, `sport_page`)

**Query Parameters**:
- `sportId` - Filter by sport (optional)
- `centerId` - Filter by center (optional)
- `limit` - Number of banners (default: 10)

**Example Request**:
```bash
GET /api/v1/banners/homepage_top?limit=3
```

**Example Response**:
```json
{
  "success": true,
  "message": "Banners retrieved successfully",
  "data": {
    "banners": [
      {
        "id": "banner-123",
        "title": "Summer Sports Camp 2024",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer.jpg",
        "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-mobile.jpg",
        "linkUrl": "/sports/cricket",
        "linkType": "internal",
        "priority": 10
      },
      {
        "id": "banner-456",
        "title": "Winter Registration Open",
        "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/winter.jpg",
        "linkUrl": "/campaigns/winter-2024",
        "linkType": "internal",
        "priority": 8
      }
    ]
  }
}
```

#### 2. Track Banner View

**Endpoint**: `POST /api/v1/banners/:id/track/view`

**Purpose**: Track when a banner is displayed to a user (for analytics)

**Example Request**:
```bash
POST /api/v1/banners/banner-123/track/view
```

**Response**:
```json
{
  "success": true,
  "message": "Banner view tracked successfully"
}
```

#### 3. Track Banner Click

**Endpoint**: `POST /api/v1/banners/:id/track/click`

**Purpose**: Track when a user clicks on a banner (for analytics)

**Example Request**:
```bash
POST /api/v1/banners/banner-123/track/click
```

**Response**:
```json
{
  "success": true,
  "message": "Banner click tracked successfully"
}
```

### User Panel Workflow

1. **Banner Display**:
   - Banners automatically appear based on position
   - Filtered by targeting rules (audience, sport, center)
   - Respects scheduling (start/end dates)
   - Sorted by priority

2. **User Interaction**:
   - User sees banner
   - Frontend tracks view (optional)
   - User clicks banner
   - Frontend tracks click
   - User redirected to linkUrl

3. **Responsive Display**:
   - Desktop shows `imageUrl`
   - Mobile shows `mobileImageUrl` (if available) or `imageUrl`

---

## API Integration Examples

### 1. Admin Panel Integration

#### React/Next.js Example

```typescript
// Admin Banner Management Component
import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminBannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/admin/banners', {
        params: {
          page: 1,
          limit: 20,
          status: 'active',
          position: 'homepage_top'
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setBanners(response.data.data.banners);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBanner = async (bannerData) => {
    try {
      const response = await axios.post('/api/v1/admin/banners', bannerData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      await fetchBanners(); // Refresh list
      return response.data;
    } catch (error) {
      console.error('Failed to create banner:', error);
      throw error;
    }
  };

  const updateBannerStatus = async (bannerId, status) => {
    try {
      await axios.patch(
        `/api/v1/admin/banners/${bannerId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      );
      await fetchBanners(); // Refresh list
    } catch (error) {
      console.error('Failed to update banner status:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <div>
      {/* Banner list UI */}
    </div>
  );
};
```

### 2. User Panel Integration

#### React/Next.js Example

```typescript
// User Banner Display Component
import { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';

const BannerCarousel = ({ position, sportId, centerId }) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const params = { limit: 5 };
        if (sportId) params.sportId = sportId;
        if (centerId) params.centerId = centerId;

        const response = await axios.get(
          `/api/v1/banners/${position}`,
          { params }
        );
        setBanners(response.data.data.banners);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, [position, sportId, centerId]);

  const handleBannerClick = async (banner) => {
    // Track click
    try {
      await axios.post(`/api/v1/banners/${banner.id}/track/click`);
    } catch (error) {
      console.error('Failed to track click:', error);
    }

    // Navigate to link
    if (banner.linkType === 'internal') {
      window.location.href = banner.linkUrl;
    } else {
      window.open(banner.linkUrl, '_blank');
    }
  };

  const handleBannerView = async (bannerId) => {
    // Track view (optional, can be debounced)
    try {
      await axios.post(`/api/v1/banners/${bannerId}/track/view`);
    } catch (error) {
      // Silently fail - tracking is not critical
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
          onLoad={() => handleBannerView(banner.id)}
        >
          <Image
            src={
              window.innerWidth < 768 && banner.mobileImageUrl
                ? banner.mobileImageUrl
                : banner.imageUrl
            }
            alt={banner.title}
            width={1920}
            height={400}
            className="banner-image"
          />
        </div>
      ))}
    </div>
  );
};

// Usage
<BannerCarousel 
  position="homepage_top" 
  sportId={currentSportId}
  centerId={currentCenterId}
/>
```

### 3. Coaching Center Panel Integration

#### React Example

```typescript
// Coaching Center Banner View Component
import { useState, useEffect } from 'react';
import axios from 'axios';

const CenterBannerView = ({ centerId }) => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get('/api/v1/academy/banners', {
          params: {
            position: 'center_page',
            limit: 10
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('academyToken')}`
          }
        });
        setBanners(response.data.data.banners);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };

    fetchBanners();
  }, [centerId]);

  return (
    <div className="center-banners">
      <h3>Banners on Your Center Page</h3>
      {banners.map((banner) => (
        <div key={banner.id} className="banner-preview">
          <img src={banner.imageUrl} alt={banner.title} />
          <p>{banner.title}</p>
          <p>Priority: {banner.priority}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## Frontend Implementation Examples

### 1. Homepage Banner Carousel

```typescript
// HomepageBanner.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const HomepageBanner = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get('/api/v1/banners/homepage_top', {
          params: { limit: 5 }
        });
        setBanners(response.data.data.banners);
        
        // Track views
        response.data.data.banners.forEach(banner => {
          axios.post(`/api/v1/banners/${banner.id}/track/view`).catch(() => {});
        });
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };

    fetchBanners();
  }, []);

  const handleBannerClick = async (banner) => {
    await axios.post(`/api/v1/banners/${banner.id}/track/click`).catch(() => {});
    
    if (banner.linkType === 'internal') {
      router.push(banner.linkUrl);
    } else {
      window.open(banner.linkUrl, '_blank');
    }
  };

  if (banners.length === 0) return null;

  return (
    <Swiper
      spaceBetween={0}
      slidesPerView={1}
      autoplay={{ delay: 5000 }}
      loop={banners.length > 1}
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
          <div
            onClick={() => handleBannerClick(banner)}
            className="cursor-pointer"
          >
            <img
              src={
                typeof window !== 'undefined' && window.innerWidth < 768 && banner.mobileImageUrl
                  ? banner.mobileImageUrl
                  : banner.imageUrl
              }
              alt={banner.title}
              className="w-full h-auto"
            />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
```

### 2. Sport Page Banner

```typescript
// SportPageBanner.tsx
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

### 3. Center Page Banner

```typescript
// CenterPageBanner.tsx
const CenterPageBanner = ({ centerId }) => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get('/api/v1/banners/center_page', {
          params: { centerId, limit: 3 }
        });
        setBanners(response.data.data.banners);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };

    fetchBanners();
  }, [centerId]);

  return (
    <div className="center-banners-grid">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="center-banner-item"
          onClick={() => {
            axios.post(`/api/v1/banners/${banner.id}/track/click`).catch(() => {});
            if (banner.linkType === 'internal') {
              router.push(banner.linkUrl);
            } else {
              window.open(banner.linkUrl, '_blank');
            }
          }}
        >
          <img src={banner.imageUrl} alt={banner.title} />
        </div>
      ))}
    </div>
  );
};
```

---

## Best Practices

### For Admins

1. **Image Optimization**:
   - Use compressed images (max 500KB)
   - Recommended dimensions: Desktop (1920x400px), Mobile (800x400px)
   - Provide mobile-specific images for better UX

2. **Priority Management**:
   - Use priority 1-10 for most banners
   - Reserve higher priorities (10+) for important campaigns
   - Regularly review and reorder banners

3. **Status Management**:
   - Monitor expired banners and update/remove them
   - Manually update banner status as needed

4. **Targeting**:
   - Use `all` audience for general promotions
   - Use specific targeting for personalized campaigns
   - Test targeting with small audiences first

5. **Analytics**:
   - Regularly check click/view counts
   - Remove or update low-performing banners
   - A/B test different banner designs

### For Frontend Developers

1. **Responsive Images**:
   - Always check for `mobileImageUrl` on mobile devices
   - Fallback to `imageUrl` if mobile image not available
   - Use appropriate image dimensions

2. **Error Handling**:
   - Handle cases where no banners are returned
   - Gracefully handle API errors
   - Don't break page if banner fetch fails

3. **Performance**:
   - Lazy load banner images
   - Debounce view tracking calls
   - Cache banner responses when appropriate

4. **Tracking**:
   - Track views when banner is displayed
   - Track clicks when user interacts
   - Don't block UI on tracking calls (use catch silently)

5. **Link Handling**:
   - Check `linkType` before navigation
   - Use internal routing for `internal` links
   - Open `external` links in new tab

### For Coaching Centers

1. **Banner Requests**:
   - Provide clear banner requirements
   - Include target audience information
   - Specify desired placement and duration

2. **Content Guidelines**:
   - Follow platform branding guidelines
   - Ensure images are high quality
   - Keep text concise and clear

---

## API Endpoints Summary

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/banners` | Get all banners (with filters) |
| POST | `/api/v1/admin/banners` | Create new banner |
| GET | `/api/v1/admin/banners/:id` | Get banner by ID |
| PATCH | `/api/v1/admin/banners/:id` | Update banner |
| DELETE | `/api/v1/admin/banners/:id` | Delete banner |
| PATCH | `/api/v1/admin/banners/:id/status` | Update banner status |
| POST | `/api/v1/admin/banners/reorder` | Reorder banners |

### Public/Client Endpoints (To Be Implemented)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/banners/:position` | Get active banners by position |
| POST | `/api/v1/banners/:id/track/view` | Track banner view |
| POST | `/api/v1/banners/:id/track/click` | Track banner click |

### Coaching Center Endpoints (To Be Implemented)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/academy/banners` | Get banners for center |

---

## Next Steps

1. **Implement Public Banner Routes**: Create client-facing routes for fetching banners
2. **Implement Coaching Center Routes**: Create academy routes for viewing center banners
3. **Add Banner Preview**: Allow admins to preview banners before publishing
4. **Add Bulk Operations**: Support bulk create/update/delete
5. **Add Banner Templates**: Pre-defined banner templates for common use cases

---

## Support

For questions or issues:
- Check the [Admin Banner Management Documentation](./ADMIN_BANNER_MANAGEMENT.md)
- Review API documentation in Swagger UI
- Contact the development team

