# Media Upload Limits - Environment Variables

All media upload limits can be configured via environment variables. If not set, default values will be used.

## Environment Variables

### File Size Limits (in MB)

```env
# Image file size limit (default: 5MB)
MAX_IMAGE_SIZE_MB=5

# Video file size limit (default: 100MB)
MAX_VIDEO_SIZE_MB=100

# Document file size limit (default: 10MB)
MAX_DOCUMENT_SIZE_MB=10

# Profile image file size limit (default: 5MB)
MAX_PROFILE_IMAGE_SIZE_MB=5
```

### File Count Limits

```env
# Maximum number of images allowed per upload (default: 10)
MAX_IMAGES_COUNT=10

# Maximum number of videos allowed per upload (default: 10)
MAX_VIDEOS_COUNT=10

# Maximum number of documents allowed per upload (default: 10)
MAX_DOCUMENTS_COUNT=10

# Maximum total files allowed in a single request (default: 30)
# This includes: 1 logo + images + videos + documents
MAX_TOTAL_FILES_COUNT=30
```

### Image Compression Settings

```env
# Maximum width for compressed images in pixels (default: 1500)
IMAGE_MAX_WIDTH=1500

# Maximum file size for compressed images in KB (default: 500)
IMAGE_MAX_SIZE_KB=500
```

## Default Values

If environment variables are not set, the following defaults are used:

| Setting | Default Value |
|---------|--------------|
| Max Image Size | 5 MB |
| Max Video Size | 100 MB |
| Max Document Size | 10 MB |
| Max Profile Image Size | 5 MB |
| Max Images Count | 10 |
| Max Videos Count | 10 |
| Max Documents Count | 10 |
| Max Total Files Count | 30 |
| Image Max Width | 1500 px |
| Image Max Size (compressed) | 500 KB |

## Example .env Configuration

```env
# Media Upload Limits
MAX_IMAGE_SIZE_MB=5
MAX_VIDEO_SIZE_MB=100
MAX_DOCUMENT_SIZE_MB=10
MAX_PROFILE_IMAGE_SIZE_MB=5

MAX_IMAGES_COUNT=10
MAX_VIDEOS_COUNT=10
MAX_DOCUMENTS_COUNT=10
MAX_TOTAL_FILES_COUNT=30

# Image Compression
IMAGE_MAX_WIDTH=1500
IMAGE_MAX_SIZE_KB=500
```

## Notes

- File size limits are specified in **MB** (megabytes) in environment variables
- Image compression max size is specified in **KB** (kilobytes)
- All limits are validated at the middleware level before files are processed
- If a file exceeds the limit, a 400 error is returned with a descriptive message
- Image compression is applied automatically to logo and image files

