# Highlight Validations and Limitations

## Overview

This document outlines all validation rules and limitations for highlight uploads, edits, and data fields.

---

## 📝 Text Field Validations

### Title
- **Minimum Length:** 1 character (required)
- **Maximum Length:** 60 characters
- **Validation Message:** "Title must be at most 60 characters"
- **Applies To:**
  - ✅ Create highlight
  - ✅ Update highlight

**Location:** `src/validations/highlight.validation.ts`

```typescript
title: z.string().min(1).max(60, 'Title must be at most 60 characters')
```

### Description
- **Minimum Length:** None (optional field)
- **Maximum Length:** 5000 characters
- **Nullable:** Yes (can be null)
- **Optional:** Yes
- **Applies To:**
  - ✅ Create highlight
  - ✅ Update highlight

**Location:** `src/validations/highlight.validation.ts`

```typescript
description: z.string().max(5000).nullable().optional()
```

---

## 🎥 Video Upload Validations

### Video File Types (Allowed MIME Types)
- `video/mp4`
- `video/mpeg`
- `video/quicktime` (MOV)
- `video/x-msvideo` (AVI)
- `video/webm`
- `video/x-matroska` (MKV)

**Location:** `src/middleware/highlightUpload.middleware.ts`

### Video File Size
- **Maximum Size:** 100 MB (default)
- **Configurable:** Yes, via `MAX_VIDEO_SIZE_MB` environment variable
- **Default:** `100 * 1024 * 1024` bytes (100 MB)
- **Error Message:** "Video file size exceeds {maxSizeMB}MB limit"

**Location:** `src/config/env.ts`
```typescript
maxVideoSize: Number(process.env.MAX_VIDEO_SIZE_MB || 100) * 1024 * 1024
```

### Video Upload Endpoints
1. **Single Video Upload:** `POST /admin/highlights/upload-video`
   - Field name: `video`
   - Required: Yes
   - Max size: 100 MB

2. **Combined Upload:** `POST /admin/highlights/upload-media`
   - Field name: `video`
   - Required: Yes
   - Max size: 100 MB

3. **Preview Video Upload:** `POST /admin/highlights/:id/preview`
   - Field name: `preview`
   - Required: Yes
   - Max size: 100 MB

**Location:** `src/middleware/highlightUpload.middleware.ts`

---

## 🖼️ Thumbnail Upload Validations

### Thumbnail File Types (Allowed MIME Types)
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`

**Location:** `src/middleware/highlightUpload.middleware.ts`

### Thumbnail File Size
- **Maximum Size:** 5 MB (default)
- **Configurable:** Yes, via `MAX_IMAGE_SIZE_MB` environment variable
- **Default:** `5 * 1024 * 1024` bytes (5 MB)
- **Error Message:** "Thumbnail file size exceeds {maxSizeMB}MB limit"

**Location:** `src/config/env.ts`
```typescript
maxImageSize: Number(process.env.MAX_IMAGE_SIZE_MB || 5) * 1024 * 1024
```

### Thumbnail Upload Endpoints
1. **Single Thumbnail Upload:** `POST /admin/highlights/upload-thumbnail`
   - Field name: `thumbnail`
   - Required: No (optional)
   - Max size: 5 MB

2. **Combined Upload:** `POST /admin/highlights/upload-media`
   - Field name: `thumbnail`
   - Required: No (optional)
   - Max size: 5 MB

**Location:** `src/middleware/highlightUpload.middleware.ts`

---

## 📋 Form Field Validations

### Create Highlight (`POST /admin/highlights`)

| Field | Type | Required | Min Length | Max Length | Validation Rules |
|-------|------|----------|------------|------------|------------------|
| `title` | string | ✅ Yes | 1 | 60 | Must be non-empty |
| `description` | string | ❌ No | - | 5000 | Can be null/empty |
| `videoUrl` | string | ✅ Yes | - | - | Must be valid URL |
| `thumbnailUrl` | string | ❌ No | - | - | Must be valid URL if provided |
| `userId` | string | ✅ Yes | 1 | - | Must be non-empty |
| `coachingCenterId` | string | ❌ No | - | - | Can be null |
| `duration` | number | ❌ No | 0 | - | Must be >= 0 if provided |
| `metadata` | object | ❌ No | - | - | Can be null |

**Location:** `src/validations/highlight.validation.ts` - `createHighlightSchema`

### Update Highlight (`PATCH /admin/highlights/:id`)

| Field | Type | Required | Min Length | Max Length | Validation Rules |
|-------|------|----------|------------|------------|------------------|
| `title` | string | ❌ No | 1 | 60 | Optional, but if provided must be 1-60 chars |
| `description` | string | ❌ No | - | 5000 | Can be null/empty |
| `videoUrl` | string | ❌ No | - | - | Must be valid URL if provided |
| `thumbnailUrl` | string | ❌ No | - | - | Must be valid URL if provided |
| `status` | enum | ❌ No | - | - | Must be: PUBLISHED, ARCHIVED, BLOCKED, or DELETED |
| `duration` | number | ❌ No | 0 | - | Must be >= 0 if provided |
| `metadata` | object | ❌ No | - | - | Can be null |

**Location:** `src/validations/highlight.validation.ts` - `updateHighlightSchema`

### Update Status (`PATCH /admin/highlights/:id/status`)

| Field | Type | Required | Allowed Values |
|-------|------|----------|----------------|
| `status` | enum | ✅ Yes | `PUBLISHED`, `ARCHIVED`, `BLOCKED`, `DELETED` |

**Location:** `src/validations/highlight.validation.ts` - `updateHighlightStatusSchema`

---

## 🔍 Query Parameter Validations

### Get Highlights (`GET /admin/highlights`)

| Parameter | Type | Required | Validation Rules |
|-----------|------|----------|-----------------|
| `page` | number | ❌ No | Must be numeric string, defaults to 1 |
| `limit` | number | ❌ No | Must be numeric string, defaults to 10 |
| `status` | enum | ❌ No | `PUBLISHED`, `ARCHIVED`, `BLOCKED`, `DELETED` |
| `videoProcessingStatus` | enum | ❌ No | `NOT_STARTED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `coachingCenterId` | string | ❌ No | MongoDB ObjectId format |
| `userId` | string | ❌ No | MongoDB ObjectId format |
| `search` | string | ❌ No | Free text search |
| `sortBy` | string | ❌ No | Field name to sort by |
| `sortOrder` | enum | ❌ No | `asc` or `desc` |

