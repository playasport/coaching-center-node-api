# Cron Job Testing Guide

This guide explains how to manually test the cron jobs without waiting for their scheduled execution times.

## Available Jobs

1. **Permanent Delete Job** - Deletes records (highlights, reels, coaching centers) that have been soft-deleted for 1+ year
2. **Media Cleanup Job** - Deletes media files from coaching centers that have been soft-deleted for 6+ months

## Test Commands

### Test Permanent Delete Job

```bash
npm run test:jobs -- --job=permanent-delete
```

This will:
- Find all highlights, reels, and coaching centers soft-deleted for 1+ year
- Delete all associated media files from S3
- Permanently delete records from the database
- Log all operations

### Test Media Cleanup Job

```bash
npm run test:jobs -- --job=media-cleanup
```

This will:
- Find all coaching centers with soft-deleted media (documents, images, videos) for 6+ months
- Delete media files from S3
- Remove media entries from the database
- Log all operations

### Test All Jobs

```bash
npm run test:jobs -- --job=all
```

This will run both jobs sequentially.

## What Happens During Testing

1. **Database Connection**: The script connects to MongoDB
2. **Job Execution**: The selected job(s) run with the same logic as scheduled execution
3. **Logging**: All operations are logged to the console and log files
4. **Database Disconnection**: The script disconnects from MongoDB and exits

## Important Notes

⚠️ **WARNING**: These test commands perform **REAL DELETIONS**:
- Files are permanently deleted from S3
- Records are permanently removed from the database
- These operations **CANNOT BE UNDONE**

### Before Testing

1. **Backup your database** if you're testing in production
2. **Verify S3 credentials** are correct
3. **Check the date filters** - ensure you're only deleting records that should be deleted
4. **Review the logs** carefully to see what will be deleted

### Testing in Development

For safe testing in development:
1. Create test records with `deletedAt` dates that match the criteria
2. Verify the records are found by the job
3. Check that media files are deleted from S3
4. Confirm records are removed from the database

## Example Output

```
=== Starting Permanent Delete Job Test ===
Starting permanent deletion job - deleting records soft deleted for 1+ year
Found highlights to permanently delete { count: 2 }
Found reels to permanently delete { count: 1 }
Found coaching centers to permanently delete { count: 0 }
Permanently deleted highlight { highlightId: 'abc123', mediaFilesDeleted: 15 }
Permanently deleted reel { reelId: 'def456', mediaFilesDeleted: 12 }
Permanent deletion job completed {
  highlightsDeleted: 2,
  reelsDeleted: 1,
  coachingCentersDeleted: 0,
  totalMediaFilesDeleted: 27,
  totalErrors: 0
}
=== Permanent Delete Job Test Completed ===
```

## Troubleshooting

### Job doesn't find any records

- Check that records have `deletedAt` set
- Verify the date filter (1 year ago for permanent delete, 6 months ago for media cleanup)
- Ensure records match the query criteria

### S3 deletion fails

- Verify AWS credentials are configured
- Check S3 bucket permissions
- Ensure file URLs are valid S3 URLs

### Database connection fails

- Verify MongoDB connection string in environment variables
- Check that MongoDB is running
- Ensure network connectivity

## Scheduled Execution

The jobs run automatically on schedule:
- **Permanent Delete Job**: Monthly on the 1st at 3 AM
- **Media Cleanup Job**: Daily at 2 AM

These schedules are defined in:
- `src/jobs/permanentDelete.job.ts`
- `src/jobs/mediaCleanup.job.ts`

