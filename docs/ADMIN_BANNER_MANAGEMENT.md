# Admin Banner Management System

## Overview

The Banner Management System provides comprehensive tools for administrators to create, manage, and track promotional banners across the PlayAsport platform. This system includes advanced features like positioning, targeting, priority management, and analytics.

## Why This System Was Created

### Business Requirements

1. **Promotional Campaigns**: Admins need to create and manage promotional banners for marketing campaigns, special offers, and announcements.

2. **Flexible Positioning**: Different banner positions (homepage, category pages, mobile app) require different banner configurations.

3. **Targeting**: Banners should be able to target specific audiences (new users, existing users, mobile users, etc.) or specific sports/centers.

5. **Priority Management**: Multiple banners in the same position need priority ordering to control display sequence.

6. **Analytics**: Track banner performance with click and view counts.

### Technical Reasons

1. **Centralized Management**: All banners managed from one admin interface with consistent structure.

2. **Performance**: Efficient querying with proper indexes for active banners by position.

3. **Flexibility**: Support for multiple positions and targeting without code changes.

4. **Analytics Integration**: Built-in tracking for clicks and views.

## Banner Model Structure

### Core Fields

- **id**: Unique UUID identifier
- **title**: Banner title (max 200 characters)
- **description**: Optional description (max 1000 characters)
- **imageUrl**: Main banner image URL (required)
- **mobileImageUrl**: Optional mobile-specific image URL
- **linkUrl**: URL to redirect when banner is clicked
- **linkType**: Type of link (`internal` or `external`)

### Positioning & Display

- **position**: Where banner should be displayed (enum: `BannerPosition`)
- **priority**: Display order (higher number = higher priority, displayed first)
- **status**: Banner status (enum: `BannerStatus`)
- **isActive**: Quick enable/disable toggle
- **isOnlyForAcademy**: If `true`, banner is only shown to academies, not to regular users (default: `false`)

### Targeting

- **targetAudience**: Who should see the banner (enum: `BannerTargetAudience`)
- **isOnlyForAcademy**: If `true`, banner is only shown to academies, not to regular users (default: `false`)
- **sportIds**: Show banner only for specific sports (array, optional)
- **centerIds**: Show banner only for specific centers (array, optional)

### Analytics

- **clickCount**: Number of times banner was clicked
- **viewCount**: Number of times banner was viewed

### Metadata

- **metadata**: Additional flexible data (JSON object)
- **createdBy**: Admin user ID who created the banner
- **updatedBy**: Admin user ID who last updated
- **deletedAt**: Soft delete timestamp

## Banner Positions

Available banner positions:

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

## Banner Status

- `active` - Currently active and visible
- `inactive` - Not active (hidden)
- `expired` - Expired (manually set)
- `draft` - Not yet published

## Target Audience

- `all` - Show to all users
- `new_users` - Show only to new users
- `existing_users` - Show only to existing users
- `premium_users` - Show only to premium users
- `mobile_users` - Show only to mobile app users
- `web_users` - Show only to web users

## API Routes

### GET `/admin/banners`
Get all banners with advanced filtering.

**Query Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page (max: 100)
- `position` (enum): Filter by position
- `status` (enum): Filter by status
- `targetAudience` (enum): Filter by target audience
- `isActive` (boolean): Filter by active status
- `search` (string): Search by title or description
- `sortBy` (string, default: `createdAt`): Field to sort by
- `sortOrder` (enum, default: `desc`): Sort order

**Permission Required**: `banner:view`

### POST `/admin/banners`
Create a new banner.

**Option 1: Upload images first, then create banner (Recommended)**
```bash
# Step 1: Upload images
POST /api/v1/admin/banners/upload-images
Content-Type: multipart/form-data
image: [desktop-banner.jpg]
mobileImage: [mobile-banner.jpg]

# Step 2: Create banner with returned URLs
POST /api/v1/admin/banners
{
  "title": "Summer Sports Camp 2024",
  "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg",
  "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/mobile/uuid.jpg",
  "position": "homepage_top"
}
```

**Option 2: Provide image URLs directly**
**Request Body** (required fields):
```json
{
  "title": "Summer Sports Camp 2024",
  "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-camp.jpg",
  "position": "homepage_top"
}
```