**Location:** `src/validations/highlight.validation.ts` - `getHighlightsQuerySchema`

---

## ⚙️ Configuration (Environment Variables)

All file size limits can be configured via environment variables:

```bash
# Video file size (in MB)
MAX_VIDEO_SIZE_MB=100

# Image/Thumbnail file size (in MB)
MAX_IMAGE_SIZE_MB=5

# Profile image size (in MB)
MAX_PROFILE_IMAGE_SIZE_MB=5

# Document file size (in MB)
MAX_DOCUMENT_SIZE_MB=10
```

**Location:** `src/config/env.ts`

---

## 📊 Summary Table

| Validation Type | Limit | Configurable | Error Message |
|----------------|-------|--------------|---------------|
| **Title** | 1-60 characters | ❌ No | "Title must be at most 60 characters" |
| **Description** | Max 5000 characters | ❌ No | N/A (optional field) |
| **Video Size** | 100 MB | ✅ Yes (env var) | "Video file size exceeds {maxSizeMB}MB limit" |
| **Thumbnail Size** | 5 MB | ✅ Yes (env var) | "Thumbnail file size exceeds {maxSizeMB}MB limit" |
| **Video Types** | 6 formats | ❌ No | "Invalid video file type. Allowed types: ..." |
| **Thumbnail Types** | 4 formats | ❌ No | "Invalid image file type. Allowed types: ..." |

---

## 🚨 Error Messages

### File Upload Errors

1. **Invalid Video Type:**
   ```
   Invalid video file type. Allowed types: video/mp4, video/mpeg, video/quicktime, video/x-msvideo, video/webm, video/x-matroska
   ```

2. **Invalid Image Type:**
   ```
   Invalid image file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp
   ```

3. **File Size Exceeded:**
   ```
   Video file size exceeds 100MB limit
   Thumbnail file size exceeds 5MB limit
   ```

4. **Missing File:**
   ```
   Video file is required
   Preview video file is required
   ```

### Form Validation Errors

1. **Title Validation:**
   ```
   Title must be at most 60 characters
   ```

2. **URL Validation:**
   ```
   Invalid video URL
   Invalid thumbnail URL
   ```

3. **Required Fields:**
   ```
   Title, videoUrl, and userId are required
   ```

---

## 📝 Code Locations

### Validation Schemas
- **File:** `src/validations/highlight.validation.ts`
- **Schemas:**
  - `createHighlightSchema`
  - `updateHighlightSchema`
  - `updateHighlightStatusSchema`
  - `getHighlightsQuerySchema`

### Upload Middleware
- **File:** `src/middleware/highlightUpload.middleware.ts`
- **Functions:**
  - `uploadHighlightVideo()`
  - `uploadHighlightThumbnail()`
  - `uploadHighlightPreview()`
  - `uploadHighlightMedia()`

### Controller
- **File:** `src/controllers/admin/highlight.controller.ts`
- **Functions:**
  - `uploadHighlightVideo()`
  - `uploadHighlightThumbnail()`
  - `uploadHighlightMedia()`
  - `uploadHighlightPreview()`
  - `createHighlight()`
  - `updateHighlight()`

### Configuration
- **File:** `src/config/env.ts`
- **Section:** `config.media`

---

## 🔄 Comparison with Reels

For reference, here's how highlights compare to reels:

| Feature | Highlights | Reels |
|---------|-----------|-------|
| **Title Max Length** | 60 characters | 60 characters |
| **Description Max Length** | 5000 characters | 300 characters |
| **Video Max Size** | 100 MB | 100 MB |
| **Video Max Duration** | No limit | 90 seconds |
| **Thumbnail Max Size** | 5 MB | 5 MB |

---

## ✅ Validation Checklist

When creating or updating a highlight, ensure:

- [ ] Title is between 1-60 characters
- [ ] Description is under 5000 characters (if provided)
- [ ] Video URL is a valid URL format
- [ ] Thumbnail URL is a valid URL format (if provided)
- [ ] Video file is one of the 6 allowed formats
- [ ] Video file size is under 100 MB
- [ ] Thumbnail file is one of the 4 allowed formats
- [ ] Thumbnail file size is under 5 MB
- [ ] User ID is provided (for create)
- [ ] Status is one of the allowed enum values (if updating status)

---

**Last Updated:** January 2024  
**Maintained By:** Development Team

