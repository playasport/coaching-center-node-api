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
exports.validateVideoDurationFromBuffer = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
/**
 * Validate video duration from file buffer
 * Writes buffer to temp file, checks duration with ffprobe, then cleans up
 */
const validateVideoDurationFromBuffer = async (videoBuffer, maxDurationSeconds, fileName) => {
    const tempDir = os.tmpdir();
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fileExtension = fileName ? path.extname(fileName) : '.mp4';
    const tempVideoPath = path.join(tempDir, `validate_video_${uniqueId}${fileExtension}`);
    try {
        logger_1.logger.info('Validating video duration from buffer', {
            bufferSize: videoBuffer.length,
            maxDurationSeconds,
            fileName,
        });
        // Write buffer to temp file
        fs.writeFileSync(tempVideoPath, videoBuffer);
        // Verify file was written
        if (!fs.existsSync(tempVideoPath)) {
            throw new ApiError_1.ApiError(500, 'Failed to write video file to temporary location');
        }
        // Get video duration using ffprobe
        const duration = await new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(tempVideoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                if (!videoStream || !videoStream.duration) {
                    reject(new Error('Could not determine video duration'));
                    return;
                }
                const durationSeconds = typeof videoStream.duration === 'number'
                    ? videoStream.duration
                    : parseFloat(videoStream.duration) || 0;
                resolve(durationSeconds);
            });
        });
        logger_1.logger.info('Video duration checked from buffer', {
            duration,
            maxDurationSeconds,
            fileName,
        });
        // Validate duration
        if (duration > maxDurationSeconds) {
            throw new ApiError_1.ApiError(400, `Video duration (${Math.round(duration)}s) exceeds maximum allowed duration of ${maxDurationSeconds} seconds for reels`);
        }
        if (duration <= 0) {
            throw new ApiError_1.ApiError(400, 'Invalid video duration. The video file may be corrupted.');
        }
        return duration;
    }
    catch (error) {
        logger_1.logger.error('Failed to validate video duration from buffer', {
            fileName,
            maxDurationSeconds,
            error: error instanceof Error ? error.message : error,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, `Failed to validate video duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    finally {
        // Cleanup temp file
        try {
            if (fs.existsSync(tempVideoPath)) {
                fs.unlinkSync(tempVideoPath);
                logger_1.logger.debug('Temp video file cleaned up', { tempVideoPath });
            }
        }
        catch (cleanupError) {
            logger_1.logger.warn('Failed to cleanup temp video file', {
                tempVideoPath,
                error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
            });
        }
    }
};
exports.validateVideoDurationFromBuffer = validateVideoDurationFromBuffer;
//# sourceMappingURL=videoDurationValidation.service.js.map