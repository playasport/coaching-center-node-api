# Queue Management & Log Viewing Documentation

## Overview

The Queue Management system provides admin panel endpoints to monitor, manage, and control background job queues. This includes viewing queue statistics, managing individual jobs, controlling queue processing, and viewing application logs.

## Available Queues

The system currently manages two main queues:

1. **`thumbnail-generation`** - Handles thumbnail generation for coaching center videos
2. **`video-processing-reel`** - Handles video processing for highlights and reels (HLS conversion, thumbnail generation, etc.)

## Permissions

All queue management endpoints require:
- Authentication (Bearer token)
- Admin role
- Appropriate permissions:
  - `settings:view` - For viewing queues, jobs, and logs
  - `settings:update` - For managing jobs (retry, pause, resume)
  - `settings:delete` - For removing jobs and cleaning queues

## API Endpoints

### Queue Management

#### Get All Queues
Get statistics for all queues.

**Endpoint:** `GET /api/v1/admin/queues`

**Response:**
```json
{
  "success": true,
  "message": "Queues retrieved successfully",
  "data": {
    "queues": [
      {
        "name": "thumbnail-generation",
        "active": 2,
        "waiting": 5,
        "completed": 150,
        "failed": 3,
        "delayed": 0,
        "paused": false
      },
      {
        "name": "video-processing-reel",
        "active": 1,
        "waiting": 8,
        "completed": 45,
        "failed": 2,
        "delayed": 0,
        "paused": false
      }
    ],
    "totalQueues": 2
  }
}
```

#### Get Queue Jobs
Get jobs from a specific queue with filtering and pagination.

**Endpoint:** `GET /api/v1/admin/queues/:queueName/jobs`

**Query Parameters:**
- `status` (optional) - Filter by status: `active`, `waiting`, `completed`, `failed`, `delayed`, or `all` (default: `all`)
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50, max: 100)

**Example:**
```
GET /api/v1/admin/queues/video-processing-reel/jobs?status=failed&page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "message": "Queue jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "123",
        "name": "video-processing-reel",
        "data": {
          "reelId": "abc123",
          "videoUrl": "https://...",
          "folderPath": "highlights/abc123",
          "type": "highlight"
        },
        "state": "failed",
        "progress": 0,
        "timestamp": 1234567890,
        "processedOn": 1234567891,
        "finishedOn": null,
        "failedReason": "Video file not found",
        "returnvalue": null,
        "attemptsMade": 3,
        "attempts": 3
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

#### Get Specific Job
Get detailed information about a specific job.

**Endpoint:** `GET /api/v1/admin/queues/:queueName/jobs/:jobId`

**Example:**
```
GET /api/v1/admin/queues/video-processing-reel/jobs/123
```

**Response:**
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "job": {
      "id": "123",
      "name": "video-processing-reel",
      "data": { ... },
      "state": "completed",
      "progress": 100,
      "timestamp": 1234567890,
      "processedOn": 1234567891,
      "finishedOn": 1234567892,
      "failedReason": null,
      "returnvalue": { "success": true },
      "attemptsMade": 1,
      "attempts": 3
    }
  }
}
```

#### Retry Failed Job
Retry a failed job.

**Endpoint:** `POST /api/v1/admin/queues/:queueName/jobs/:jobId/retry`

**Example:**
```
POST /api/v1/admin/queues/video-processing-reel/jobs/123/retry
```

**Response:**
```json
{
  "success": true,
  "message": "Job retried successfully",
  "data": null
}
```

#### Remove Job
Remove a job from the queue.

**Endpoint:** `DELETE /api/v1/admin/queues/:queueName/jobs/:jobId`

**Example:**
```
DELETE /api/v1/admin/queues/video-processing-reel/jobs/123
```

**Response:**
```json
{
  "success": true,
  "message": "Job removed successfully",
  "data": null
}
```

#### Pause Queue
Pause a queue (stops processing new jobs, but active jobs continue).

**Endpoint:** `POST /api/v1/admin/queues/:queueName/pause`

