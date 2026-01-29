# Highlight Video Processing Flow

## Complete Flow: Creating & Uploading a Highlight from Admin Panel

This document explains the complete flow of what happens when you create/upload a highlight from the admin panel and how the video processing job is handled.

---

## 📋 **Step-by-Step Flow**

### **1. Admin Panel Request** 
**Route:** `POST /admin/highlights`

**What Happens:**
- Admin user submits a form with:
  - `title` (required)
  - `videoUrl` (required) - S3 URL of uploaded video
  - `userId` (required)
  - `description` (optional)
  - `thumbnailUrl` (optional)
  - `coachingCenterId` (optional)
  - `duration` (optional)

**Middleware Chain:**
1. `authenticate` - Verifies JWT token
2. `requireAdmin` - Ensures user is admin
3. `requirePermission(Section.HIGHLIGHT, Action.CREATE)` - Checks RBAC permissions

---

### **2. Controller Layer**
**File:** `src/controllers/admin/highlight.controller.ts`

**Function:** `createHighlight()`

**What Happens:**
- Validates required fields (`title`, `videoUrl`, `userId`)
- Extracts admin ID from authenticated user
- Calls service layer: `adminHighlightService.createHighlight()`

---

### **3. Service Layer - Create Highlight**
**File:** `src/services/admin/highlight.service.ts`

**Function:** `createHighlight()`

**What Happens:**

#### **3.1. Validation**
- Validates `userId` is a valid MongoDB ObjectId
- Validates `coachingCenterId` if provided

#### **3.2. Create Database Record**
```typescript
const highlightData = {
  userId: new Types.ObjectId(data.userId),  // Must be MongoDB ObjectId
  title: data.title,
  description: data.description || null,
  videoUrl: data.videoUrl,        // Original video URL from S3
  thumbnailUrl: data.thumbnailUrl || null,  // Optional - if not provided, will be auto-generated
  duration: data.duration || 0,
  status: HighlightStatus.PUBLISHED,  // Default status is PUBLISHED
  videoProcessingStatus: VideoProcessingStatus.NOT_STARTED,  // Video processing not started yet
  metadata: data.metadata || null,
  coachingCenterId: data.coachingCenterId ? new Types.ObjectId(data.coachingCenterId) : null,
};
```

- Creates new `StreamHighlight` document in MongoDB
- **Status is set to `PUBLISHED`** by default (no longer uses `PROCESSING`)
- **videoProcessingStatus is set to `NOT_STARTED`** initially
- Saves to database

#### **3.3. Enqueue Video Processing Job (Non-Blocking)**
```typescript
enqueueVideoProcessing({
  highlightId: highlight.id,
  videoUrl: data.videoUrl,
  folderPath: `highlights/${highlight.id}`,
  type: 'highlight',
  timestamp: Date.now(),
})
  .then(() => {
    // Update videoProcessingStatus to PROCESSING when job is successfully enqueued
    return StreamHighlightModel.findOneAndUpdate(
      { id: highlight.id },
      { videoProcessingStatus: VideoProcessingStatus.PROCESSING },
      { new: true }
    );
  })
  .catch((error) => {
    // Log error but don't block - video processing will be retried by queue system
    logger.error('Failed to enqueue video processing (non-critical)', {...});
  });
```

**Key Points:**
- ✅ **Non-blocking** - Uses `.then().catch()` instead of `await`
- ✅ **Fire-and-forget** - API responds immediately
- ✅ **Status update** - Updates `videoProcessingStatus` to `PROCESSING` when job is enqueued
- ✅ **Error handling** - Logs errors but doesn't fail the request
- ✅ **Retry mechanism** - Queue system handles retries automatically

#### **3.4. Return Response**
- Returns created highlight object
- API responds with `201 Created` status

---

### **4. Queue Layer - Add Job to Queue**
**File:** `src/queue/videoProcessingQueue.ts`

**Function:** `enqueueVideoProcessing()`

**What Happens:**

#### **4.1. Prepare Job Data**
```typescript
const jobData = {
  reelId: data.highlightId || data.reelId || '',  // Uses highlightId as reelId
  videoUrl: data.videoUrl,                         // S3 URL of original video
  folderPath: `highlights/${highlight.id}`,        // S3 folder path for processed files
  type: 'highlight',                               // Job type
  highlightId: data.highlightId,                   // Highlight ID
  timestamp: Date.now(),
};
```

