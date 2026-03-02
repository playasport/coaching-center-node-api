export type MediaType = 'logo' | 'image' | 'video' | 'document';
interface UploadMediaOptions {
    file: Express.Multer.File;
    mediaType: MediaType;
}
/**
 * Upload media file to S3 (always saved in temp folder)
 * Files will be moved to permanent locations on final submission
 * Images are automatically compressed (max width 1500px, max size 500KB)
 */
export declare const uploadMediaFile: ({ file, mediaType, }: UploadMediaOptions) => Promise<string>;
/**
 * Upload multiple media files (all saved in temp folder)
 */
export declare const uploadMultipleMediaFiles: (files: Express.Multer.File[], mediaType: MediaType) => Promise<string[]>;
/**
 * Delete media file from S3
 */
export declare const deleteMediaFile: (fileUrl: string) => Promise<void>;
/**
 * Move file from temp folder to permanent location
 */
export declare const moveFileToPermanent: (tempFileUrl: string) => Promise<string>;
/**
 * Move multiple files from temp to permanent locations
 * Uses Promise.allSettled to handle individual failures gracefully
 */
export declare const moveFilesToPermanent: (tempFileUrls: string[]) => Promise<string[]>;
export {};
//# sourceMappingURL=coachingCenterMedia.service.d.ts.map