**Request Body** (all fields):
```json
{
  "title": "Summer Sports Camp 2024",
  "description": "Join our exciting summer sports camp",
  "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-camp.jpg",
  "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/summer-camp-mobile.jpg",
  "linkUrl": "/sports/cricket",
  "linkType": "internal",
  "position": "homepage_top",
  "priority": 10,
  "status": "active",
  "targetAudience": "all",
  "isActive": true,
  "isOnlyForAcademy": false,
  "sportIds": ["sport-id-1", "sport-id-2"],
  "centerIds": ["center-id-1"],
  "metadata": {
    "campaignId": "summer-2024",
    "utm_source": "banner"
  }
}
```

**Permission Required**: `banner:create`

### GET `/admin/banners/:id`
Get banner by ID.

**Permission Required**: `banner:view`

### PATCH `/admin/banners/:id`
Update banner (all fields optional).

**Permission Required**: `banner:update`

### DELETE `/admin/banners/:id`
Soft delete banner.

**Permission Required**: `banner:delete`

### PATCH `/admin/banners/:id/status`
Update banner status only.

**Request Body**:
```json
{
  "status": "active"
}
```

**Permission Required**: `banner:update`

### POST `/admin/banners/reorder`
Reorder banners by updating priorities.

**Request Body**:
```json
{
  "bannerOrders": [
    { "id": "banner-id-1", "priority": 10 },
    { "id": "banner-id-2", "priority": 9 },
    { "id": "banner-id-3", "priority": 8 }
  ]
}
```

**Permission Required**: `banner:update`

### POST `/admin/banners/:id/track/click`
Track banner click (increments clickCount).

**Permission Required**: `banner:view`

### POST `/admin/banners/:id/track/view`
Track banner view (increments viewCount).

**Permission Required**: `banner:view`

## Advanced Features

### 1. Priority Management

Banners with higher priority values are displayed first:

```json
{
  "position": "homepage_top",
  "priority": 10  // Higher priority = shown first
}
```

Use the reorder endpoint to update multiple banner priorities at once.

### 3. Academy-Only Banners

Set `isOnlyForAcademy: true` to create banners that are only visible to academies:

```json
{
  "title": "Academy Dashboard Update",
  "imageUrl": "https://.../academy-update.jpg",
  "position": "center_page",
  "isOnlyForAcademy": true,
  "status": "active"
}
```

**Behavior:**
- ✅ Shows to all academies via `/academy/banners`
- ❌ Does NOT show to regular users via `/banners/:position`
- Useful for academy-specific announcements, training materials, or internal communications

### 4. Targeting

#### Target by Audience
```json
{
  "targetAudience": "new_users"  // Show only to new users
}
```

#### Target by Sport
```json
{
  "sportIds": ["cricket-sport-id", "football-sport-id"]
}
```

#### Target by Center
```json
{
  "centerIds": ["elite-academy-id"]
}
```

### 4. Mobile-Specific Images

Provide different images for mobile and desktop:

```json
{
  "imageUrl": "https://.../banner-desktop.jpg",
  "mobileImageUrl": "https://.../banner-mobile.jpg"
}
```

### 5. Link Types

- **internal**: Links within the app (e.g., `/sports/cricket`)
- **external**: External URLs (e.g., `https://example.com`)

### 6. Analytics

Track banner performance:

- **clickCount**: Incremented when `/track/click` is called
- **viewCount**: Incremented when `/track/view` is called

Use these metrics to measure banner effectiveness.

## Use Cases

### 1. Create Homepage Banner
```bash
POST /admin/banners
{
  "title": "Summer Camp 2024",
  "imageUrl": "https://.../summer-camp.jpg",
  "position": "homepage_top",
  "priority": 10,
  "status": "active",
  "linkUrl": "/campaigns/summer-2024",
  "linkType": "internal"
}
```

### 2. Create Academy-Only Banner
```bash
POST /admin/banners
{
  "title": "Academy Special Offer",
  "imageUrl": "https://.../academy-offer.jpg",
  "position": "center_page",
  "status": "active",
  "isOnlyForAcademy": true
}
```

This banner will:
- ✅ Show to all academies via `/academy/banners`
- ❌ NOT show to regular users via `/banners/:position`

### 3. Create Seasonal Banner
```bash
POST /admin/banners
{
  "title": "Winter Sports Registration",
  "imageUrl": "https://.../winter.jpg",
  "position": "homepage_top",
  "status": "active",
  "isOnlyForAcademy": false
}
```

