# Banner Image Upload Specifications

## Overview

This document outlines the image upload specifications, limitations, and compression options for banner images in the admin panel.

---

## Current Implementation Status

✅ **Dedicated Upload Endpoints Available**: The admin panel now includes dedicated endpoints for uploading banner images directly.

### Upload Workflow

1. **Upload Images**: Use the dedicated upload endpoints to upload banner images
2. **Get URLs**: Receive image URLs in the response
3. **Create Banner**: Use the returned URLs when creating or updating banners

### Upload Endpoints

- `POST /api/v1/admin/banners/upload-image` - Upload single image (desktop or mobile)
- `POST /api/v1/admin/banners/upload-images` - Upload both desktop and mobile images

---

## Image Type Specifications

### Allowed Image Formats

Based on the system's image handling capabilities, the following image formats are **supported**:

| Format | MIME Type | Extension | Notes |
|--------|-----------|-----------|-------|
| **JPEG** | `image/jpeg`, `image/jpg` | `.jpg`, `.jpeg` | Recommended for photos |
| **PNG** | `image/png` | `.png` | Recommended for graphics with transparency |
| **WebP** | `image/webp` | `.webp` | Modern format with better compression |
| **GIF** | `image/gif` | `.gif` | Animated or static GIFs (no compression applied) |

### Not Supported

- BMP (`.bmp`)
- TIFF (`.tiff`)
- SVG (`.svg`) - Vector format, not suitable for banners

---

## File Size Limitations

### Maximum File Size

| Setting | Default Value | Configurable Via | Notes |
|---------|---------------|------------------|-------|
| **Max Image Size** | **5 MB** | `MAX_IMAGE_SIZE_MB` environment variable | Per image file |
| **Max Mobile Image Size** | **5 MB** | `MAX_IMAGE_SIZE_MB` environment variable | Per mobile image file |

### Configuration

Set in `.env` file:
```env
MAX_IMAGE_SIZE_MB=5
```

Or in `src/config/env.ts`:
```typescript
media: {
  maxImageSize: Number(process.env.MAX_IMAGE_SIZE_MB || 5) * 1024 * 1024, // 5MB default
}
```

---

## Image Compression

### ✅ Compression is Enabled

The system includes **automatic image compression** using the Sharp library. Compression is applied when images are uploaded through the media upload system.

### Compression Settings

| Setting | Default Value | Configurable Via | Description |
|---------|---------------|------------------|-------------|
| **Max Width** | **1500px** | `IMAGE_MAX_WIDTH` environment variable | Images wider than this are resized |
| **Target Max Size** | **500 KB** | `IMAGE_MAX_SIZE_KB` environment variable | Target compressed file size |
| **Quality (JPEG)** | 85 → 20 (adaptive) | Automatic | Starts at 85, reduces if needed |
| **Quality (WebP)** | 85 → 20 (adaptive) | Automatic | Starts at 85, reduces if needed |
| **PNG Compression** | Level 6 → 9 (adaptive) | Automatic | Progressive compression levels |

### Configuration

Set in `.env` file:
```env
IMAGE_MAX_WIDTH=1500
IMAGE_MAX_SIZE_KB=500
```

Or in `src/config/env.ts`:
```typescript
media: {
  imageCompression: {
    maxWidth: Number(process.env.IMAGE_MAX_WIDTH || 1500), // Default: 1500px
    maxSizeKB: Number(process.env.IMAGE_MAX_SIZE_KB || 500), // Default: 500KB
  },
}
```

### Compression Behavior

1. **Resizing**: Images wider than 1500px are automatically resized (aspect ratio maintained)
2. **Format-Specific Compression**:
   - **JPEG**: Progressive compression with mozjpeg optimization
   - **PNG**: Compression level 6-9, palette optimization for large files
   - **WebP**: Quality-based compression
   - **GIF**: No compression applied (passed through as-is to preserve animation)
3. **Smart Conversion**: PNG files without transparency may be converted to JPEG for better compression
4. **Adaptive Quality**: System automatically reduces quality if target size isn't met (minimum: 20% quality)

### GIF Support

- **GIF files are supported** but **not compressed**
- GIFs are uploaded as-is to preserve animation
- File size limit still applies (5MB)
- Recommended: Optimize GIFs before upload using tools like GIFsicle or online optimizers

### Compression Examples

**Before Compression:**
- Original: 1920x800px, 2.5 MB JPEG

**After Compression:**
- Resized: 1500x625px (maintains aspect ratio)
- Compressed: ~450 KB JPEG (quality: 85)
- **Reduction: ~82%**

---

## Recommended Image Specifications

### Desktop Banner Images (`imageUrl`)

