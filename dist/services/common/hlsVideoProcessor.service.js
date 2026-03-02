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
exports.createVideoPreviewFromS3 = createVideoPreviewFromS3;
exports.processVideoToHLS = processVideoToHLS;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const tmp_1 = __importDefault(require("tmp"));
const axios_1 = __importDefault(require("axios"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const logger_1 = require("../../utils/logger");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_service_1 = require("./s3.service");
const client_s3_1 = require("@aws-sdk/client-s3");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Set FFmpeg path
if (ffmpeg_static_1.default) {
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
}
// Video quality configurations
const QUALITY_CONFIGS = [
    { name: '240p', maxHeight: 240, videoBitrate: '400k', audioBitrate: '64k' },
    { name: '360p', maxHeight: 360, videoBitrate: '800k', audioBitrate: '96k' },
    { name: '480p', maxHeight: 480, videoBitrate: '1200k', audioBitrate: '96k' },
    { name: '720p', maxHeight: 720, videoBitrate: '2500k', audioBitrate: '128k' },
    { name: '1080p', maxHeight: 1080, videoBitrate: '4500k', audioBitrate: '192k' },
];
// Add axios retry configuration
const axiosInstance = axios_1.default.create({
    timeout: 30000, // 30 seconds timeout
    maxContentLength: 50 * 1024 * 1024, // 50MB max content length
    maxBodyLength: 50 * 1024 * 1024, // 50MB max body length
    validateStatus: function (status) {
        return status >= 200 && status < 300; // Only accept 2xx status codes
    },
});
// Add retry interceptor
axiosInstance.interceptors.response.use(null, async (error) => {
    const config = error.config;
    // If no config or no retry count, initialize retry count
    if (!config || !config.retryCount) {
        config.retryCount = 0;
    }
    // Maximum number of retries
    const maxRetries = 3;
    if (config.retryCount < maxRetries) {
        config.retryCount += 1;
        // Exponential backoff delay
        const delay = Math.pow(2, config.retryCount) * 1000;
        // Log retry attempt
        logger_1.logger.info(`Retrying request (${config.retryCount}/${maxRetries}) after ${delay}ms delay`);
        // Wait for the delay
        await new Promise((resolve) => setTimeout(resolve, delay));
        // Retry the request
        return axiosInstance(config);
    }
    return Promise.reject(error);
});
async function processVideoPreview(inputVideoPath, outputDir, savePath, bucket) {
    try {
        logger_1.logger.info('Starting video preview generation...');
        const previewPath = path_1.default.join(outputDir, 'preview.mp4');
        // Get video info to calculate optimal settings
        const videoInfo = await getVideoInfo(inputVideoPath);
        logger_1.logger.info('Video info for preview', { videoInfo });
        // Calculate preview duration (max 3 seconds or video duration, whichever is shorter)
        const previewDuration = Math.min(3, videoInfo.duration || 3);
        // Preserve original aspect ratio - scale down proportionally
        const originalWidth = videoInfo.width;
        const originalHeight = videoInfo.height;
        const aspectRatio = originalWidth / originalHeight;
        // Scale down to a maximum dimension while maintaining exact aspect ratio
        const maxDimension = 720; // Max width or height (whichever is larger)
        let targetWidth, targetHeight;
        // Determine if video is landscape or portrait
        if (originalWidth >= originalHeight) {
            // Landscape or square: use max width
            targetWidth = Math.min(maxDimension, originalWidth);
            targetHeight = Math.round(targetWidth / aspectRatio);
        }
        else {
            // Portrait: use max height
            targetHeight = Math.min(maxDimension, originalHeight);
            targetWidth = Math.round(targetHeight * aspectRatio);
        }
        // Ensure dimensions are even (required by codecs)
        if (targetWidth % 2 !== 0)
            targetWidth += 1;
        if (targetHeight % 2 !== 0)
            targetHeight += 1;
        logger_1.logger.info('Preview dimensions', {
            original: `${originalWidth}x${originalHeight}`,
            aspectRatio: aspectRatio.toFixed(2),
            target: `${targetWidth}x${targetHeight}`,
            duration: `${previewDuration}s`,
        });
        // Create preview with improved quality
        const targetBitrate = '400k';
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputVideoPath)
                .duration(previewDuration)
                .videoCodec('libx264')
                .size(`${targetWidth}x${targetHeight}`)
                .videoBitrate(targetBitrate)
                .outputOptions([
                '-preset fast',
                '-crf 28',
                '-movflags +faststart',
                '-an', // Remove audio (mute)
                '-r 24',
                '-g 24',
                '-pix_fmt yuv420p',
            ])
                .on('error', (err) => {
                logger_1.logger.error('FFmpeg error creating preview', { error: err });
                reject(err);
            })
                .on('end', async () => {
                try {
                    // Check file size and adjust if needed
                    const stats = await fs_extra_1.default.stat(previewPath);
                    const fileSizeKB = stats.size / 1024;
                    logger_1.logger.info(`Preview created: ${fileSizeKB.toFixed(2)} KB`);
                    // If file is too large, reduce quality further
                    if (fileSizeKB > 400) {
                        logger_1.logger.warn(`Preview is ${fileSizeKB.toFixed(2)} KB, reducing quality...`);
                        await createSmallerPreview(inputVideoPath, previewPath, targetWidth, targetHeight, previewDuration);
                    }
                    resolve();
                }
                catch (error) {
                    logger_1.logger.error('Error in preview end callback', { error });
                    reject(error);
                }
            })
                .save(previewPath);
        });
        // Verify final file size
        const finalStats = await fs_extra_1.default.stat(previewPath);
        const finalSizeKB = finalStats.size / 1024;
        logger_1.logger.info(`Final preview size: ${finalSizeKB.toFixed(2)} KB`);
        if (finalSizeKB > 400) {
            logger_1.logger.warn(`Warning: Preview size (${finalSizeKB.toFixed(2)} KB) exceeds 400 KB target`);
        }
        // Use posix path for S3 URLs to ensure forward slashes
        const normalizeS3Path = (p) => p.replace(/\\/g, '/');
        const previewUrl = `https://${bucket}.s3.amazonaws.com/${normalizeS3Path(path_1.default.join(savePath, 'preview.mp4'))}`;
        logger_1.logger.info('Video preview generated successfully');
        return {
            previewPath,
            previewUrl,
            sizeKB: finalSizeKB,
        };
    }
    catch (error) {
        logger_1.logger.error('Error creating video preview', { error });
        throw error;
    }
}
// Helper function to create even smaller preview if needed
async function createSmallerPreview(inputPath, outputPath, width, height, duration) {
    logger_1.logger.info('Creating smaller preview while preserving aspect ratio...');
    // Calculate aspect ratio from current dimensions
    const aspectRatio = width / height;
    // Further reduce dimensions proportionally
    const scaleFactor = 0.75;
    let smallerWidth = Math.max(480, Math.round(width * scaleFactor));
    let smallerHeight = Math.round(smallerWidth / aspectRatio);
    // Ensure we don't go below minimum while maintaining ratio
    if (smallerHeight < 480) {
        smallerHeight = 480;
        smallerWidth = Math.round(smallerHeight * aspectRatio);
    }
    // Ensure even dimensions (required by codecs)
    const finalWidth = smallerWidth % 2 === 0 ? smallerWidth : smallerWidth + 1;
    const finalHeight = smallerHeight % 2 === 0 ? smallerHeight : smallerHeight + 1;
    logger_1.logger.info(`Reduced from ${width}x${height} to ${finalWidth}x${finalHeight}`);
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .duration(duration)
            .videoCodec('libx264')
            .size(`${finalWidth}x${finalHeight}`)
            .videoBitrate('300k')
            .outputOptions([
            '-preset fast',
            '-crf 32',
            '-movflags +faststart',
            '-an', // No audio
            '-r 20',
            '-g 20',
            '-pix_fmt yuv420p',
        ])
            .on('error', reject)
            .on('end', () => resolve())
            .save(outputPath);
    });
    logger_1.logger.info(`Smaller preview created with dimensions: ${finalWidth}x${finalHeight}`);
}
// Standalone function to create video preview from S3 URL
async function createVideoPreviewFromS3(s3Url, savePath) {
    const url = new URL(s3Url);
    const bucket = url.hostname.split('.')[0];
    const key = decodeURIComponent(url.pathname.slice(1));
    logger_1.logger.info(`Starting video preview creation for: ${s3Url}`);
    // Create temporary directory for processing
    const tmpDir = tmp_1.default.dirSync({ unsafeCleanup: true });
    const inputTmp = path_1.default.join(tmpDir.name, 'input' + path_1.default.extname(key));
    const outputDir = path_1.default.join(tmpDir.name, 'output');
    try {
        // Create output directory
        await fs_extra_1.default.ensureDir(outputDir);
        // Download video from S3
        logger_1.logger.info('Downloading video from S3...');
        try {
            const response = await axiosInstance({
                method: 'get',
                url: s3Url,
                responseType: 'stream',
                timeout: 60000,
                retryCount: 0,
            });
            const writer = fs_extra_1.default.createWriteStream(inputTmp);
            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            logger_1.logger.info('Video downloaded successfully');
        }
        catch (downloadError) {
            logger_1.logger.error('Failed to download video', { error: downloadError });
            throw new Error(`Video download failed: ${downloadError.message}`);
        }
        // Generate preview
        const previewResult = await processVideoPreview(inputTmp, outputDir, savePath, bucket);
        // Upload preview to S3
        logger_1.logger.info('Uploading preview to S3...');
        await uploadToS3(outputDir, bucket, savePath);
        logger_1.logger.info('Video preview created and uploaded successfully');
        return {
            previewUrl: previewResult.previewUrl,
            sizeKB: previewResult.sizeKB,
            previewPath: previewResult.previewPath,
        };
    }
    catch (error) {
        logger_1.logger.error('Error creating video preview', { error });
        throw error;
    }
    finally {
        // Cleanup
        try {
            if (fs_extra_1.default.existsSync(inputTmp))
                await fs_extra_1.default.unlink(inputTmp);
            if (fs_extra_1.default.existsSync(outputDir))
                await fs_extra_1.default.remove(outputDir);
            tmpDir.removeCallback();
        }
        catch (cleanupError) {
            logger_1.logger.error('Error during cleanup', { error: cleanupError });
        }
    }
}
async function processVideoToHLS(s3Url, savePath, _reelId, existingThumbnailUrl) {
    const url = new URL(s3Url);
    const bucket = url.hostname.split('.')[0];
    const key = decodeURIComponent(url.pathname.slice(1));
    const baseName = path_1.default.basename(key, path_1.default.extname(key));
    logger_1.logger.info(`Starting HLS video processing for: ${s3Url}`);
    // Create temporary directory for processing
    const tmpDir = tmp_1.default.dirSync({ unsafeCleanup: true });
    const inputTmp = path_1.default.join(tmpDir.name, 'input' + path_1.default.extname(key));
    const outputDir = path_1.default.join(tmpDir.name, 'output');
    let processingError = null;
    try {
        // Create output directory
        await fs_extra_1.default.ensureDir(outputDir);
        // Download video from S3
        logger_1.logger.info('Downloading video from S3...');
        try {
            const response = await axiosInstance({
                method: 'get',
                url: s3Url,
                responseType: 'stream',
                timeout: 60000,
                retryCount: 0,
            });
            const writer = fs_extra_1.default.createWriteStream(inputTmp);
            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            logger_1.logger.info('Video downloaded successfully');
        }
        catch (downloadError) {
            logger_1.logger.error('Failed to download video', { error: downloadError });
            throw new Error(`Video download failed: ${downloadError.message}`);
        }
        // Get video information
        const videoInfo = await getVideoInfo(inputTmp);
        logger_1.logger.info('Original video information', { videoInfo });
        // Calculate aspect ratio
        const aspectRatio = videoInfo.width / videoInfo.height;
        // Generate thumbnail only if not already provided
        let thumbnailUrl;
        if (existingThumbnailUrl) {
            logger_1.logger.info('Using existing thumbnail, skipping thumbnail generation', {
                existingThumbnailUrl,
            });
            thumbnailUrl = existingThumbnailUrl;
        }
        else {
            logger_1.logger.info('Generating thumbnail...');
            await new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputTmp)
                    .screenshots({
                    timestamps: ['00:00:01'],
                    filename: 'thumbnail.jpg',
                    folder: outputDir,
                })
                    .on('error', reject)
                    .on('end', () => resolve());
            });
            // Use posix path for S3 URLs to ensure forward slashes
            const normalizeS3Path = (p) => p.replace(/\\/g, '/');
            thumbnailUrl = `https://${bucket}.s3.amazonaws.com/${normalizeS3Path(path_1.default.join(savePath, 'thumbnail.jpg'))}`;
        }
        // Create quality-specific directories
        const qualityDirs = {};
        for (const config of QUALITY_CONFIGS) {
            const qualityDir = path_1.default.join(outputDir, config.name);
            await fs_extra_1.default.ensureDir(qualityDir);
            qualityDirs[config.name] = qualityDir;
        }
        // Process each quality
        for (const qualityConfig of QUALITY_CONFIGS) {
            logger_1.logger.info(`Processing ${qualityConfig.name} quality...`);
            const qualityOutputDir = qualityDirs[qualityConfig.name];
            const outputPath = path_1.default.join(qualityOutputDir, `${baseName}_${qualityConfig.name}.mp4`);
            // Calculate dimensions maintaining aspect ratio
            let targetHeight = qualityConfig.maxHeight;
            let targetWidth = Math.round(targetHeight * aspectRatio);
            // Ensure width is even (required by some codecs)
            if (targetWidth % 2 !== 0) {
                targetWidth += 1;
            }
            logger_1.logger.info(`Target dimensions for ${qualityConfig.name}: ${targetWidth}x${targetHeight}`);
            // Convert video to specific quality
            await new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputTmp)
                    .videoCodec('libx264')
                    .size(`${targetWidth}x${targetHeight}`)
                    .videoBitrate(qualityConfig.videoBitrate)
                    .audioBitrate(qualityConfig.audioBitrate)
                    .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
                    .on('error', reject)
                    .on('end', () => resolve())
                    .save(outputPath);
            });
            // Use FFmpeg to create HLS segments
            const segmentDir = path_1.default.join(qualityOutputDir, 'segments');
            await fs_extra_1.default.ensureDir(segmentDir);
            const ffmpegCmd = `ffmpeg -i "${outputPath}" \
                -c:v libx264 -c:a aac \
                -hls_time 1 \
                -hls_playlist_type vod \
                -hls_segment_filename "${segmentDir}/segment_%03d.ts" \
                -hls_list_size 0 \
                -f hls \
                -hls_flags independent_segments \
                -hls_segment_type mpegts \
                -hls_allow_cache 1 \
                -hls_init_time 1 \
                -hls_base_url "" \
                "${segmentDir}/playlist.m3u8"`;
            try {
                logger_1.logger.info('Running FFmpeg command', { command: ffmpegCmd });
                await execAsync(ffmpegCmd);
                logger_1.logger.info(`Created HLS segments for ${qualityConfig.name}`);
            }
            catch (error) {
                logger_1.logger.error(`Error creating HLS segments for ${qualityConfig.name}`, { error });
                throw error;
            }
        }
        // Create master playlist
        const masterPlaylistPath = path_1.default.join(outputDir, 'master.m3u8');
        await createMasterPlaylist(outputDir, masterPlaylistPath);
        // Generate video preview
        let previewResult = null;
        try {
            previewResult = await processVideoPreview(inputTmp, outputDir, savePath, bucket);
            logger_1.logger.info('Video preview generated', { previewResult });
        }
        catch (previewError) {
            logger_1.logger.error('Failed to generate preview, continuing without it', { error: previewError });
            // Don't throw - preview is optional, continue with HLS processing
        }
        // Delete any existing master.mpd file in S3
        try {
            const s3Client = (0, s3_service_1.getS3Client)();
            if (s3Client) {
                const deleteCommand = new client_s3_1.DeleteObjectCommand({
                    Bucket: bucket,
                    Key: path_1.default.join(savePath, 'master.mpd'),
                });
                await s3Client.send(deleteCommand);
                logger_1.logger.info('Deleted existing master.mpd file from S3');
            }
        }
        catch (error) {
            logger_1.logger.info('No existing master.mpd file to delete');
        }
        // Verify files before upload
        const files = await fs_extra_1.default.readdir(outputDir, { recursive: true });
        logger_1.logger.info('Files to upload', { files });
        // Verify preview file exists if it was generated
        if (previewResult) {
            const previewFilePath = path_1.default.join(outputDir, 'preview.mp4');
            const previewExists = fs_extra_1.default.existsSync(previewFilePath);
            if (previewExists) {
                const previewStats = await fs_extra_1.default.stat(previewFilePath);
                logger_1.logger.info(`Preview file exists and will be uploaded: ${previewFilePath} (${(previewStats.size / 1024).toFixed(2)} KB)`);
            }
            else {
                logger_1.logger.warn('Preview file not found in output directory', { path: previewFilePath });
            }
        }
        // Upload all files to S3
        await uploadToS3(outputDir, bucket, savePath);
        logger_1.logger.info('Upload completed. Preview should be available at:', previewResult ? previewResult.previewUrl : 'N/A');
        // Use posix path for S3 URLs to ensure forward slashes (works on all platforms)
        const normalizeS3Path = (p) => p.replace(/\\/g, '/');
        return {
            masterPlaylistUrl: `https://${bucket}.s3.amazonaws.com/${normalizeS3Path(path_1.default.join(savePath, 'master.m3u8'))}`,
            thumbnailUrl: thumbnailUrl,
            previewUrl: previewResult ? previewResult.previewUrl : null,
            duration: Math.round(videoInfo.duration), // Round to nearest second
            qualities: QUALITY_CONFIGS.map((qualityConfig) => ({
                name: qualityConfig.name,
                playlistUrl: `https://${bucket}.s3.amazonaws.com/${normalizeS3Path(path_1.default.join(savePath, qualityConfig.name, 'segments/playlist.m3u8'))}`,
            })),
        };
    }
    catch (error) {
        processingError = error;
        logger_1.logger.error('Error processing video', { error });
        // Enhanced error handling for status update
        try {
            const mainServerUrl = process.env.MAIN_SERVER_URL;
            if (mainServerUrl) {
                await axiosInstance({
                    method: 'post',
                    url: `${mainServerUrl}/reels/internal/update`,
                    data: {
                        reelId: _reelId,
                        video_proccessed_status: 'failed',
                        error_message: error instanceof Error ? error.message : String(error),
                        error_details: {
                            name: error instanceof Error ? error.name : 'Unknown',
                            stack: error instanceof Error ? error.stack : undefined,
                            code: error?.code,
                        },
                    },
                    timeout: 10000,
                    retryCount: 0,
                });
                logger_1.logger.info('Status update sent successfully');
            }
        }
        catch (statusUpdateError) {
            logger_1.logger.error('Failed to update status', { error: statusUpdateError });
        }
        throw error;
    }
    finally {
        // Cleanup all temporary files and directories
        try {
            logger_1.logger.info('Starting cleanup process...');
            // Check if files exist before attempting to delete
            const inputFileExists = fs_extra_1.default.existsSync(inputTmp);
            const outputDirExists = fs_extra_1.default.existsSync(outputDir);
            // Remove input file
            if (inputFileExists) {
                try {
                    await fs_extra_1.default.unlink(inputTmp);
                    logger_1.logger.info('Removed input file', { path: inputTmp });
                }
                catch (inputFileError) {
                    logger_1.logger.error('Error removing input file', { error: inputFileError });
                }
            }
            // Remove output directory and all its contents
            if (outputDirExists) {
                try {
                    await fs_extra_1.default.remove(outputDir);
                    logger_1.logger.info('Removed output directory', { path: outputDir });
                }
                catch (outputDirError) {
                    logger_1.logger.error('Error removing output directory', { error: outputDirError });
                }
            }
            // Remove temporary directory
            try {
                tmpDir.removeCallback();
                logger_1.logger.info('Removed temporary directory', { path: tmpDir.name });
            }
            catch (tmpDirError) {
                logger_1.logger.error('Error removing temporary directory', { error: tmpDirError });
            }
            // Update status to completed only if no error occurred
            if (!processingError) {
                try {
                    const mainServerUrl = process.env.MAIN_SERVER_URL;
                    if (mainServerUrl) {
                        await axiosInstance({
                            method: 'post',
                            url: `${mainServerUrl}/reels/internal/update`,
                            data: {
                                reelId: _reelId,
                                video_proccessed_status: 'done',
                            },
                            timeout: 10000,
                            retryCount: 0,
                        });
                        logger_1.logger.info('Status update sent successfully');
                    }
                }
                catch (statusUpdateError) {
                    logger_1.logger.error('Failed to update completion status', { error: statusUpdateError });
                }
            }
        }
        catch (cleanupError) {
            logger_1.logger.error('Error during cleanup', { error: cleanupError });
            logger_1.logger.error('Cleanup error details', {
                name: cleanupError?.name,
                message: cleanupError?.message,
                stack: cleanupError?.stack,
                code: cleanupError?.code,
            });
        }
    }
}
async function createMasterPlaylist(_basePath, outputPath) {
    try {
        const playlistContent = `#EXTM3U
#EXT-X-VERSION:3
${QUALITY_CONFIGS.map((config) => {
            const bandwidth = (parseInt(config.videoBitrate) + parseInt(config.audioBitrate)) * 1000;
            return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${config.maxHeight}x${config.maxHeight}
${config.name}/segments/playlist.m3u8`;
        }).join('\n')}`;
        await fs_extra_1.default.writeFile(outputPath, playlistContent);
        logger_1.logger.info('Master playlist created', { path: outputPath });
        logger_1.logger.info('Master playlist content', { content: playlistContent });
    }
    catch (error) {
        logger_1.logger.error('Error creating master playlist', { error });
        throw error;
    }
}
async function uploadToS3(localPath, bucket, s3Path) {
    try {
        logger_1.logger.info('Starting S3 upload process', { localPath, bucket, s3Path });
        const s3Client = (0, s3_service_1.getS3Client)();
        if (!s3Client) {
            throw new Error('S3 client not configured. Please check AWS credentials in environment variables.');
        }
        // Verify bucket exists
        try {
            const { HeadBucketCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
            const headCommand = new HeadBucketCommand({ Bucket: bucket });
            await s3Client.send(headCommand);
            logger_1.logger.info(`Bucket ${bucket} exists and is accessible`);
        }
        catch (error) {
            logger_1.logger.error(`Error accessing bucket ${bucket}`, { error });
            throw new Error(`Cannot access bucket ${bucket}: ${error.message}`);
        }
        // Upload all files recursively
        const files = await fs_extra_1.default.readdir(localPath, { recursive: true });
        logger_1.logger.info(`Found ${files.length} files to upload`);
        // Check if preview.mp4 is in the files list
        const hasPreview = files.some((f) => {
            const filePath = typeof f === 'string' ? f : f.toString();
            return filePath === 'preview.mp4' || filePath.includes('preview.mp4');
        });
        if (hasPreview) {
            logger_1.logger.info('Preview file (preview.mp4) found in files to upload');
        }
        for (const file of files) {
            // Ensure file is a string (readdir can return Buffer in some cases)
            const filePath = typeof file === 'string' ? file : file.toString();
            const localFilePath = path_1.default.join(localPath, filePath);
            const stats = await fs_extra_1.default.stat(localFilePath);
            if (stats.isFile()) {
                const relativePath = path_1.default.relative(localPath, localFilePath);
                const s3Key = path_1.default.join(s3Path, relativePath).replace(/\\/g, '/');
                // Highlight preview file upload
                const isPreview = filePath === 'preview.mp4' || filePath.endsWith('preview.mp4');
                logger_1.logger.info(`Uploading: ${filePath}`, {
                    s3Key,
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    isPreview
                });
                try {
                    const fileStream = fs_extra_1.default.createReadStream(localFilePath);
                    const contentType = getContentType(filePath);
                    const contentLength = Number(stats.size);
                    const upload = new lib_storage_1.Upload({
                        client: s3Client,
                        params: {
                            Bucket: bucket,
                            Key: s3Key,
                            Body: fileStream,
                            ContentType: contentType,
                            ContentLength: contentLength,
                        },
                        queueSize: 4,
                        partSize: 1024 * 1024 * 5,
                        leavePartsOnError: false,
                    });
                    // Monitor upload progress
                    upload.on('httpUploadProgress', (progress) => {
                        if (progress.total && progress.loaded !== undefined) {
                            const percentage = Math.round((progress.loaded / progress.total) * 100);
                            const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(2);
                            const totalMB = (progress.total / (1024 * 1024)).toFixed(2);
                            process.stdout.write(`\r   Progress: ${percentage}% (${loadedMB}MB / ${totalMB}MB)`);
                        }
                    });
                    await upload.done();
                    logger_1.logger.info(`Successfully uploaded: ${s3Key}`, { isPreview });
                }
                catch (uploadError) {
                    logger_1.logger.error(`Failed to upload ${filePath}`, { error: uploadError, isPreview });
                    throw new Error(`Failed to upload ${filePath}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
                }
            }
        }
        // Verify preview was uploaded
        const previewUploaded = files.some((f) => {
            const filePath = typeof f === 'string' ? f : f.toString();
            const fullPath = path_1.default.join(localPath, filePath);
            return fs_extra_1.default.existsSync(fullPath) && (filePath === 'preview.mp4' || filePath.includes('preview.mp4'));
        });
        if (previewUploaded) {
            logger_1.logger.info('Preview file (preview.mp4) was included in the upload');
        }
        logger_1.logger.info('All files uploaded successfully');
    }
    catch (error) {
        logger_1.logger.error('S3 upload process failed', { error });
        throw error;
    }
}
function getContentType(filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
    switch (ext) {
        case '.m3u8':
            return 'application/vnd.apple.mpegurl';
        case '.ts':
            return 'video/mp2t';
        case '.mp4':
            return 'video/mp4';
        case '.jpg':
            return 'image/jpeg';
        default:
            return 'application/octet-stream';
    }
}
// Helper function to get video information
function getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
            if (err) {
                logger_1.logger.error('Error getting video info', { error: err });
                return reject(err);
            }
            const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');
            if (!videoStream) {
                return reject(new Error('No video stream found'));
            }
            resolve({
                width: videoStream.width || 0,
                height: videoStream.height || 0,
                duration: typeof videoStream.duration === 'number' ? videoStream.duration : parseFloat(videoStream.duration || '0') || 0,
                codec: videoStream.codec_name || '',
                bitrate: videoStream.bit_rate || '',
                frameRate: videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : 0,
            });
        });
    });
}
//# sourceMappingURL=hlsVideoProcessor.service.js.map