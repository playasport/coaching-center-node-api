# Basic Information Update API - Contact & Address Support

## Overview

The `/admin/settings/basic-info` endpoint has been enhanced to support updating contact information and addresses. This allows administrators to manage all contact-related settings including phone numbers, email addresses, physical addresses, and social media links through a single endpoint.

## Changes Made

### 1. Controller Updates (`src/controllers/admin/settings.controller.ts`)

The `updateBasicInfo` function now accepts and processes:
- **Contact Information** (`contact` object)
  - Phone numbers array
  - Email address
  - Social media links (WhatsApp, Instagram, Facebook, YouTube)
  - Address information (office and registered addresses)

### 2. API Endpoints

#### Update Basic Information

**Endpoint:** `PATCH /api/v1/admin/settings/basic-info`

**Permission Required:** `settings:update`

**Authentication:** Bearer token (Admin role required)

#### Upload App Logo

**Endpoint:** `POST /api/v1/admin/settings/logo`

**Permission Required:** `settings:update`

**Authentication:** Bearer token (Admin role required)

**Content-Type:** `multipart/form-data`

**Description:** Upload a logo image file directly. The image will be automatically compressed and saved to S3. The logo URL will be automatically updated in the settings.

## Request Structure

### Basic Fields (Existing)

All existing fields remain supported:

```json
{
  "app_name": "string",
  "app_logo": "string (URL)",
  "about_us": "string",
  "support_email": "string (email)",
  "support_phone": "string",
  "meta_description": "string",
  "meta_keywords": "string"
}
```

### New Contact Fields

The `contact` object can now be included in the request:

```json
{
  "contact": {
    "number": ["string", "string"],  // Array of phone numbers
    "email": "string (email)",
    "address": {
      "office": "string",           // Office address
      "registered": "string"        // Registered office address
    },
    "whatsapp": "string",           // WhatsApp number
    "instagram": "string (URL)",     // Instagram profile URL
    "facebook": "string (URL)",      // Facebook page URL
    "youtube": "string (URL)"        // YouTube channel URL
  }
}
```

## Complete Example Request

```json
{
  "app_name": "Play A Sport",
  "app_logo": "https://example.com/logo.png",
  "about_us": "About our platform...",
  "support_email": "support@playasport.in",
  "support_phone": "+91-9876543210",
  "meta_description": "Meta description for SEO",
  "meta_keywords": "sports, coaching, academy",
  "contact": {
    "number": ["+91-9230981848", "+91-9230981845"],
    "email": "info@playasport.com",
    "address": {
      "office": "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064",
      "registered": "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
    },
    "whatsapp": "+91-9230981848",
    "instagram": "https://www.instagram.com/playasport.in/",
    "facebook": "https://www.facebook.com/PlayASportIndia",
    "youtube": "https://www.youtube.com/@PlayASport_in"
  }
}
```

## Field Details

### Contact Object Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `number` | `string[]` | No | Array of contact phone numbers | `["+91-9230981848", "+91-9230981845"]` |
| `email` | `string` | No | Contact email address | `"info@playasport.com"` |
| `address` | `object` | No | Contact addresses object | See Address Object below |
| `whatsapp` | `string` | No | WhatsApp contact number | `"+91-9230981848"` |
| `instagram` | `string` | No | Instagram profile URL | `"https://www.instagram.com/playasport.in/"` |
| `facebook` | `string` | No | Facebook page URL | `"https://www.facebook.com/PlayASportIndia"` |
| `youtube` | `string` | No | YouTube channel URL | `"https://www.youtube.com/@PlayASport_in"` |

### Address Object Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `office` | `string` | No | Office address | `"BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064"` |
| `registered` | `string` | No | Registered office address | `"AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"` |

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Basic information updated successfully",
  "data": {
    "settings": {
      "_id": "507f1f77bcf86cd799439011",
      "app_name": "Play A Sport",
      "app_logo": "https://example.com/logo.png",
      "contact": {
        "number": ["+91-9230981848", "+91-9230981845"],
        "email": "info@playasport.com",
        "address": {
          "office": "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064",
          "registered": "AE-694, Sector 1, Salt Lake City, Bidhan Nagar AE Market, North 24 Parganas, Saltlake, West Bengal, India, 700064"
        },
        "whatsapp": "+91-9230981848",
        "instagram": "https://www.instagram.com/playasport.in/",
        "facebook": "https://www.facebook.com/PlayASportIndia",
        "youtube": "https://www.youtube.com/@PlayASport_in"
      },
      "basic_info": {
        "about_us": "About our platform...",
        "support_email": "support@playasport.in",
        "support_phone": "+91-9876543210",
        "meta_description": "Meta description for SEO",
        "meta_keywords": "sports, coaching, academy"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z"
    }
  }
}
```

## Usage Examples

### Example 1: Update Only Contact Phone Numbers

```json
{
  "contact": {
    "number": ["+91-9230981848", "+91-9230981845"]
  }
}
```

### Example 2: Update Only Addresses

```json
{
  "contact": {
    "address": {
      "office": "New Office Address, City, State, Country",
      "registered": "New Registered Address, City, State, Country"
    }
  }
}
```

### Example 3: Update Social Media Links

```json
{
  "contact": {
    "instagram": "https://www.instagram.com/newhandle/",
    "facebook": "https://www.facebook.com/newpage",
    "youtube": "https://www.youtube.com/@newchannel"
  }
}
```

### Example 4: Partial Update (Only Office Address)

```json
{
  "contact": {
    "address": {
      "office": "Updated Office Address Only"
    }
  }
}
```

**Note:** When updating nested objects like `contact.address`, only the fields you provide will be updated. Other existing fields in the nested object will be preserved.

## Important Notes

1. **All Fields Are Optional**: You can send only the fields you want to update. All other fields will remain unchanged.

2. **Partial Updates**: The API supports partial updates. You can update:
   - Only basic info fields
   - Only contact information
   - Only specific contact fields (e.g., just phone numbers or just addresses)
   - Any combination of the above

3. **Deep Merging**: The service uses deep merging, which means:
   - If you update `contact.address.office`, the existing `contact.address.registered` value will be preserved
   - If you update `contact.number`, other `contact` fields remain unchanged
   - Nested objects are merged intelligently

4. **Null Values**: To clear a field, you can set it to `null`:
   ```json
   {
     "contact": {
       "whatsapp": null
     }
   }
   ```

5. **Array Updates**: When updating `contact.number`, the entire array is replaced. To add a number, include all numbers in the array:
   ```json
   {
     "contact": {
       "number": ["+91-9230981848", "+91-9230981845", "+91-9230981846"]
     }
   }
   ```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message",
  "data": null
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden - Insufficient permissions",
  "data": null
}
```