### 4. Target Specific Sport
```bash
POST /admin/banners
{
  "title": "Cricket Coaching Special",
  "imageUrl": "https://.../cricket.jpg",
  "position": "sport_page",
  "sportIds": ["cricket-sport-id"],
  "status": "active"
}
```

### 5. Reorder Banners
```bash
POST /admin/banners/reorder
{
  "bannerOrders": [
    { "id": "banner-1", "priority": 15 },
    { "id": "banner-2", "priority": 10 },
    { "id": "banner-3", "priority": 5 }
  ]
}
```

### 5. Track Banner Performance
```bash
# When user views banner
POST /admin/banners/:id/track/view

# When user clicks banner
POST /admin/banners/:id/track/click
```

## Image Upload Specifications

### Allowed Image Types

- **JPEG** (`.jpg`, `.jpeg`) - Recommended for photos
- **PNG** (`.png`) - Recommended for graphics with transparency
- **WebP** (`.webp`) - Modern format with better compression
- **GIF** (`.gif`) - Animated or static GIFs (no compression applied)

### File Size Limitations

- **Maximum File Size**: 5 MB per image (configurable via `MAX_IMAGE_SIZE_MB`)
- **Desktop Banner**: Recommended < 500 KB after compression
- **Mobile Banner**: Recommended < 300 KB after compression

### Image Compression

✅ **Automatic compression is enabled** with the following settings:

- **Max Width**: 1500px (configurable via `IMAGE_MAX_WIDTH`)
- **Target Size**: 500 KB (configurable via `IMAGE_MAX_SIZE_KB`)
- **Quality**: Adaptive (starts at 85, reduces if needed)
- **Format Optimization**: PNG without transparency may be converted to JPEG

### Recommended Dimensions

- **Desktop Banner** (`imageUrl`): 1920x400px (aspect ratio 4.8:1)
- **Mobile Banner** (`mobileImageUrl`): 800x400px (aspect ratio 2:1)

### Image Upload Endpoints

✅ **Dedicated upload endpoints are available**:

1. **Upload Single Image**: `POST /api/v1/admin/banners/upload-image`
   - Upload desktop or mobile image
   - Query parameter: `type=desktop` or `type=mobile`

2. **Upload Both Images**: `POST /api/v1/admin/banners/upload-images`
   - Upload both desktop and mobile images in one request
   - Fields: `image` (required), `mobileImage` (optional)

**Features**:
- ✅ Automatic compression (JPEG, PNG, WebP)
- ✅ GIF support (no compression, preserves animation)
- ✅ File size validation (max 5MB)
- ✅ Automatic S3 upload
- ✅ Returns URLs ready for banner creation

For detailed image upload specifications, see [Banner Image Upload Specifications](./BANNER_IMAGE_UPLOAD_SPECIFICATIONS.md).

## Best Practices

1. **Image Optimization**: 
   - Use compressed images (max 500KB recommended)
   - Provide mobile-specific images for better mobile experience
   - Recommended dimensions: Desktop (1920x400px), Mobile (800x400px)

2. **Priority Management**:
   - Use priority 1-10 for most banners
   - Reserve higher priorities (10+) for important campaigns
   - Regularly review and reorder banners

3. **Targeting**:
   - Use `all` audience for general promotions
   - Use specific targeting for personalized campaigns
   - Test targeting with small audiences first

5. **Analytics**:
   - Regularly check click/view counts
   - Remove or update low-performing banners
   - A/B test different banner designs

6. **Link Management**:
   - Use internal links for better user experience
   - Always test links before publishing
   - Use metadata to track campaign sources

## Related Files

- **Model**: `src/models/banner.model.ts`
- **Service**: `src/services/admin/banner.service.ts`
- **Controller**: `src/controllers/admin/banner.controller.ts`
- **Routes**: `src/routes/admin/banner.routes.ts`
- **Section Enum**: `src/enums/section.enum.ts` (BANNER section)

## Future Enhancements

Potential improvements:

1. **Banner Templates**: Pre-defined banner templates
2. **A/B Testing**: Built-in A/B testing functionality
3. **Advanced Analytics**: Click-through rates, conversion tracking
4. **Banner Rotation**: Automatic rotation of multiple banners
5. **Geographic Targeting**: Target banners by location
6. **Device-Specific Targeting**: Target by device type/browser
7. **Banner Preview**: Preview banner before publishing
8. **Bulk Operations**: Bulk create/update/delete banners
9. **Banner History**: Track banner changes over time