#### **4.2. Add to BullMQ Queue**
```typescript
videoProcessingQueue.add('video-processing-reel', jobData, {
  attempts: 3,              // Retry up to 3 times on failure
  backoff: {
    type: 'exponential',     // Exponential backoff: 1s, 2s, 4s
    delay: 1000,
  },
});
```

**Queue Configuration:**
- **Queue Name:** `video-processing-reel` (shared with reels)
- **Redis Connection:** Uses configured Redis instance
- **Job Options:**
  - `attempts: 3` - Retries failed jobs up to 3 times
  - `backoff: exponential` - Delays between retries: 1s, 2s, 4s
  - `removeOnComplete: true` - Removes completed jobs
  - `removeOnFail: false` - Keeps failed jobs for debugging

#### **4.3. Log Job Creation**
- Logs job ID and details
- Returns immediately (non-blocking)

---

### **5. Worker Layer - Process Job**
**File:** `src/queue/videoProcessingWorker.ts`

**What Happens:**

#### **5.1. Worker Initialization**
- Worker listens to `video-processing-reel` queue
- **Concurrency:** Controlled by `VIDEO_PROCESSING_CONCURRENCY` env variable (default: 2)
- Worker is started when server starts (in `src/server.ts`)

#### **5.2. Job Picked Up**
When a job is available in the queue, worker processes it.

#### **5.3. Extract Job Data & Check for Existing Thumbnail**
```typescript
const {
  reelId,        // highlight.id (used as reelId for compatibility)
  videoUrl,     // Original video S3 URL
  folderPath,   // highlights/{highlightId}
  highlightId,  // Highlight ID
} = job.data;

// Fetch existing highlight to check for thumbnail
const existingHighlight = await StreamHighlightModel.findOne({ id: highlightId });
const existingThumbnailUrl = existingHighlight?.thumbnailUrl || null;
```

#### **5.4. Update Processing Status**
- Updates `videoProcessingStatus` to `PROCESSING` when job starts

#### **5.5. Validate Job Data**
- Checks that `reelId`, `videoUrl`, and `folderPath` are present
- Throws error if validation fails (job will be retried)

#### **5.6. Call Video Processor**
```typescript
// Pass existing thumbnail URL to skip regeneration if it exists
const result = await processVideoToHLS(videoUrl, folderPath, reelId, existingThumbnailUrl);
```

---

### **6. Video Processing - HLS Conversion**
**File:** `src/services/common/hlsVideoProcessor.service.ts`

**Function:** `processVideoToHLS()`

**What Happens:**

#### **6.1. Setup**
- Creates temporary directory for processing
- Extracts bucket name and key from S3 URL
- Initializes logger

#### **6.2. Download Video from S3**
- Downloads original video from S3 to temporary directory
- Uses axios with retry logic (3 retries, exponential backoff)
- Timeout: 60 seconds

#### **6.3. Get Video Information**
- Uses FFprobe to get video metadata:
  - Width, height
  - Duration
  - Codec
  - Bitrate
  - Frame rate
- Calculates aspect ratio

#### **6.4. Generate Thumbnail (Conditional)**
- **If existing thumbnail provided:** Skips generation, uses existing URL
- **If no existing thumbnail:** 
  - Extracts frame at `00:00:01` (1 second)
  - Saves as `thumbnail.jpg`
  - Will be uploaded to S3 later

#### **6.5. Process Multiple Quality Versions**
For each quality (240p, 360p, 480p, 720p, 1080p):

1. **Create Quality Directory**
   - `output/{quality}/` (e.g., `output/720p/`)

2. **Transcode Video**
   - Converts to target resolution (maintaining aspect ratio)
   - Applies video bitrate and audio bitrate
   - Settings:
     - Preset: `fast`
     - CRF: `23`
     - Codec: `libx264` (video), `aac` (audio)

3. **Create HLS Segments**
   - Runs FFmpeg command to create HLS segments
   - Segment duration: 1 second
   - Playlist type: VOD (Video on Demand)
   - Output: `{quality}/segments/playlist.m3u8` and `.ts` files

#### **6.6. Create Master Playlist**
- Generates `master.m3u8` file
- Contains references to all quality playlists
- Includes bandwidth and resolution info for adaptive streaming

#### **6.7. Generate Video Preview**
- Creates a 3-second preview video (automatically generated during processing)
- Max dimension: 720px
- Target bitrate: 400k
- Max file size: 400KB (reduces quality if needed)
- Saves as `preview.mp4`

**Note:** Preview videos can also be manually uploaded using the `POST /admin/highlights/:id/upload-preview` endpoint. If a preview is manually uploaded, it will replace any auto-generated preview.