| Property | Recommended Value | Notes |
|----------|-------------------|-------|
| **Dimensions** | 1920x400px | Standard banner size |
| **Aspect Ratio** | 4.8:1 (width:height) | Can vary based on design |
| **Format** | JPEG or WebP | JPEG for photos, WebP for graphics |
| **File Size** | < 500 KB (after compression) | Target size |
| **Color Space** | sRGB | Standard web color space |

### Mobile Banner Images (`mobileImageUrl`)

| Property | Recommended Value | Notes |
|----------|-------------------|-------|
| **Dimensions** | 800x400px | Optimized for mobile screens |
| **Aspect Ratio** | 2:1 (width:height) | Mobile-friendly ratio |
| **Format** | JPEG or WebP | JPEG for photos, WebP for graphics |
| **File Size** | < 300 KB (after compression) | Smaller for mobile |
| **Color Space** | sRGB | Standard web color space |

### Optional: Responsive Sizes

For best performance, consider providing multiple sizes:
- **Desktop**: 1920x400px
- **Tablet**: 1200x300px
- **Mobile**: 800x400px

---

## API Usage Examples

### Option 1: Upload Images First, Then Create Banner (Recommended)

#### Step 1: Upload Images
```bash
POST /api/v1/admin/banners/upload-images
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

image: [desktop-banner.jpg]
mobileImage: [mobile-banner.jpg]
```

**Response**:
```json
{
  "success": true,
  "message": "Banner images uploaded successfully",
  "data": {
    "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg",
    "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/mobile/uuid.jpg"
  }
}
```

#### Step 2: Create Banner with Uploaded URLs
```bash
POST /api/v1/admin/banners
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "Summer Sports Camp 2024",
  "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg",
  "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/mobile/uuid.jpg",
  "position": "homepage_top",
  "priority": 10,
  "status": "active"
}
```

### Option 2: Upload Single Image

```bash
POST /api/v1/admin/banners/upload-image?type=desktop
Content-Type: multipart/form-data
Authorization: Bearer <admin_token>

image: [banner.jpg]
```

### Option 3: Direct URL (Still Supported)

You can still provide pre-uploaded image URLs directly:

```bash
POST /api/v1/admin/banners
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "title": "Summer Sports Camp 2024",
  "imageUrl": "https://external-cdn.com/banner.jpg",
  "position": "homepage_top"
}
```

### Image URL Requirements

