# Coaching Center Media Upload Workflow

## Overview

The media upload system supports two types of uploads: **Temporary** and **Final**. This allows users to upload files during the draft/editing phase and then finalize them when submitting the coaching center.

## Upload Types

### 1. Temporary Upload (`uploadType='temporary'`)

**When to use:**
- During draft/editing phase
- While user is still working on the coaching center form
- Before final submission

**File Storage:**
- Files are saved in `temp/` folder
- Can be cleaned up later if not finalized
- Paths:
  - Logo: `temp/coaching/photo/{uuid}.{ext}`
  - Images: `temp/images/coachingCentres/{uuid}.{ext}`
  - Videos: `temp/videos/coachingCentres/{uuid}.{ext}`
  - Documents: `temp/documents/coachingCentres/{uuid}.{ext}`

**Example Request:**
```bash
POST /api/v1/coaching-center/media/images
Content-Type: multipart/form-data

images: [file1.jpg, file2.jpg]
uploadType: "temporary"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Media files uploaded successfully",
  "data": {
    "urls": [
      "https://bucket.s3.region.amazonaws.com/temp/images/coachingCentres/uuid1.jpg",
      "https://bucket.s3.region.amazonaws.com/temp/images/coachingCentres/uuid2.jpg"
    ],
    "count": 2,
    "type": "image",
    "uploadType": "temporary"
  }
}
```

### 2. Final Upload (`uploadType='final'`)

**When to use:**
- On final submission
- When user clicks "Publish" or "Final Submit"
- When status changes from 'draft' to 'published'

**File Storage:**
- Files are saved to permanent locations
- These are the actual files used in the coaching center
- Paths:
  - Logo: `coaching/photo/{uuid}.{ext}`
  - Images: `images/coachingCentres/{uuid}.{ext}`
  - Videos: `videos/coachingCentres/{uuid}.{ext}`
  - Documents: `documents/coachingCentres/{uuid}.{ext}`

**Example Request:**
```bash
POST /api/v1/coaching-center/media/images
Content-Type: multipart/form-data

images: [file1.jpg, file2.jpg]
uploadType: "final"
coachingCenterId: "507f1f77bcf86cd799439011"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Media files uploaded successfully",
  "data": {
    "urls": [
      "https://bucket.s3.region.amazonaws.com/images/coachingCentres/uuid1.jpg",
      "https://bucket.s3.region.amazonaws.com/images/coachingCentres/uuid2.jpg"
    ],
    "count": 2,
    "type": "image",
    "uploadType": "final"
  }
}
```

## Workflow Example

### Step 1: User starts creating coaching center (Draft Mode)
```javascript
// User uploads images while editing
POST /api/v1/coaching-center/media/images
{
  images: [file1.jpg, file2.jpg],
  uploadType: "temporary"  // Default, can be omitted
}

// Response: Files saved in temp/images/coachingCentres/
```

### Step 2: User saves as draft
```javascript
// User saves coaching center with temporary image URLs
POST /api/v1/coaching-center
{
  center_name: "Elite Sports Academy",
  // ... other fields
  media: {
    images: [
      { url: "https://bucket.s3.region.amazonaws.com/temp/images/coachingCentres/uuid1.jpg" },
      { url: "https://bucket.s3.region.amazonaws.com/temp/images/coachingCentres/uuid2.jpg" }
    ]
  },
  status: "draft"
}
```

### Step 3: User finalizes and submits
```javascript
// User uploads final images (or re-uploads with final type)
POST /api/v1/coaching-center/media/images
{
  images: [file1.jpg, file2.jpg],
  uploadType: "final",
  coachingCenterId: "507f1f77bcf86cd799439011"
}

// Response: Files saved in images/coachingCentres/

// Then update coaching center with final URLs
PATCH /api/v1/coaching-center/507f1f77bcf86cd799439011
{
  media: {
    images: [
      { url: "https://bucket.s3.region.amazonaws.com/images/coachingCentres/uuid1.jpg" },
      { url: "https://bucket.s3.region.amazonaws.com/images/coachingCentres/uuid2.jpg" }
    ]
  },
  status: "published"
}
```

## API Endpoints

### Logo Upload
- `POST /api/v1/coaching-center/media/logo`
- Single file upload
- Field name: `logo`

### Images Upload
- `POST /api/v1/coaching-center/media/images`
- Multiple files (up to 10)
- Field name: `images`

### Videos Upload
- `POST /api/v1/coaching-center/media/videos`
- Multiple files (up to 10, max 100MB each)
- Field name: `videos`

### Documents Upload
- `POST /api/v1/coaching-center/media/documents`
- Multiple files (up to 10, max 10MB each)
- Field name: `documents`

## Request Parameters

All endpoints accept:
- `uploadType` (optional): `"temporary"` or `"final"` (default: `"temporary"`)
- `coachingCenterId` (optional): Coaching center ID (useful for final uploads)

## File Paths Summary

| Media Type | Temporary Path | Final Path |
|------------|---------------|------------|
| Logo | `temp/coaching/photo/{uuid}.{ext}` | `coaching/photo/{uuid}.{ext}` |
| Images | `temp/images/coachingCentres/{uuid}.{ext}` | `images/coachingCentres/{uuid}.{ext}` |
| Videos | `temp/videos/coachingCentres/{uuid}.{ext}` | `videos/coachingCentres/{uuid}.{ext}` |
| Documents | `temp/documents/coachingCentres/{uuid}.{ext}` | `documents/coachingCentres/{uuid}.{ext}` |

## Best Practices

1. **During Draft Phase:**
   - Always use `uploadType='temporary'` (or omit it, as it's the default)
   - Files are stored in temp folder
   - Can be cleaned up if user abandons the draft

2. **On Final Submission:**
   - Use `uploadType='final'` explicitly
   - Files are stored in permanent locations
   - These URLs should be saved in the coaching center document

3. **Cleanup:**
   - Consider implementing a cleanup job to remove temporary files older than X days
   - Temporary files that are never finalized can be safely deleted

