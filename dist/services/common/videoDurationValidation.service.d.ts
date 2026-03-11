/**
 * Validate video duration from file buffer
 * Writes buffer to temp file, checks duration with ffprobe, then cleans up
 */
export declare const validateVideoDurationFromBuffer: (videoBuffer: Buffer, maxDurationSeconds: number, fileName?: string) => Promise<number>;
//# sourceMappingURL=videoDurationValidation.service.d.ts.map