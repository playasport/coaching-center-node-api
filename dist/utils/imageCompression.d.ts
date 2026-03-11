/**
 * Compress and resize image
 * @param buffer - Image buffer
 * @param mimetype - Image MIME type
 * @returns Compressed image buffer
 */
export declare const compressImage: (buffer: Buffer, mimetype: string) => Promise<Buffer>;
/**
 * Check if file is an image
 */
export declare const isImage: (mimetype: string) => boolean;
/**
 * Check if image can be compressed (Sharp supports JPEG, PNG, WebP but not GIF)
 */
export declare const canCompressImage: (mimetype: string) => boolean;
//# sourceMappingURL=imageCompression.d.ts.map