#### **6.8. Upload All Files to S3**
- Uploads all generated files to S3:
  - Master playlist: `highlights/{highlightId}/master.m3u8`
  - Thumbnail: `highlights/{highlightId}/thumbnail.jpg`
  - Preview: `highlights/{highlightId}/preview.mp4`
  - Quality playlists: `highlights/{highlightId}/{quality}/segments/playlist.m3u8`
  - HLS segments: `highlights/{highlightId}/{quality}/segments/segment_*.ts`

**Upload Settings:**
- Queue size: 4 concurrent uploads
- Part size: 5MB per part
- Progress tracking via `process.stdout.write()`

#### **6.9. Cleanup**
- Deletes all temporary files and directories
- Removes input video, output directory, and temp directory

#### **6.10. Return Processing Result**
```typescript
return {
  masterPlaylistUrl: `https://{bucket}.s3.amazonaws.com/highlights/{highlightId}/master.m3u8`,
  thumbnailUrl: existingThumbnailUrl || `https://{bucket}.s3.amazonaws.com/highlights/{highlightId}/thumbnail.jpg`,
  previewUrl: `https://{bucket}.s3.amazonaws.com/highlights/{highlightId}/preview.mp4`,
  qualities: [
    { name: '240p', playlistUrl: '...' },
    { name: '360p', playlistUrl: '...' },
    // ... etc
  ],
};
```

**Note:** `thumbnailUrl` will be the existing one if provided, otherwise the generated one. This preserves manually uploaded thumbnails.

#### **6.11. Error Handling**
If processing fails:
- Logs error details
- Attempts to call status update API (if `MAIN_SERVER_URL` is set)
- Throws error (job will be retried by queue)

---

### **7. Worker - Job Completion**

#### **7.1. On Success**
```typescript
videoProcessingWorker.on('completed', (job) => {
  logger.info('Video processing job completed', {
    jobId: job.id,
    data: job.data,
  });
});
```

**Current Status:**
- ✅ Job marked as completed in queue
- ✅ Highlight status remains `PROCESSING` (needs manual update or webhook)

**Note:** Currently, the highlight status is **NOT automatically updated** after processing completes. You need to either:
1. Manually update status via admin panel
2. Implement a webhook/callback to update status
3. Add status update logic in the worker after successful processing

#### **7.2. On Failure**
```typescript
videoProcessingWorker.on('failed', (job, error) => {
  logger.error('Video processing job failed', {
    jobId: job?.id,
    error: error.message,
  });
});
```

**What Happens:**
- Job is marked as failed
- Queue system will retry (up to 3 attempts)
- Highlight `videoProcessingStatus` is updated to `FAILED` after all retries exhausted
- Highlight `status` remains unchanged (e.g., `PUBLISHED`)

---

## 🔄 **Complete Flow Diagram**

```
Admin Panel
    │
    ├─> POST /admin/highlights
    │   │
    │   ├─> Authentication & Authorization
    │   │
    │   ├─> Controller: createHighlight()
    │   │
    │   ├─> Service: createHighlight()
    │   │   ├─> Create DB record (status: PUBLISHED, videoProcessingStatus: NOT_STARTED)
    │   │   └─> enqueueVideoProcessing() [NON-BLOCKING]
    │   │       └─> Update videoProcessingStatus: NOT_STARTED → PROCESSING
    │   │
    │   └─> Return 201 Created ✅
    │
    └─> Queue: videoProcessingQueue
        │
        ├─> Add job to Redis queue
        │   └─> Job ID generated
        │
        └─> Worker: videoProcessingWorker
            │
            ├─> Pick up job from queue
            │
            ├─> processVideoToHLS()
            │   │
            │   ├─> Download video from S3
            │   │
            │   ├─> Get video metadata
            │   │
            │   ├─> Check for existing thumbnail (skip generation if exists)
            │   │   └─> Generate thumbnail only if not provided
            │   │
            │   ├─> Process 5 quality versions (240p-1080p)
            │   │   ├─> Transcode video
            │   │   └─> Create HLS segments
            │   │
            │   ├─> Create master playlist
            │   │
            │   ├─> Generate preview video
            │   │
            │   ├─> Upload all files to S3
            │   │
            │   └─> Cleanup temp files
            │
            └─> Job completed ✅
                │
                └─> [STATUS UPDATE NEEDED]
                    └─> Update highlight status to PUBLISHED
