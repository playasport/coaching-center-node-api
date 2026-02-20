# Video Upload: Pre-signed URL Migration Guide

## Problem Statement

The current video upload system routes **entire video files through the Node.js server** before uploading them to S3. This creates critical issues for files >100MB:

| Issue | Impact |
|---|---|
| Full file buffered in Node.js RAM (`multer.memoryStorage()`) | Server OOM crash with concurrent uploads |
| Single `PutObjectCommand` to S3 | Unreliable for large files, 5GB hard limit |
| Double bandwidth usage | Client → Server → S3 (file travels twice) |
| Request timeout risk | Large files may exceed HTTP timeout limits |
| Blocks event loop | Server becomes unresponsive during large uploads |

---

## Current Architecture (What We Have)

```
Client ──[full video file 500MB]──► Node.js Server (Multer memory) ──[buffer]──► AWS S3
```

**Files involved:**
- `src/middleware/coachingCenterUpload.middleware.ts` — Multer with `memoryStorage()`
- `src/middleware/highlightUpload.middleware.ts` — Multer with `memoryStorage()`
- `src/services/common/coachingCenterMedia.service.ts` — `PutObjectCommand` (single PUT)
- `src/services/common/s3.service.ts` — S3 client setup
- `src/controllers/academy/coachingCenterMedia.controller.ts` — Upload controller

---

## Recommended Architecture (Pre-signed URL)

```
1. Client ──► Node.js: "I want to upload a 250MB .mp4 video"
2. Node.js ──► Client: Pre-signed URL(s) + upload ID
3. Client ──► S3 directly: Upload video (Node.js never touches the file)
4. Client ──► Node.js: "Upload complete, here's the S3 key + metadata"
5. Node.js: Validate in S3, save to DB, trigger HLS processing if needed
```

**Key Benefits:**
- Node.js server only handles lightweight JSON requests (~1KB vs 500MB)
- No memory pressure on the server
- Direct client-to-S3 transfer = faster uploads
- S3 multipart upload = reliable for files of any size
- Can handle unlimited concurrent uploads without server scaling

---

## Implementation Plan

### Phase 1: New S3 Pre-signed URL Service

Create `src/services/common/s3Presigned.service.ts`

```typescript
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from './s3.service';
import { config } from '../../config/env';
import { v4 as uuidv4 } from 'uuid';

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const PART_SIZE = 50 * 1024 * 1024; // 50MB per part

/**
 * For small files (<100MB): single pre-signed PUT URL
 */
export const generatePresignedUploadUrl = async (params: {
  folder: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadType: 'temporary' | 'final';
}): Promise<{
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}> => {
  const client = getS3Client();
  if (!client) throw new Error('S3 client not configured');

  const ext = params.fileName.split('.').pop() || 'mp4';
  const prefix = params.uploadType === 'temporary' ? 'temp/' : '';
  const s3Key = `${prefix}${params.folder}/playasport-${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    ContentType: params.contentType,
    ContentLength: params.fileSize,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });

  return {
    uploadUrl,
    s3Key,
    expiresIn: PRESIGNED_URL_EXPIRY,
  };
};

/**
 * For large files (>100MB): multipart pre-signed URLs
 */
