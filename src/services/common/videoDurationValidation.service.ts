import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';

/**
 * Validate video duration from file buffer
 * Writes buffer to temp file, checks duration with ffprobe, then cleans up
 */
export const validateVideoDurationFromBuffer = async (
  videoBuffer: Buffer,
  maxDurationSeconds: number,
  fileName?: string
): Promise<number> => {
  const tempDir = os.tmpdir();
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const fileExtension = fileName ? path.extname(fileName) : '.mp4';
  const tempVideoPath = path.join(tempDir, `validate_video_${uniqueId}${fileExtension}`);

  try {
    logger.info('Validating video duration from buffer', {
      bufferSize: videoBuffer.length,
      maxDurationSeconds,
      fileName,
    });

    // Write buffer to temp file
    fs.writeFileSync(tempVideoPath, videoBuffer);

    // Verify file was written
    if (!fs.existsSync(tempVideoPath)) {
      throw new ApiError(500, 'Failed to write video file to temporary location');
    }

    // Get video duration using ffprobe
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream || !videoStream.duration) {
          reject(new Error('Could not determine video duration'));
          return;
        }

        const durationSeconds =
          typeof videoStream.duration === 'number'
            ? videoStream.duration
            : parseFloat(videoStream.duration) || 0;

        resolve(durationSeconds);
      });
    });

    logger.info('Video duration checked from buffer', {
      duration,
      maxDurationSeconds,
      fileName,
    });

    // Validate duration
    if (duration > maxDurationSeconds) {
      throw new ApiError(
        400,
        `Video duration (${Math.round(duration)}s) exceeds maximum allowed duration of ${maxDurationSeconds} seconds for reels`
      );
    }

    if (duration <= 0) {
      throw new ApiError(400, 'Invalid video duration. The video file may be corrupted.');
    }

    return duration;
  } catch (error) {
    logger.error('Failed to validate video duration from buffer', {
      fileName,
      maxDurationSeconds,
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      `Failed to validate video duration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    // Cleanup temp file
    try {
      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        logger.debug('Temp video file cleaned up', { tempVideoPath });
      }
    } catch (cleanupError) {
      logger.warn('Failed to cleanup temp video file', {
        tempVideoPath,
        error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
      });
    }
  }
};