```

---

## ⚙️ **Configuration**

### **Environment Variables**

1. **`VIDEO_PROCESSING_CONCURRENCY`**
   - Default: `2`
   - Controls how many videos are processed simultaneously
   - Example: `VIDEO_PROCESSING_CONCURRENCY=3` processes 3 videos at once

2. **`MAIN_SERVER_URL`** (Optional)
   - Used for status update callbacks
   - Example: `http://localhost:3000`

3. **Redis Configuration**
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`
   - `REDIS_DB_BULLMQ`

4. **AWS S3 Configuration**
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET`

---

## 📊 **Job Status Tracking**

### **Queue Job States**

1. **`waiting`** - Job is in queue, waiting to be processed
2. **`active`** - Job is currently being processed
3. **`completed`** - Job finished successfully
4. **`failed`** - Job failed (will retry up to 3 times)
5. **`stalled`** - Job processing stalled (worker crashed)

### **Highlight Status** (Content Status)

- **`PUBLISHED`** - Highlight is published and visible (default)
- **`ARCHIVED`** - Highlight archived by admin
- **`BLOCKED`** - Highlight blocked by admin
- **`DELETED`** - Highlight soft-deleted

**Note:** `PROCESSING` status has been removed. Video processing is tracked separately via `videoProcessingStatus`.

### **Video Processing Status**

- **`NOT_STARTED`** - Video processing job not yet started (initial state)
- **`PROCESSING`** - Video is currently being processed
- **`COMPLETED`** - Video processing completed successfully
- **`FAILED`** - Video processing failed (after all retries)

---

## 🔧 **Current Limitations & Recommendations**

### **1. Status Updates (Now Automatic)**
✅ **Fixed:** Video processing status is now automatically updated:
- `videoProcessingStatus` is updated to `PROCESSING` when job starts
- `videoProcessingStatus` is updated to `COMPLETED` when processing succeeds
- `videoProcessingStatus` is updated to `FAILED` when processing fails
- Processed video URLs (HLS, thumbnail, preview) are automatically updated

**Note:** The highlight `status` field (PUBLISHED, ARCHIVED, etc.) is separate from video processing status and is managed by admins.

### **2. No Progress Tracking**
**Issue:** No way to track processing progress in real-time.

**Recommendation:** 
- Use BullMQ job progress updates
- Store progress in highlight metadata
- Create WebSocket endpoint for real-time updates

### **3. Error Recovery**
✅ **Fixed:** If processing fails after 3 retries:
- `videoProcessingStatus` is automatically updated to `FAILED`
- Error details are logged
- Highlight `status` remains unchanged (admin can manually change if needed)

**Recommendation:**
- Send notification to admin when processing fails
- Add retry mechanism for failed highlights
- Provide admin UI to manually retry failed processing

---

## 📝 **Summary**

1. ✅ Admin creates highlight → Status: `PUBLISHED`, videoProcessingStatus: `NOT_STARTED`
2. ✅ Job added to queue (non-blocking) → videoProcessingStatus: `PROCESSING`
3. ✅ API responds immediately
4. ✅ Worker picks up job
5. ✅ Video downloaded from S3
6. ✅ Video processed (HLS conversion, thumbnail if needed, preview)
7. ✅ Processed files uploaded to S3
8. ✅ Job marked as completed → videoProcessingStatus: `COMPLETED`
9. ✅ Highlight automatically updated with processed URLs

The entire process is **asynchronous** and **non-blocking**, ensuring the admin panel remains responsive while videos are processed in the background.

---

## 🎬 **Additional Endpoints**

### **Upload Preview Video**

**Route:** `POST /admin/highlights/:id/upload-preview`

**Description:** Manually upload a preview video for a specific highlight. This allows admins to upload a custom preview video instead of using the auto-generated one.

**Request:**
- Method: `POST`
- Headers: `Authorization: Bearer <token>`
- Content-Type: `multipart/form-data`
- Body: `preview` (file) - Video file (MP4, MPEG, MOV, AVI, WebM, MKV)

**Response:**
```json
{
  "success": true,
  "data": {
    "previewUrl": "https://bucket.s3.region.amazonaws.com/highlights/preview.mp4",
    "highlight": { ... }
  },
  "message": "Preview video uploaded and updated successfully"
}
```

**Notes:**
- Requires `highlight:update` permission
- Max file size: 100MB (configurable via `MAX_VIDEO_SIZE_MB`)
- Accepts video formats: MP4, MPEG, MOV, AVI, WebM, MKV
- The preview video will be uploaded to S3 and the highlight's `previewUrl` will be updated
- If a preview video already exists, it will be replaced with the new one
- This is useful when you want to use a custom preview instead of the auto-generated one

