import { deleteFileFromS3 } from './s3.service';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config/env';
import { compressImage, isImage } from '../../utils/imageCompression';

export type MediaType = 'logo' | 'image' | 'video' | 'document';

interface UploadMediaOptions {
  file: Express.Multer.File;
  mediaType: MediaType;
}

// Get or create S3 client
let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.region) {
    throw new ApiError(500, 'S3 client not configured. Please check AWS credentials.');
  }

  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  return s3Client;
};

/**
 * Generate S3 file path for temporary storage (all uploads go to temp first)
 * Files will be moved to permanent locations on final submission
 */
const getTempFilePath = (mediaType: MediaType, fileName: string): string => {
  const fileExtension = fileName.split('.').pop() || 'jpg';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;

  switch (mediaType) {
    case 'logo':
      return `temp/coaching/photo/${uniqueFileName}`;
    case 'image':
      return `temp/images/coachingCentres/${uniqueFileName}`;
    case 'video':
      return `temp/videos/coachingCentres/${uniqueFileName}`;
    case 'document':
      return `temp/documents/coachingCentres/${uniqueFileName}`;
  }
};

/**
 * Get permanent file path from temporary path
 */
const getPermanentPath = (tempPath: string): string => {
  // Remove 'temp/' prefix and return permanent path
  if (tempPath.startsWith('temp/')) {
    return tempPath.replace('temp/', '');
  }
  return tempPath;
};

/**
 * Upload media file to S3 (always saved in temp folder)
 * Files will be moved to permanent locations on final submission
 * Images are automatically compressed (max width 1500px, max size 500KB)
 */
export const uploadMediaFile = async ({
  file,
  mediaType,
}: UploadMediaOptions): Promise<string> => {
  try {
    if (!file || !file.buffer) {
      throw new ApiError(400, 'File buffer is missing');
    }

    if (!config.aws.s3Bucket) {
      throw new ApiError(500, 'S3 bucket name not configured');
    }

    // Compress images (logo and images)
    let fileBuffer = file.buffer;
    let contentType = file.mimetype || 'application/octet-stream';

    if ((mediaType === 'logo' || mediaType === 'image') && isImage(contentType)) {
      try {
        fileBuffer = await compressImage(file.buffer, contentType);
        logger.info('Image compressed before upload', {
          mediaType,
          originalSize: `${(file.buffer.length / 1024).toFixed(2)} KB`,
          compressedSize: `${(fileBuffer.length / 1024).toFixed(2)} KB`,
        });
      } catch (error) {
        logger.warn('Image compression failed, using original', { mediaType, error });
        // Continue with original buffer if compression fails
      }
    }

    // Always save to temp folder
    const filePath = getTempFilePath(mediaType, file.originalname);
    const client = getS3Client();

    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: filePath,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    const fileUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${filePath}`;
    
    logger.info('Media file uploaded to S3 (temp)', {
      mediaType,
      filePath,
      size: `${(fileBuffer.length / 1024).toFixed(2)} KB`,
    });

    return fileUrl;
  } catch (error) {
    logger.error('Failed to upload media file', { mediaType, error });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to upload media file');
  }
};

/**
 * Upload multiple media files (all saved in temp folder)
 */
export const uploadMultipleMediaFiles = async (
  files: Express.Multer.File[],
  mediaType: MediaType
): Promise<string[]> => {
  const uploadPromises = files.map((file) =>
    uploadMediaFile({ file, mediaType })
  );
  return Promise.all(uploadPromises);
};

/**
 * Delete media file from S3
 */
export const deleteMediaFile = async (fileUrl: string): Promise<void> => {
  try {
    await deleteFileFromS3(fileUrl);
    logger.info('Media file deleted from S3', { fileUrl });
  } catch (error) {
    logger.error('Failed to delete media file', { fileUrl, error });
    throw new ApiError(500, 'Failed to delete media file');
  }
};

/**
 * Extract S3 key from URL
 * Handles different S3 URL formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://bucket.s3-region.amazonaws.com/key
 * - https://s3.region.amazonaws.com/bucket/key
 */
const extractS3Key = (fileUrl: string): string => {
  try {
    // Try standard format: https://bucket.s3.region.amazonaws.com/key
    if (fileUrl.includes('.amazonaws.com/')) {
      const urlParts = fileUrl.split('.amazonaws.com/');
      if (urlParts.length === 2) {
        return urlParts[1];
      }
    }
    
    // Try alternative format: https://s3.region.amazonaws.com/bucket/key
    if (fileUrl.includes('s3.') && fileUrl.includes('.amazonaws.com/')) {
      const match = fileUrl.match(/s3[.-][^/]+\.amazonaws\.com\/([^/]+\/)?(.+)$/);
      if (match && match[2]) {
        // If bucket is in the path, remove it
        const key = match[2];
        const bucketMatch = fileUrl.match(/https?:\/\/([^.]+)\.s3/);
        if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
          return key.substring(bucketMatch[1].length + 1);
        }
        return key;
      }
    }
    
    throw new ApiError(400, `Invalid S3 file URL format: ${fileUrl}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to extract S3 key from URL', { fileUrl, error });
    throw new ApiError(400, `Invalid S3 file URL: ${fileUrl}`);
  }
};