## Logo Upload

### Upload Logo Endpoint

Instead of providing a URL in the `app_logo` field, you can upload a logo file directly using the dedicated upload endpoint.

**Endpoint:** `POST /api/v1/admin/settings/logo`

**Request Format:** `multipart/form-data`

**Field Name:** `logo`

**Supported Formats:** JPEG, PNG, WebP

**Features:**
- Automatic image compression (optimized for web)
- Direct upload to S3 (saved in `images/logo/` folder)
- Automatic update of `app_logo` in settings
- File size validation based on configuration

### Example: Upload Logo with cURL

```bash
curl -X POST "http://localhost:3001/api/v1/admin/settings/logo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "logo=@/path/to/logo.png"
```

### Example: Upload Logo Response

```json
{
  "success": true,
  "message": "Logo uploaded successfully",
  "data": {
    "logoUrl": "https://bucket.s3.region.amazonaws.com/images/logo/uuid.jpg",
    "settings": {
      "_id": "507f1f77bcf86cd799439011",
      "app_name": "Play A Sport",
      "app_logo": "https://bucket.s3.region.amazonaws.com/images/logo/uuid.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z"
    }
  }
}
```

### Two Ways to Set Logo

1. **Upload File (Recommended):** Use `POST /admin/settings/logo` to upload a file directly
2. **Provide URL:** Use `PATCH /admin/settings/basic-info` with `app_logo` field containing a URL

## Testing

### Using cURL - Update Basic Info

```bash
curl -X PATCH "http://localhost:3001/api/v1/admin/settings/basic-info" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Play A Sport",
    "contact": {
      "number": ["+91-9230981848"],
      "email": "info@playasport.com",
      "address": {
        "office": "BD-357, sector-1, saltlake city, Kolkata, West Bengal, India, 700064"
      }
    }
  }'
```

### Using cURL - Upload Logo

```bash
curl -X POST "http://localhost:3001/api/v1/admin/settings/logo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "logo=@/path/to/logo.png"
```

### Using Postman

1. Import the updated Postman collection: `postman/PlayAsport-Admin-Panel-Collection.json`
2. For updating basic info:
   - Navigate to: **Admin Settings** → **Update Basic Information**
   - The request body already includes example contact and address fields
   - Modify as needed and send the request
3. For uploading logo:
   - Navigate to: **Admin Settings** → **Upload App Logo**
   - Select a logo image file in the form-data body
   - Send the request

## Related Documentation

- [Settings Model](../src/models/settings.model.ts) - Data model structure
- [Settings Service](../src/services/common/settings.service.ts) - Service implementation
- [Swagger Documentation](http://localhost:3001/api-docs) - Interactive API documentation

## Migration Notes

### For Existing Integrations

If you have existing code that calls this endpoint:

1. **No Breaking Changes**: Existing requests without `contact` field will continue to work
2. **Backward Compatible**: All previous field names and structures remain unchanged
3. **Optional Enhancement**: You can gradually add contact information to your update requests

### Example: Migrating Existing Code

**Before:**
```json
{
  "app_name": "Play A Sport",
  "support_email": "support@playasport.in"
}
```

**After (with contact info):**
```json
{
  "app_name": "Play A Sport",
  "support_email": "support@playasport.in",
  "contact": {
    "email": "info@playasport.com",
    "number": ["+91-9230981848"]
  }
}
```

## Changelog

### Version 1.2.0 (Current)
- ✅ Added logo upload endpoint (`POST /admin/settings/logo`)
- ✅ Automatic image compression for uploaded logos
- ✅ Direct S3 upload to permanent location (`images/logo/`)
- ✅ Automatic settings update after logo upload
- ✅ Updated Swagger documentation
- ✅ Updated Postman collection with logo upload example

### Version 1.1.0
- ✅ Added support for `contact` object in basic info update
- ✅ Added support for `contact.address` (office and registered addresses)
- ✅ Added support for social media links (WhatsApp, Instagram, Facebook, YouTube)
- ✅ Updated Swagger documentation
- ✅ Updated Postman collection with examples

### Version 1.0.0 (Previous)
- Basic info fields (app_name, app_logo, about_us, support_email, support_phone, meta_description, meta_keywords)

---

**Last Updated:** January 2024  
**API Version:** v1  
**Maintainer:** Development Team