export const initiateMultipartPresignedUpload = async (params: {
  folder: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadType: 'temporary' | 'final';
}): Promise<{
  uploadId: string;
  s3Key: string;
  parts: { partNumber: number; uploadUrl: string }[];
  expiresIn: number;
}> => {
  const client = getS3Client();
  if (!client) throw new Error('S3 client not configured');

  const ext = params.fileName.split('.').pop() || 'mp4';
  const prefix = params.uploadType === 'temporary' ? 'temp/' : '';
  const s3Key = `${prefix}${params.folder}/playasport-${uuidv4()}.${ext}`;

  // Step 1: Create multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    ContentType: params.contentType,
  });
  const { UploadId } = await client.send(createCommand);

  if (!UploadId) throw new Error('Failed to initiate multipart upload');

  // Step 2: Generate pre-signed URL for each part
  const totalParts = Math.ceil(params.fileSize / PART_SIZE);
  const parts: { partNumber: number; uploadUrl: string }[] = [];

  for (let i = 1; i <= totalParts; i++) {
    const uploadPartCommand = new UploadPartCommand({
      Bucket: config.aws.s3Bucket,
      Key: s3Key,
      UploadId,
      PartNumber: i,
    });

    const uploadUrl = await getSignedUrl(client, uploadPartCommand, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    parts.push({ partNumber: i, uploadUrl });
  }

  return {
    uploadId: UploadId,
    s3Key,
    parts,
    expiresIn: PRESIGNED_URL_EXPIRY,
  };
};

/**
 * Complete multipart upload after all parts are uploaded
 */
export const completeMultipartUpload = async (params: {
  s3Key: string;
  uploadId: string;
  parts: { partNumber: number; eTag: string }[];
}): Promise<{ fileUrl: string }> => {
  const client = getS3Client();
  if (!client) throw new Error('S3 client not configured');

  const command = new CompleteMultipartUploadCommand({
    Bucket: config.aws.s3Bucket,
    Key: params.s3Key,
    UploadId: params.uploadId,
    MultipartUpload: {
      Parts: params.parts.map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.eTag,
      })),
    },
  });

  await client.send(command);

  const fileUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${params.s3Key}`;
  return { fileUrl };
};

/**
 * Abort a failed multipart upload (cleanup)
 */
export const abortMultipartUpload = async (params: {
  s3Key: string;
  uploadId: string;
}): Promise<void> => {
  const client = getS3Client();
  if (!client) return;

  const command = new AbortMultipartUploadCommand({
    Bucket: config.aws.s3Bucket,
    Key: params.s3Key,
    UploadId: params.uploadId,
  });

  await client.send(command);
};
```

---

### Phase 2: New API Endpoints

Create new routes for pre-signed URL workflow:

#### Route: `POST /api/v1/upload/request-url`

**Purpose:** Client requests a pre-signed URL before uploading.

**Request Body:**
```json
{
  "fileName": "my-coaching-video.mp4",
  "contentType": "video/mp4",
  "fileSize": 262144000,
  "folder": "videos/coachingCentres",
  "uploadType": "temporary"
}
```

**Response (small file <100MB):**
```json
{
  "success": true,
  "data": {
    "method": "single",
    "uploadUrl": "https://bucket.s3.amazonaws.com/temp/videos/...?X-Amz-Signature=...",
    "s3Key": "temp/videos/coachingCentres/playasport-uuid.mp4",
    "expiresIn": 3600
  }
}
```

**Response (large file >100MB):**
```json
{
  "success": true,
  "data": {
    "method": "multipart",
    "uploadId": "abc123...",
    "s3Key": "temp/videos/coachingCentres/playasport-uuid.mp4",
    "parts": [
      { "partNumber": 1, "uploadUrl": "https://...?partNumber=1&X-Amz-Signature=..." },
      { "partNumber": 2, "uploadUrl": "https://...?partNumber=2&X-Amz-Signature=..." },
      { "partNumber": 3, "uploadUrl": "https://...?partNumber=3&X-Amz-Signature=..." }
    ],
    "partSize": 52428800,
    "expiresIn": 3600
  }
}
```

#### Route: `POST /api/v1/upload/complete-multipart`

**Purpose:** Client confirms all parts uploaded. Server finalizes the multipart upload.

**Request Body:**
```json
{
  "s3Key": "temp/videos/coachingCentres/playasport-uuid.mp4",
  "uploadId": "abc123...",
  "parts": [
    { "partNumber": 1, "eTag": "\"etag1\"" },
    { "partNumber": 2, "eTag": "\"etag2\"" },
    { "partNumber": 3, "eTag": "\"etag3\"" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://bucket.s3.region.amazonaws.com/temp/videos/coachingCentres/playasport-uuid.mp4"
  }
}
```