**Example:**
```
POST /api/v1/admin/queues/video-processing-reel/pause
```

**Response:**
```json
{
  "success": true,
  "message": "Queue paused successfully",
  "data": null
}
```

#### Resume Queue
Resume a paused queue.

**Endpoint:** `POST /api/v1/admin/queues/:queueName/resume`

**Example:**
```
POST /api/v1/admin/queues/video-processing-reel/resume
```

**Response:**
```json
{
  "success": true,
  "message": "Queue resumed successfully",
  "data": null
}
```

#### Clean Queue
Remove completed and failed jobs from the queue.

**Endpoint:** `POST /api/v1/admin/queues/:queueName/clean`

**Query Parameters:**
- `grace` (optional) - Grace period in milliseconds (default: 1000)
- `limit` (optional) - Maximum number of jobs to clean (default: 1000)

**Example:**
```
POST /api/v1/admin/queues/video-processing-reel/clean?grace=1000&limit=1000
```

**Response:**
```json
{
  "success": true,
  "message": "Queue cleaned successfully",
  "data": {
    "cleaned": 150
  }
}
```

### Log Viewing

#### Get Application Logs
Get application logs with filtering options.

**Endpoint:** `GET /api/v1/admin/queues/logs/application`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 100, max: 500)
- `level` (optional) - Filter by log level: `debug`, `info`, `warn`, `error`
- `search` (optional) - Search term to filter logs

**Example:**
```
GET /api/v1/admin/queues/logs/application?page=1&limit=100&level=error&search=video
```

**Response:**
```json
{
  "success": true,
  "message": "Application logs retrieved successfully",
  "data": {
    "logs": [
      {
        "timestamp": "2024-01-15T10:30:00.000Z",
        "level": "error",
        "message": "Video processing failed",
        "meta": {
          "jobId": "123",
          "error": "Video file not found"
        },
        "raw": "[2024-01-15T10:30:00.000Z] [ERROR] Video processing failed | {\"jobId\":\"123\",\"error\":\"Video file not found\"}"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

#### Get Queue Logs
Get queue-related logs.

**Endpoint:** `GET /api/v1/admin/queues/logs/queue`

**Query Parameters:**
- `queueName` (optional) - Filter by specific queue name
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 100)

**Example:**
```
GET /api/v1/admin/queues/logs/queue?queueName=video-processing-reel&page=1&limit=100
```

**Response:**
Same format as application logs.

#### Get Video Processing Logs
Get video processing specific logs.

**Endpoint:** `GET /api/v1/admin/queues/logs/video-processing`

**Query Parameters:**
- `jobId` (optional) - Filter by specific job ID
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 100)

**Example:**
```
GET /api/v1/admin/queues/logs/video-processing?jobId=123&page=1&limit=100
```

**Response:**
Same format as application logs.

#### Get Logs by Job ID
Get all logs related to a specific job ID.

**Endpoint:** `GET /api/v1/admin/queues/logs/job/:jobId`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 100)

**Example:**
```
GET /api/v1/admin/queues/logs/job/123?page=1&limit=100
```

**Response:**
Same format as application logs.

#### Get Log File Info
Get information about the log file.

**Endpoint:** `GET /api/v1/admin/queues/logs/info`

**Response:**
```json
{
  "success": true,
  "message": "Log file info retrieved successfully",
  "data": {
    "exists": true,
    "path": "/path/to/logs/application.log",
    "size": 1048576,
    "lastModified": "2024-01-15T10:30:00.000Z"
  }
}
```

## Job States

Jobs can be in the following states:

- **`active`** - Currently being processed
- **`waiting`** - Queued and waiting to be processed
- **`completed`** - Successfully completed
- **`failed`** - Failed after all retry attempts
- **`delayed`** - Scheduled for future processing
- **`paused`** - Paused (queue is paused)

## Usage Examples

### Monitor Queue Health

```bash
# Get all queue statistics
curl -X GET "http://localhost:3000/api/v1/admin/queues" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Find and Retry Failed Jobs