- **Must be a valid URL**: Full URL including protocol (http:// or https://)
- **Must be accessible**: Image should be publicly accessible
- **Recommended**: Use S3 or CDN URLs for better performance
- **Format**: Should match allowed image types (JPEG, PNG, WebP, GIF)

---

## Banner Image Upload Endpoints

### ✅ Implementation Complete

Dedicated banner image upload endpoints are now available with the following specifications:

#### Endpoint 1: Upload Single Image
```
POST /api/v1/admin/banners/upload-image
```

**Request**:
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Query Parameters**:
  - `type` (optional): `desktop` or `mobile` (default: `desktop`)
- **Fields**:
  - `image` (file, required): Banner image file

**Response**:
```json
{
  "success": true,
  "message": "Banner image uploaded successfully",
  "data": {
    "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg",
    "type": "desktop"
  }
}
```

#### Endpoint 2: Upload Both Images
```
POST /api/v1/admin/banners/upload-images
```

**Request**:
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `image` (file, required): Desktop banner image
  - `mobileImage` (file, optional): Mobile banner image

**Response**:
```json
{
  "success": true,
  "message": "Banner images uploaded successfully",
  "data": {
    "imageUrl": "https://bucket.s3.region.amazonaws.com/banners/desktop/uuid.jpg",
    "mobileImageUrl": "https://bucket.s3.region.amazonaws.com/banners/mobile/uuid.jpg"
  }
}
```

#### Features
- ✅ Automatic image compression (JPEG, PNG, WebP)
- ✅ GIF support (no compression, passed through as-is)
- ✅ File type validation (JPEG, PNG, WebP, GIF)
- ✅ File size validation (max 5MB)
- ✅ Automatic resizing (max width 1500px, except GIF)
- ✅ S3 upload with organized folder structure (`banners/desktop/` and `banners/mobile/`)
- ✅ Returns URLs ready for banner creation
- ✅ Permission-based access control (requires `banner:create` permission)

---

## Image Upload Best Practices

### 1. Pre-Processing

Before uploading:
- **Optimize images**: Use tools like TinyPNG, ImageOptim, or Squoosh
- **Correct dimensions**: Resize to recommended dimensions
- **Choose format**: JPEG for photos, PNG for graphics with transparency, WebP for modern browsers
- **Reduce file size**: Aim for < 1MB before upload (system will compress further)

### 2. Quality Considerations

- **JPEG Quality**: 80-90 for photos, 70-80 for graphics
- **PNG**: Use PNG-8 for simple graphics, PNG-24 for photos with transparency
- **WebP**: 80-90 quality provides excellent compression

### 3. Testing

- **Test on different devices**: Desktop, tablet, mobile
- **Check loading speed**: Ensure images load quickly
- **Verify compression**: Check final file size after upload
- **Test responsive behavior**: Ensure mobile images display correctly

---

## Environment Variables Summary

### Image Upload Configuration

```env
# Maximum file sizes (in MB)
MAX_IMAGE_SIZE_MB=5

# Image compression settings
IMAGE_MAX_WIDTH=1500
IMAGE_MAX_SIZE_KB=500

# AWS S3 Configuration (for image storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

---

## Error Handling

### Common Errors

#### 1. File Size Exceeded
```json
{
  "success": false,
  "message": "File size exceeds 5MB limit"
}
```
**Solution**: Compress image before upload or increase `MAX_IMAGE_SIZE_MB`

#### 2. Invalid File Type
```json
{
  "success": false,
  "message": "Invalid file type. Allowed types: image/jpeg, image/png, image/webp"
}
```
**Solution**: Convert image to JPEG, PNG, or WebP format

#### 3. Invalid Image URL
```json
{
  "success": false,
  "message": "Invalid imageUrl format"
}
```
**Solution**: Ensure URL is complete and accessible

---

## Compression Algorithm Details

### Compression Process

1. **Read Image**: Load image buffer
2. **Check Dimensions**: If width > 1500px, resize maintaining aspect ratio
3. **Determine Format**: JPEG, PNG, or WebP
4. **Compress Iteratively**:
   - Start with high quality (85)
   - Check file size
   - Reduce quality if needed (minimum: 20)
   - For PNG: Try compression levels 6-9
   - Convert PNG to JPEG if no transparency and still too large
5. **Return Compressed Buffer**: Final compressed image

### Compression Statistics

The system logs compression statistics:
```
Image compressed successfully
- Original: 2048 KB
- Compressed: 450 KB
- Quality: 85
- Reduction: 78%
```

---

## Testing Image Uploads

### Using cURL

```bash
# Upload image (if upload endpoint exists)
curl -X POST "http://localhost:3000/api/v1/admin/banners/upload-image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/banner.jpg" \
  -F "mobileImage=@/path/to/banner-mobile.jpg"
```

### Using Postman

1. Set method to POST
2. Set URL to upload endpoint
3. Go to Body → form-data
4. Add file field: `image` (type: File)
5. Add file field: `mobileImage` (type: File, optional)
6. Select files and send

---

## Summary

### ✅ What's Available

- **Image Types**: JPEG, PNG, WebP, **GIF** (newly added)
- **Max Size**: 5 MB per image
- **Compression**: Automatic (max width 1500px, target 500KB) for JPEG, PNG, WebP
- **GIF Support**: GIF files are supported but not compressed (preserves animation)
- **Format Support**: JPEG, PNG, WebP with smart optimization
- **Dedicated Upload Endpoints**: ✅ Available
  - `POST /api/v1/admin/banners/upload-image` - Single image upload
  - `POST /api/v1/admin/banners/upload-images` - Both desktop and mobile
- **Automatic S3 Upload**: Images are automatically uploaded to S3
- **Organized Storage**: Images stored in `banners/desktop/` and `banners/mobile/` folders

### ✅ Features Implemented

1. ✅ **Dedicated Upload Endpoints**: Banner image upload endpoints available
2. ✅ **GIF Support**: GIF files can be uploaded (no compression)
3. ✅ **Automatic Compression**: JPEG, PNG, WebP are automatically compressed
4. ✅ **File Validation**: File type and size validation
5. ✅ **S3 Integration**: Automatic upload to S3 with organized folder structure
6. ✅ **Permission Control**: Requires `banner:create` permission

### 🔮 Future Enhancements

1. **Image Preview**: Provide image preview before saving
2. **Image Cropping**: Allow admins to crop images to recommended dimensions
3. **Batch Upload**: Support uploading multiple banner images at once
4. **Image Optimization**: Additional optimization options for GIF files

---

## Related Documentation

- [Admin Banner Management](./ADMIN_BANNER_MANAGEMENT.md) - Complete banner management guide
- [Banner Routes Usage](./BANNER_ROUTES_USAGE.md) - API usage guide
- [Media Upload Workflow](./media-upload-workflow.md) - General media upload documentation
- [AWS S3 Setup](./aws-s3-setup.md) - S3 configuration guide

---

## Support

For questions or issues:
- Check image format and size before upload
- Verify S3 bucket configuration
- Review compression logs for optimization insights
- Contact development team for assistance

