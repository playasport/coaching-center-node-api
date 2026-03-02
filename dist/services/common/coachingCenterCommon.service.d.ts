import { Types } from 'mongoose';
import { CoachingCenter } from '../../models/coachingCenter.model';
/**
 * Helper to get query by ID (supports both MongoDB ObjectId and custom UUID id)
 */
export declare const getQueryById: (id: string) => {
    _id: string;
    id?: undefined;
} | {
    id: string;
    _id?: undefined;
};
/**
 * Get coaching center by ID (supports both MongoDB ObjectId and custom UUID id)
 */
export declare const getCoachingCenterById: (id: string) => Promise<CoachingCenter | null>;
/**
 * Soft delete coaching center
 */
export declare const deleteCoachingCenter: (id: string) => Promise<void>;
/**
 * Toggle active status
 */
export declare const toggleCoachingCenterStatus: (id: string) => Promise<CoachingCenter | null>;
/**
 * Enqueue thumbnail generation for videos
 */
export declare const enqueueThumbnailGenerationForVideos: (coachingCenter: CoachingCenter) => Promise<void>;
/**
 * Extract all file URLs from coaching center that need to be moved
 */
export declare const extractFileUrlsFromCoachingCenter: (coachingCenter: CoachingCenter) => string[];
/**
 * Move media from temp to permanent
 */
export declare const moveMediaFilesToPermanent: (coachingCenter: CoachingCenter) => Promise<void>;
/**
 * Validate required fields for publishing
 */
export declare const validatePublishStatus: (data: any, _isAdmin?: boolean) => void;
/**
 * Resolve facilities from input
 */
export declare const resolveFacilities: (facilityInput: any[]) => Promise<Types.ObjectId[]>;
/**
 * Remove media from coaching center (soft delete)
 * Supports: logo, documents, and sport_details media (images, videos)
 */
export declare const removeMediaFromCoachingCenter: (coachingCenterId: string, mediaType: "logo" | "document" | "image" | "video", uniqueId: string, sportId?: string) => Promise<void>;
/**
 * Set an image as banner for coaching center
 * Only one image can be banner at a time - unsets all other banner flags
 */
export declare const setBannerImage: (coachingCenterId: string, sportId: string, imageUniqueId: string) => Promise<CoachingCenter>;
/**
 * Upload thumbnail file to S3
 */
export declare const uploadThumbnailFile: (file: Express.Multer.File) => Promise<string>;
/**
 * Upload and set video thumbnail
 */
export declare const uploadVideoThumbnail: (coachingCenterId: string, sportId: string, videoUniqueId: string, thumbnailUrl: string) => Promise<CoachingCenter>;
//# sourceMappingURL=coachingCenterCommon.service.d.ts.map