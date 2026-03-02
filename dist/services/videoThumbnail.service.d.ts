/**
 * Generate thumbnail from video file buffer (for direct uploads)
 * This is the main method used during video upload
 */
export declare const generateThumbnailFromBuffer: (videoBuffer: Buffer, videoFileName: string) => Promise<Buffer>;
/**
 * Generate thumbnail from video URL (S3)
 * Downloads video from S3, generates thumbnail, uploads thumbnail to S3
 */
export declare const generateVideoThumbnail: (videoUrl: string) => Promise<string>;
//# sourceMappingURL=videoThumbnail.service.d.ts.map