#### Route: `POST /api/v1/upload/confirm`

**Purpose:** Client sends metadata after upload completes. Server validates the file exists in S3 and saves to DB.

**Request Body:**
```json
{
  "s3Key": "temp/videos/coachingCentres/playasport-uuid.mp4",
  "fileUrl": "https://bucket.s3.region.amazonaws.com/temp/videos/...",
  "contentType": "video/mp4",
  "fileSize": 262144000,
  "fileName": "my-coaching-video.mp4",
  "resourceType": "coachingCenter",
  "resourceId": "64f1a2b3c4d5e6f7..."
}
```

#### Route: `POST /api/v1/upload/abort-multipart`

**Purpose:** Cleanup if multipart upload fails midway.

**Request Body:**
```json
{
  "s3Key": "temp/videos/coachingCentres/playasport-uuid.mp4",
  "uploadId": "abc123..."
}
```

---

### Phase 3: S3 CORS Configuration

Your S3 bucket needs CORS configured to allow direct browser uploads:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": [
      "https://academy.playasport.in",
      "https://admin.playasport.in",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 3600
  }
]
```

**How to apply:**
```bash
aws s3api put-bucket-cors --bucket YOUR_BUCKET_NAME --cors-configuration file://cors.json
```

---

### Phase 4: Frontend Implementation

#### Single File Upload (< 100MB)

```typescript
// 1. Request pre-signed URL from your server
const { data } = await api.post('/upload/request-url', {
  fileName: file.name,
  contentType: file.type,
  fileSize: file.size,
  folder: 'videos/coachingCentres',
  uploadType: 'temporary',
});

// 2. Upload directly to S3 (bypasses your Node server entirely)
await fetch(data.uploadUrl, {
  method: 'PUT',
  body: file,                    // raw File object
  headers: {
    'Content-Type': file.type,
  },
});

// 3. Confirm upload with your server (metadata only)
await api.post('/upload/confirm', {
  s3Key: data.s3Key,
  contentType: file.type,
  fileSize: file.size,
  fileName: file.name,
  resourceType: 'coachingCenter',
});
```

#### Multipart Upload (> 100MB) with Progress

```typescript
// 1. Request multipart pre-signed URLs
const { data } = await api.post('/upload/request-url', {
  fileName: file.name,
  contentType: file.type,
  fileSize: file.size,
  folder: 'videos/coachingCentres',
  uploadType: 'temporary',
});

