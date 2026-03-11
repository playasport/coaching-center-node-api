import { Types } from 'mongoose';
import { type RatingStatus } from '../../models/coachingCenterRating.model';
export interface SubmitRatingInput {
    rating: number;
    comment?: string | null;
}
export interface RatingListItem {
    id: string;
    rating: number;
    comment?: string | null;
    status?: RatingStatus;
    isOwn?: boolean;
    createdAt: Date;
    user?: {
        id: string;
        firstName: string;
        lastName?: string | null;
        profileImage?: string | null;
    } | null;
}
export interface RatingsListResponse {
    ratings: RatingListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    averageRating: number;
    totalRatings: number;
}
/**
 * Recalculate and update coaching center's averageRating, totalRatings, and ratings array.
 */
export declare const recalcCoachingCenterRatingStats: (coachingCenterObjectId: Types.ObjectId) => Promise<void>;
/**
 * Submit or update a user's rating for a coaching center. One rating per user per center.
 * Rejects if settings.general.ratings_enabled is false.
 */
export declare const submitOrUpdateRating: (userId: string, coachingCenterId: string, input: SubmitRatingInput) => Promise<{
    id: string;
    rating: number;
    comment?: string | null;
    isUpdate: boolean;
}>;
export interface UserRatingListItem {
    id: string;
    rating: number;
    comment: string | null;
    status: RatingStatus;
    created_at: Date;
    updated_at: Date;
    coaching_center: {
        id: string;
        center_name: string;
        logo: string | null;
    } | null;
}
export interface UserRatingsListResponse {
    ratings: UserRatingListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export declare const getUserRatings: (userId: string, page?: number, limit?: number) => Promise<UserRatingsListResponse>;
/**
 * Get paginated ratings for a coaching center. Optionally populate user info.
 * When userId is not provided (guest), returns only the first 5 ratings (page and limit ignored).
 */
export declare const getRatingsByCoachingCenterId: (coachingCenterId: string, page?: number, limit?: number, userId?: string | null) => Promise<RatingsListResponse>;
export interface LatestRatingsForCenterResult {
    ratings: RatingListItem[];
    averageRating: number;
    totalRatings: number;
    isAlreadyRated: boolean;
    canUpdateRating: boolean;
}
/**
 * Get latest N ratings for a coaching center. If userId provided, put that user's rating first and set isAlreadyRated/canUpdateRating.
 */
export declare const getLatestRatingsForCenter: (coachingCenterId: string, limit?: number, userId?: string | null) => Promise<LatestRatingsForCenterResult>;
//# sourceMappingURL=coachingCenterRating.service.d.ts.map