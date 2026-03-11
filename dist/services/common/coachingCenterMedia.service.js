"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveFilesToPermanent = exports.moveFileToPermanent = exports.deleteMediaFile = exports.uploadMultipleMediaFiles = exports.uploadMediaFile = void 0;
const s3_service_1 = require("./s3.service");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const uuid_1 = require("uuid");
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../../config/env");
const imageCompression_1 = require("../../utils/imageCompression");
// Get or create S3 client
let s3Client = null;
const getS3Client = () => {
    if (s3Client) {
        return s3Client;
    }
    if (!env_1.config.aws.accessKeyId || !env_1.config.aws.secretAccessKey || !env_1.config.aws.region) {
        throw new ApiError_1.ApiError(500, 'S3 client not configured. Please check AWS credentials.');
    }
    s3Client = new client_s3_1.S3Client({
        region: env_1.config.aws.region,
        credentials: {
            accessKeyId: env_1.config.aws.accessKeyId,
            secretAccessKey: env_1.config.aws.secretAccessKey,
        },
    });
    return s3Client;
};
/**
 * Generate S3 file path for temporary storage (all uploads go to temp first)
 * Files will be moved to permanent locations on final submission
 */
const getTempFilePath = (mediaType, fileName) => {
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `playasport-${(0, uuid_1.v4)()}.${fileExtension}`;
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
const getPermanentPath = (tempPath) => {
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
const uploadMediaFile = async ({ file, mediaType, }) => {
    try {
        if (!file || !file.buffer) {
            throw new ApiError_1.ApiError(400, 'File buffer is missing');
        }
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        // Compress images (logo and images)
        let fileBuffer = file.buffer;
        let contentType = file.mimetype || 'application/octet-stream';
        if ((mediaType === 'logo' || mediaType === 'image') && (0, imageCompression_1.isImage)(contentType)) {
            try {
                fileBuffer = await (0, imageCompression_1.compressImage)(file.buffer, contentType);
                logger_1.logger.info('Image compressed before upload', {
                    mediaType,
                    originalSize: `${(file.buffer.length / 1024).toFixed(2)} KB`,
                    compressedSize: `${(fileBuffer.length / 1024).toFixed(2)} KB`,
                });
            }
            catch (error) {
                logger_1.logger.warn('Image compression failed, using original', { mediaType, error });
                // Continue with original buffer if compression fails
            }
        }
        // Always save to temp folder
        const filePath = getTempFilePath(mediaType, file.originalname);
        const client = getS3Client();
        const command = new client_s3_1.PutObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: filePath,
            Body: fileBuffer,
            ContentType: contentType,
        });
        await client.send(command);
        const fileUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${filePath}`;
        logger_1.logger.info('Media file uploaded to S3 (temp)', {
            mediaType,
            filePath,
            size: `${(fileBuffer.length / 1024).toFixed(2)} KB`,
        });
        return fileUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to upload media file', { mediaType, error });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, 'Failed to upload media file');
    }
};
exports.uploadMediaFile = uploadMediaFile;
/**
 * Upload multiple media files (all saved in temp folder)
 */
const uploadMultipleMediaFiles = async (files, mediaType) => {
    const uploadPromises = files.map((file) => (0, exports.uploadMediaFile)({ file, mediaType }));
    return Promise.all(uploadPromises);
};
exports.uploadMultipleMediaFiles = uploadMultipleMediaFiles;
/**
 * Delete media file from S3
 */
const deleteMediaFile = async (fileUrl) => {
    try {
        await (0, s3_service_1.deleteFileFromS3)(fileUrl);
        logger_1.logger.info('Media file deleted from S3', { fileUrl });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete media file', { fileUrl, error });
        throw new ApiError_1.ApiError(500, 'Failed to delete media file');
    }
};
exports.deleteMediaFile = deleteMediaFile;
/**
 * Extract S3 key from URL
 * Handles different S3 URL formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://bucket.s3-region.amazonaws.com/key
 * - https://s3.region.amazonaws.com/bucket/key
 */
const extractS3Key = (fileUrl) => {
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
        throw new ApiError_1.ApiError(400, `Invalid S3 file URL format: ${fileUrl}`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to extract S3 key from URL', { fileUrl, error });
        throw new ApiError_1.ApiError(400, `Invalid S3 file URL: ${fileUrl}`);
    }
};
/**
 * Move file from temp folder to permanent location
 */
const moveFileToPermanent = async (tempFileUrl) => {
    try {
        // Skip blob URLs and non-S3 URLs (return as-is)
        if (!tempFileUrl || tempFileUrl.startsWith('blob:') || !tempFileUrl.includes('.amazonaws.com')) {
            logger_1.logger.info('Skipping non-S3 URL (blob URL or invalid format)', { tempFileUrl });
            return tempFileUrl;
        }
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        logger_1.logger.info('Attempting to move file to permanent location', { tempFileUrl });
        const client = getS3Client();
        let tempKey;
        try {
            tempKey = extractS3Key(tempFileUrl);
            logger_1.logger.info('Extracted S3 key', { tempFileUrl, tempKey });
        }
        catch (error) {
            // If we can't extract S3 key, it's not a valid S3 URL, return as-is
            logger_1.logger.warn('Could not extract S3 key from URL, returning as-is', { tempFileUrl, error });
            return tempFileUrl;
        }
        // Check if file is in temp folder
        if (!tempKey.startsWith('temp/')) {
            // Already in permanent location, return as is
            logger_1.logger.info('File already in permanent location', { tempFileUrl, tempKey });
            return tempFileUrl;
        }
        const permanentKey = getPermanentPath(tempKey);
        logger_1.logger.info('Preparing to move file', {
            tempKey,
            permanentKey,
            bucket: env_1.config.aws.s3Bucket,
        });
        // Copy file to permanent location
        const copyCommand = new client_s3_1.CopyObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            CopySource: `${env_1.config.aws.s3Bucket}/${tempKey}`,
            Key: permanentKey,
        });
        await client.send(copyCommand);
        logger_1.logger.info('File copied to permanent location', { tempKey, permanentKey });
        // Delete temp file
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: tempKey,
        });
        await client.send(deleteCommand);
        logger_1.logger.info('Temp file deleted', { tempKey });
        const permanentUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${permanentKey}`;
        logger_1.logger.info('File successfully moved from temp to permanent location', {
            tempKey,
            permanentKey,
            tempUrl: tempFileUrl,
            permanentUrl,
        });
        return permanentUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to move file to permanent location', {
            tempFileUrl,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Return original URL if move fails (don't throw to allow other files to be processed)
        logger_1.logger.warn('Returning original URL due to error', { tempFileUrl });
        return tempFileUrl;
    }
};
exports.moveFileToPermanent = moveFileToPermanent;
/**
 * Move multiple files from temp to permanent locations
 * Uses Promise.allSettled to handle individual failures gracefully
 */
const moveFilesToPermanent = async (tempFileUrls) => {
    const movePromises = tempFileUrls.map((url) => (0, exports.moveFileToPermanent)(url));
    const results = await Promise.allSettled(movePromises);
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        else {
            logger_1.logger.error('Failed to move file to permanent location', {
                url: tempFileUrls[index],
                error: result.reason,
            });
            // Return original URL if move fails
            return tempFileUrls[index];
        }
    });
};
exports.moveFilesToPermanent = moveFilesToPermanent;
//# sourceMappingURL=coachingCenterMedia.service.js.map