import { CoachingCenter } from '../../models/coachingCenter.model';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../../validations/coachingCenter.validation';
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
/**
 * Create coaching center for an academy user
 */
export declare const createCoachingCenter: (data: CoachingCenterCreateInput, userId: string) => Promise<CoachingCenter>;
/**
 * Get coaching centers by user
 */
export declare const getCoachingCentersByUser: (userId: string, page?: number, limit?: number) => Promise<PaginatedResult<CoachingCenter>>;
/**
 * Re-export common functions for backward compatibility or easier access
 */
export declare const getCoachingCenterById: (id: string) => Promise<CoachingCenter | null>;
export declare const deleteCoachingCenter: (id: string) => Promise<void>;
export declare const toggleCoachingCenterStatus: (id: string) => Promise<CoachingCenter | null>;
/**
 * Remove media from coaching center (soft delete)
 * Supports: logo, documents, and sport_details media (images, videos)
 */
export declare const removeMediaFromCoachingCenter: (coachingCenterId: string, mediaType: "logo" | "document" | "image" | "video", uniqueId: string, sportId?: string) => Promise<void>;
/**
 * Update coaching center
 */
export declare const updateCoachingCenter: (id: string, data: CoachingCenterUpdateInput) => Promise<CoachingCenter | null>;
/**
 * Get a random image URL from the logged-in user's CoachingCenter(s) (logo or sport_details images).
 * Returns default banner URL if user has no center or no images.
 */
export declare const getRandomBanner: (userId: string) => Promise<{
    imageUrl: string;
}>;
//# sourceMappingURL=coachingCenter.service.d.ts.map