if (data.method === 'multipart') {
  const completedParts: { partNumber: number; eTag: string }[] = [];
  const partSize = data.partSize;

  // 2. Upload each part directly to S3
  for (const part of data.parts) {
    const start = (part.partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const blob = file.slice(start, end);

    const response = await fetch(part.uploadUrl, {
      method: 'PUT',
      body: blob,
    });

    const eTag = response.headers.get('ETag');
    completedParts.push({
      partNumber: part.partNumber,
      eTag: eTag!,
    });

    // Update progress: (part.partNumber / data.parts.length) * 100
  }

  // 3. Tell server to finalize the multipart upload
  await api.post('/upload/complete-multipart', {
    s3Key: data.s3Key,
    uploadId: data.uploadId,
    parts: completedParts,
  });

  // 4. Confirm with metadata
  await api.post('/upload/confirm', {
    s3Key: data.s3Key,
    contentType: file.type,
    fileSize: file.size,
    fileName: file.name,
    resourceType: 'coachingCenter',
  });
}
```

---

### Phase 5: New npm Dependency

Install the pre-signed URL helper:

```bash
npm install @aws-sdk/s3-request-presigner
```

> Note: `@aws-sdk/client-s3` is already installed in the project.

---

### Phase 6: Environment Variables

No new env variables needed. The existing AWS config is sufficient:

```env
AWS_ACCESS_KEY_ID=...          # Already configured
AWS_SECRET_ACCESS_KEY=...      # Already configured
AWS_REGION=...                 # Already configured
AWS_S3_BUCKET=...              # Already configured
```

Optional new variables you may want to add:

```env
# Pre-signed URL settings
PRESIGNED_URL_EXPIRY_SECONDS=3600       # URL validity (default: 1 hour)
MULTIPART_THRESHOLD_MB=100              # Switch to multipart above this size
MULTIPART_PART_SIZE_MB=50               # Size of each upload part
```

---

### Phase 7: IAM Permissions

Ensure your AWS IAM user/role has these additional S3 permissions (some may already exist):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

---

## File-by-File Changes Summary

| File | Action | Description |
|---|---|---|
| `src/services/common/s3Presigned.service.ts` | **CREATE** | Pre-signed URL generation + multipart helpers |
| `src/controllers/common/upload.controller.ts` | **CREATE** | Controller for new upload endpoints |
| `src/routes/common/upload.routes.ts` | **CREATE** | Routes: request-url, complete-multipart, confirm, abort |
| `src/validations/upload.validation.ts` | **CREATE** | Joi/Zod schemas for new endpoints |
| `src/middleware/coachingCenterUpload.middleware.ts` | **MODIFY** | Keep for images/docs; remove video from Multer fields |
| `src/middleware/highlightUpload.middleware.ts` | **MODIFY** | Switch highlights/reels to pre-signed URL flow |
| `src/services/common/coachingCenterMedia.service.ts` | **MODIFY** | Add method to handle metadata-only video registration |
| `src/config/env.ts` | **MODIFY** | Add optional presigned URL config |
| S3 Bucket | **CONFIGURE** | Add CORS policy for direct browser uploads |
| IAM Policy | **CONFIGURE** | Add multipart upload permissions |

---

## Migration Strategy

### Step 1: Build (No Breaking Changes)
- Add new pre-signed URL service and endpoints **alongside** existing upload routes
- Existing Multer-based upload continues to work

### Step 2: Frontend Adoption
- Update frontend to use new pre-signed URL flow for videos only
- Images, documents, logos continue with existing Multer flow (they're small)

### Step 3: Deprecate
- Once frontend fully migrated, remove video from Multer middleware fields
- Reduce `MAX_VIDEO_SIZE_MB` since server no longer handles video buffers
- Add deprecation notice to old video upload endpoints

---

## Security Considerations

1. **Pre-signed URLs are time-limited** (1 hour default) — cannot be reused after expiry
2. **File type validation** — Enforce `contentType` whitelist when generating URLs
3. **File size validation** — Validate `fileSize` against limits before generating URL
4. **S3 key path validation** — Ensure clients can't overwrite arbitrary S3 paths
5. **Authentication required** — All pre-signed URL endpoints must require JWT auth
6. **Server-side verification** — On `/confirm`, use `HeadObject` to verify the file actually exists in S3 and matches the claimed size
7. **Lifecycle rules** — Add S3 lifecycle rule to auto-delete `temp/` files after 24 hours (in case confirm is never called)

---

## Performance Comparison

| Metric | Current (Multer) | Pre-signed URL |
|---|---|---|
| 100MB upload time | ~30s (double hop) | ~15s (direct to S3) |
| 500MB upload time | ~150s + OOM risk | ~60s (multipart, parallel parts) |
| Server memory per upload | 100-500MB | ~1KB (JSON only) |
| Concurrent uploads | 2-3 before crash | Unlimited (S3 handles it) |
| Upload reliability | Low for large files | High (multipart with retry) |

---

## References

- [AWS S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [AWS S3 Multipart Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [@aws-sdk/s3-request-presigner](https://www.npmjs.com/package/@aws-sdk/s3-request-presigner)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