```bash
# Get failed jobs
curl -X GET "http://localhost:3000/api/v1/admin/queues/video-processing-reel/jobs?status=failed" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Retry a specific failed job
curl -X POST "http://localhost:3000/api/v1/admin/queues/video-processing-reel/jobs/123/retry" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Pause Queue for Maintenance

```bash
# Pause the queue
curl -X POST "http://localhost:3000/api/v1/admin/queues/video-processing-reel/pause" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resume the queue
curl -X POST "http://localhost:3000/api/v1/admin/queues/video-processing-reel/resume" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Video Processing Logs

```bash
# Get video processing logs for a specific job
curl -X GET "http://localhost:3000/api/v1/admin/queues/logs/video-processing?jobId=123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get all error logs related to video processing
curl -X GET "http://localhost:3000/api/v1/admin/queues/logs/application?level=error&search=video" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Clean Old Jobs

```bash
# Clean completed and failed jobs older than 1 second
curl -X POST "http://localhost:3000/api/v1/admin/queues/video-processing-reel/clean?grace=1000&limit=1000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "queueName",
      "message": "Queue not found: invalid-queue"
    }
  ]
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (queue or job not found)
- `500` - Internal Server Error

## Log File Location

Logs are stored in the `logs/application.log` file (in production mode). The log file path is:
```
{project_root}/logs/application.log
```

In development mode, logs are output to the console instead of a file.

## Best Practices

1. **Monitor Queue Health Regularly**
   - Check queue statistics periodically to ensure jobs are processing
   - Monitor failed job counts and investigate failures

2. **Handle Failed Jobs Promptly**
   - Review failed jobs to understand the cause
   - Retry jobs if the failure was transient
   - Remove jobs that cannot be recovered

3. **Clean Old Jobs Periodically**
   - Use the clean endpoint to remove old completed/failed jobs
   - This helps maintain queue performance and reduce Redis memory usage

4. **Use Logs for Debugging**
   - Filter logs by job ID to trace specific job execution
   - Use log levels to focus on errors or warnings
   - Search logs for specific keywords related to issues

5. **Pause Queues During Maintenance**
   - Pause queues before performing maintenance
   - Resume queues after maintenance is complete

## Queue Configuration

### Video Processing Concurrency

The number of videos processed simultaneously is controlled by the `VIDEO_PROCESSING_CONCURRENCY` environment variable in your video converter server:

```env
VIDEO_PROCESSING_CONCURRENCY=2
```

Default: 2 concurrent jobs

### Queue Retention

- **Completed Jobs**: Removed after 24 hours or when queue is cleaned
- **Failed Jobs**: Kept for 7 days or until manually removed
- **Active/Waiting Jobs**: Kept until processed or removed

## Troubleshooting

### Queue Not Processing Jobs

1. Check if the queue is paused:
   ```bash
   GET /api/v1/admin/queues
   ```
   Look for `"paused": true`

2. Check for failed jobs that might be blocking:
   ```bash
   GET /api/v1/admin/queues/{queueName}/jobs?status=failed
   ```

3. Check worker logs:
   ```bash
   GET /api/v1/admin/queues/logs/queue?queueName={queueName}
   ```

### High Number of Failed Jobs

1. Review failed job details:
   ```bash
   GET /api/v1/admin/queues/{queueName}/jobs?status=failed
   ```

2. Check error logs:
   ```bash
   GET /api/v1/admin/queues/logs/application?level=error
   ```

3. Retry jobs if appropriate:
   ```bash
   POST /api/v1/admin/queues/{queueName}/jobs/{jobId}/retry
   ```

### Logs Not Appearing

1. Check if log file exists:
   ```bash
   GET /api/v1/admin/queues/logs/info
   ```

2. Verify you're in production mode (logs are only written to file in production)

3. Check file permissions for the `logs/` directory

## Related Documentation

- [Video Processing Service](../src/services/common/videoProcessing.service.ts)
- [Queue Implementation](../src/queue/)
- [Admin Panel Routes](../src/routes/admin/queue.routes.ts)