/**
 * Move file from temp folder to permanent location
 */
export const moveFileToPermanent = async (tempFileUrl: string): Promise<string> => {
  try {
    // Skip blob URLs and non-S3 URLs (return as-is)
    if (!tempFileUrl || tempFileUrl.startsWith('blob:') || !tempFileUrl.includes('.amazonaws.com')) {
      logger.info('Skipping non-S3 URL (blob URL or invalid format)', { tempFileUrl });
      return tempFileUrl;
    }

    if (!config.aws.s3Bucket) {
      throw new ApiError(500, 'S3 bucket name not configured');
    }

    logger.info('Attempting to move file to permanent location', { tempFileUrl });

    const client = getS3Client();
    let tempKey: string;
    
    try {
      tempKey = extractS3Key(tempFileUrl);
      logger.info('Extracted S3 key', { tempFileUrl, tempKey });
    } catch (error) {
      // If we can't extract S3 key, it's not a valid S3 URL, return as-is
      logger.warn('Could not extract S3 key from URL, returning as-is', { tempFileUrl, error });
      return tempFileUrl;
    }
    
    // Check if file is in temp folder
    if (!tempKey.startsWith('temp/')) {
      // Already in permanent location, return as is
      logger.info('File already in permanent location', { tempFileUrl, tempKey });
      return tempFileUrl;
    }

    const permanentKey = getPermanentPath(tempKey);
    
    logger.info('Preparing to move file', {
      tempKey,
      permanentKey,
      bucket: config.aws.s3Bucket,
    });

    // Copy file to permanent location
    const copyCommand = new CopyObjectCommand({
      Bucket: config.aws.s3Bucket,
      CopySource: `${config.aws.s3Bucket}/${tempKey}`,
      Key: permanentKey,
    });

    await client.send(copyCommand);
    logger.info('File copied to permanent location', { tempKey, permanentKey });

    // Delete temp file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: tempKey,
    });

    await client.send(deleteCommand);
    logger.info('Temp file deleted', { tempKey });

    const permanentUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${permanentKey}`;
    
    logger.info('File successfully moved from temp to permanent location', {
      tempKey,
      permanentKey,
      tempUrl: tempFileUrl,
      permanentUrl,
    });

    return permanentUrl;
  } catch (error) {
    logger.error('Failed to move file to permanent location', {
      tempFileUrl,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return original URL if move fails (don't throw to allow other files to be processed)
    logger.warn('Returning original URL due to error', { tempFileUrl });
    return tempFileUrl;
  }
};

/**
 * Move multiple files from temp to permanent locations
 * Uses Promise.allSettled to handle individual failures gracefully
 */
export const moveFilesToPermanent = async (tempFileUrls: string[]): Promise<string[]> => {
  const movePromises = tempFileUrls.map((url) => moveFileToPermanent(url));
  const results = await Promise.allSettled(movePromises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error('Failed to move file to permanent location', {
        url: tempFileUrls[index],
        error: result.reason,
      });
      // Return original URL if move fails
      return tempFileUrls[index];
    }
  });
};


