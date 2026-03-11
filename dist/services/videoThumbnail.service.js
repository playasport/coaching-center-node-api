"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideoThumbnail = exports.generateThumbnailFromBuffer = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
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
 * Check if FFmpeg is available
 */
const checkFFmpegAvailability = async () => {
    return new Promise((resolve) => {
        fluent_ffmpeg_1.default.getAvailableFormats((err) => {
            if (err) {
                logger_1.logger.error('FFmpeg not available', { error: err.message });
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
};
/**
 * Extract S3 key from URL
 * Handles different S3 URL formats:
 * - https://bucket.s3.region.amazonaws.com/key
 * - https://bucket.s3-region.amazonaws.com/key
 * - https://s3.region.amazonaws.com/bucket/key
 * - URLs with query parameters
 */
const extractS3Key = (fileUrl) => {
    try {
        // Remove query parameters and fragments
        const urlWithoutQuery = fileUrl.split('?')[0].split('#')[0];
        // Try standard format: https://bucket.s3.region.amazonaws.com/key
        if (urlWithoutQuery.includes('.amazonaws.com/')) {
            const urlParts = urlWithoutQuery.split('.amazonaws.com/');
            if (urlParts.length === 2) {
                let key = urlParts[1];
                // Decode URL encoding
                try {
                    key = decodeURIComponent(key);
                }
                catch (e) {
                    // If decoding fails, use original key
                    logger_1.logger.warn('Failed to decode S3 key', { key });
                }
                // Remove bucket name if it's in the path (for path-style URLs)
                const bucketMatch = urlWithoutQuery.match(/https?:\/\/([^.]+)\.s3[.-]/);
                if (bucketMatch && key.startsWith(bucketMatch[1] + '/')) {
                    key = key.substring(bucketMatch[1].length + 1);
                }
                return key;
            }
        }
        // Try alternative format: https://s3.region.amazonaws.com/bucket/key
        if (urlWithoutQuery.includes('s3') && urlWithoutQuery.includes('.amazonaws.com/')) {
            const match = urlWithoutQuery.match(/s3[.-][^/]+\.amazonaws\.com\/([^/]+\/)?(.+)$/);
            if (match && match[2]) {
                let key = match[2];
                // Decode URL encoding
                try {
                    key = decodeURIComponent(key);
                }
                catch (e) {
                    logger_1.logger.warn('Failed to decode S3 key', { key });
                }
                // If bucket is in the path, remove it
                if (match[1]) {
                    const bucketName = match[1].replace('/', '');
                    if (key.startsWith(bucketName + '/')) {
                        key = key.substring(bucketName.length + 1);
                    }
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
 * Generate thumbnail from video file buffer (for direct uploads)
 * This is the main method used during video upload
 */
const generateThumbnailFromBuffer = async (videoBuffer, videoFileName) => {
    try {
        logger_1.logger.info('Generating thumbnail from video buffer', { fileName: videoFileName, bufferSize: videoBuffer.length });
        // Check if FFmpeg is available
        const ffmpegAvailable = await checkFFmpegAvailability();
        if (!ffmpegAvailable) {
            throw new ApiError_1.ApiError(500, 'FFmpeg is not available. Please install FFmpeg to generate video thumbnails.');
        }
        // Create temporary files with unique names
        const tempDir = os.tmpdir();
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const tempVideoPath = path.join(tempDir, `video_${uniqueId}.mp4`);
        const tempThumbnailPath = path.join(tempDir, `thumb_${uniqueId}.jpg`);
        try {
            // Write video buffer to temp file
            logger_1.logger.debug('Writing video buffer to temp file', { tempVideoPath });
            fs.writeFileSync(tempVideoPath, videoBuffer);
            // Verify file was written
            if (!fs.existsSync(tempVideoPath)) {
                throw new ApiError_1.ApiError(500, 'Failed to write video file to temporary location');
            }
            const videoStats = fs.statSync(tempVideoPath);
            logger_1.logger.debug('Video file written', { size: videoStats.size, path: tempVideoPath });
            // Generate thumbnail using ffmpeg
            await new Promise((resolve, reject) => {
                logger_1.logger.debug('Starting FFmpeg thumbnail generation');
                (0, fluent_ffmpeg_1.default)(tempVideoPath)
                    .screenshots({
                    timestamps: ['00:00:01'], // Extract frame at 1 second
                    filename: path.basename(tempThumbnailPath),
                    folder: tempDir,
                    size: '640x360', // 16:9 aspect ratio
                })
                    .on('start', (commandLine) => {
                    logger_1.logger.debug('FFmpeg command started', { commandLine });
                })
                    .on('end', () => {
                    logger_1.logger.debug('FFmpeg thumbnail generation completed');
                    resolve();
                })
                    .on('error', (err) => {
                    logger_1.logger.error('FFmpeg thumbnail generation error', {
                        error: err.message,
                        stack: err.stack,
                        videoPath: tempVideoPath
                    });
                    reject(err);
                })
                    .on('stderr', (stderrLine) => {
                    // Log FFmpeg stderr for debugging
                    if (stderrLine.includes('error') || stderrLine.includes('Error')) {
                        logger_1.logger.warn('FFmpeg stderr', { line: stderrLine });
                    }
                });
            });
            // Verify thumbnail was created
            if (!fs.existsSync(tempThumbnailPath)) {
                throw new ApiError_1.ApiError(500, 'Thumbnail file was not created by FFmpeg');
            }
            // Read thumbnail file
            const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
            const thumbnailStats = fs.statSync(tempThumbnailPath);
            if (thumbnailBuffer.length === 0) {
                throw new ApiError_1.ApiError(500, 'Generated thumbnail file is empty');
            }
            logger_1.logger.info('Thumbnail generated from buffer', {
                size: thumbnailBuffer.length,
                thumbnailSize: thumbnailStats.size,
                fileName: videoFileName
            });
            return thumbnailBuffer;
        }
        finally {
            // Clean up temp files
            try {
                if (fs.existsSync(tempVideoPath)) {
                    fs.unlinkSync(tempVideoPath);
                    logger_1.logger.debug('Temp video file cleaned up', { tempVideoPath });
                }
                if (fs.existsSync(tempThumbnailPath)) {
                    fs.unlinkSync(tempThumbnailPath);
                    logger_1.logger.debug('Temp thumbnail file cleaned up', { tempThumbnailPath });
                }
            }
            catch (cleanupError) {
                logger_1.logger.warn('Failed to cleanup temp files', {
                    error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
                    tempVideoPath,
                    tempThumbnailPath
                });
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to generate thumbnail from buffer', {
            fileName: videoFileName,
            bufferSize: videoBuffer?.length || 0,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.generateThumbnailFromBuffer = generateThumbnailFromBuffer;
/**
 * Generate thumbnail from video URL (S3)
 * Downloads video from S3, generates thumbnail, uploads thumbnail to S3
 */
const generateVideoThumbnail = async (videoUrl) => {
    try {
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        logger_1.logger.info('Starting video thumbnail generation', { videoUrl });
        const client = getS3Client();
        const videoKey = extractS3Key(videoUrl);
        logger_1.logger.debug('Extracted S3 key from URL', { videoUrl, videoKey });
        // Download video from S3
        const getObjectCommand = new client_s3_1.GetObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: videoKey,
        });
        logger_1.logger.debug('Downloading video from S3', { bucket: env_1.config.aws.s3Bucket, key: videoKey });
        const videoObject = await client.send(getObjectCommand);
        if (!videoObject.Body) {
            throw new ApiError_1.ApiError(500, 'Failed to download video from S3: Response body is empty');
        }
        // Convert stream to buffer
        logger_1.logger.debug('Converting video stream to buffer');
        const chunks = [];
        const videoStream = videoObject.Body;
        for await (const chunk of videoStream) {
            chunks.push(chunk);
        }
        const videoBuffer = Buffer.concat(chunks);
        if (videoBuffer.length === 0) {
            throw new ApiError_1.ApiError(500, 'Downloaded video buffer is empty');
        }
        logger_1.logger.info('Video downloaded from S3', { videoKey, size: videoBuffer.length });
        // Generate thumbnail from buffer
        const thumbnailBuffer = await (0, exports.generateThumbnailFromBuffer)(videoBuffer, videoKey);
        // Generate thumbnail key: /images/coachingCentres/{uniqueId}.jpg
        const uniqueId = (0, uuid_1.v4)();
        const thumbnailKey = `images/coachingCentres/${uniqueId}.jpg`;
        logger_1.logger.debug('Uploading thumbnail to S3', { bucket: env_1.config.aws.s3Bucket, key: thumbnailKey });
        // Upload thumbnail to S3
        const putObjectCommand = new client_s3_1.PutObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg',
        });
        await client.send(putObjectCommand);
        // Construct thumbnail URL (handle different S3 URL formats)
        const thumbnailUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${thumbnailKey}`;
        logger_1.logger.info('Thumbnail uploaded to S3 successfully', { thumbnailKey, thumbnailUrl, thumbnailSize: thumbnailBuffer.length });
        return thumbnailUrl;
    }
    catch (error) {
        logger_1.logger.error('Failed to generate video thumbnail', {
            videoUrl,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('NoSuchKey') || error.message.includes('NoSuchBucket')) {
                throw new ApiError_1.ApiError(404, `Video not found in S3: ${error.message}`);
            }
            if (error.message.includes('AccessDenied') || error.message.includes('Access Denied')) {
                throw new ApiError_1.ApiError(403, `Access denied to S3: ${error.message}`);
            }
            if (error.message.includes('FFmpeg')) {
                throw new ApiError_1.ApiError(500, `FFmpeg error: ${error.message}`);
            }
        }
        throw new ApiError_1.ApiError(500, `Failed to generate video thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.generateVideoThumbnail = generateVideoThumbnail;
//# sourceMappingURL=videoThumbnail.service.js.map