"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canCompressImage = exports.isImage = exports.compressImage = void 0;
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("./logger");
const env_1 = require("../config/env");
const MAX_WIDTH = env_1.config.media.imageCompression.maxWidth;
const MAX_SIZE_KB = env_1.config.media.imageCompression.maxSizeKB;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
/**
 * Compress and resize image
 * @param buffer - Image buffer
 * @param mimetype - Image MIME type
 * @returns Compressed image buffer
 */
const compressImage = async (buffer, mimetype) => {
    try {
        // GIF files cannot be compressed with Sharp, return as-is
        if (mimetype === 'image/gif') {
            logger_1.logger.info('GIF file detected, skipping compression (Sharp does not support GIF)', {
                size: `${(buffer.length / 1024).toFixed(2)} KB`,
            });
            return buffer;
        }
        // Check if it's an image type that sharp can process
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!supportedTypes.includes(mimetype)) {
            logger_1.logger.warn('Image type not supported for compression', { mimetype });
            return buffer;
        }
        let image = (0, sharp_1.default)(buffer);
        const metadata = await image.metadata();
        const originalSize = buffer.length;
        // Resize if width exceeds MAX_WIDTH (maintain aspect ratio)
        if (metadata.width && metadata.width > MAX_WIDTH) {
            image = image.resize(MAX_WIDTH, null, {
                withoutEnlargement: true,
                fit: 'inside',
            });
            logger_1.logger.info('Image resized', {
                originalWidth: metadata.width,
                newWidth: MAX_WIDTH,
            });
        }
        // Determine output format and quality
        let outputFormat = 'jpeg';
        if (mimetype === 'image/png') {
            outputFormat = 'png';
        }
        else if (mimetype === 'image/webp') {
            outputFormat = 'webp';
        }
        // Compress with quality settings
        let quality = 85; // Start with good quality
        let compressedBuffer = buffer; // Initialize with original buffer
        // For PNG, check if it has transparency
        let hasTransparency = false;
        if (outputFormat === 'png') {
            try {
                const stats = await image.stats();
                hasTransparency = stats.channels.some(ch => ch.min < 255);
            }
            catch (error) {
                // If we can't determine, assume it might have transparency
                hasTransparency = true;
            }
        }
        // Try to compress to target size
        for (let attempt = 0; attempt < 6; attempt++) {
            if (outputFormat === 'jpeg') {
                compressedBuffer = await image
                    .jpeg({ quality, progressive: true, mozjpeg: true })
                    .toBuffer();
            }
            else if (outputFormat === 'png') {
                // PNG uses compressionLevel (0-9), start with 6 and increase to 9
                const compressionLevel = Math.min(9, 6 + attempt);
                compressedBuffer = await image
                    .png({ compressionLevel, palette: attempt >= 3 }) // Use palette for better compression on later attempts
                    .toBuffer();
                // If PNG is still too large and has no transparency, try converting to JPEG
                if (compressedBuffer.length > MAX_SIZE_BYTES && !hasTransparency && attempt >= 3) {
                    logger_1.logger.info('Converting PNG to JPEG for better compression', {
                        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                    });
                    // Convert to JPEG with quality 85
                    compressedBuffer = await image
                        .jpeg({ quality: 85, progressive: true, mozjpeg: true })
                        .toBuffer();
                    // Try reducing JPEG quality if still too large
                    if (compressedBuffer.length > MAX_SIZE_BYTES) {
                        for (let jpegQuality = 75; jpegQuality >= 50; jpegQuality -= 10) {
                            const jpegBuffer = await image
                                .jpeg({ quality: jpegQuality, progressive: true, mozjpeg: true })
                                .toBuffer();
                            if (jpegBuffer.length <= MAX_SIZE_BYTES) {
                                compressedBuffer = jpegBuffer;
                                logger_1.logger.info('PNG converted to JPEG and compressed', {
                                    originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                                    compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                                    quality: jpegQuality,
                                });
                                return compressedBuffer;
                            }
                            compressedBuffer = jpegBuffer;
                        }
                    }
                    logger_1.logger.info('PNG converted to JPEG', {
                        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                        compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                        targetSize: `${MAX_SIZE_KB} KB`,
                    });
                    return compressedBuffer;
                }
            }
            else {
                compressedBuffer = await image
                    .webp({ quality })
                    .toBuffer();
            }
            // If size is acceptable, return
            if (compressedBuffer.length <= MAX_SIZE_BYTES) {
                logger_1.logger.info('Image compressed successfully', {
                    originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                    compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                    quality: outputFormat === 'png' ? `compressionLevel: ${Math.min(9, 6 + attempt)}` : quality,
                    reduction: `${(((originalSize - compressedBuffer.length) / originalSize) * 100).toFixed(1)}%`,
                });
                return compressedBuffer;
            }
            // Reduce quality for next attempt (except PNG which uses compressionLevel)
            if (outputFormat !== 'png') {
                quality -= 15;
                if (quality < 20) {
                    // If quality is too low, stop and return current result
                    logger_1.logger.warn('Image compression reached minimum quality', {
                        finalSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                        targetSize: `${MAX_SIZE_KB} KB`,
                    });
                    return compressedBuffer;
                }
            }
            else {
                // For PNG, if we've tried all compression levels, try converting to JPEG if no transparency
                if (attempt >= 5) {
                    if (!hasTransparency) {
                        // Last attempt: convert to JPEG
                        logger_1.logger.info('Converting PNG to JPEG as final compression attempt', {
                            originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                        });
                        compressedBuffer = await image
                            .jpeg({ quality: 75, progressive: true, mozjpeg: true })
                            .toBuffer();
                        logger_1.logger.info('PNG converted to JPEG', {
                            originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                            compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                        });
                        return compressedBuffer;
                    }
                    else {
                        logger_1.logger.warn('Image compression reached maximum compression level (PNG with transparency preserved)', {
                            finalSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
                            targetSize: `${MAX_SIZE_KB} KB`,
                        });
                        return compressedBuffer;
                    }
                }
            }
        }
        // Return the last compressed buffer
        logger_1.logger.info('Image compressed (may exceed target size)', {
            originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
            compressedSize: `${(compressedBuffer.length / 1024).toFixed(2)} KB`,
            targetSize: `${MAX_SIZE_KB} KB`,
        });
        return compressedBuffer;
    }
    catch (error) {
        logger_1.logger.error('Failed to compress image', { error });
        // Return original buffer if compression fails
        return buffer;
    }
};
exports.compressImage = compressImage;
/**
 * Check if file is an image
 */
const isImage = (mimetype) => {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mimetype);
};
exports.isImage = isImage;
/**
 * Check if image can be compressed (Sharp supports JPEG, PNG, WebP but not GIF)
 */
const canCompressImage = (mimetype) => {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimetype);
};
exports.canCompressImage = canCompressImage;
//# sourceMappingURL=imageCompression.js.map