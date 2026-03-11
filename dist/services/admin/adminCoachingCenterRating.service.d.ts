import type { RatingStatus } from '../../models/coachingCenterRating.model';
export interface AdminRatingFilters {
    status?: RatingStatus;
    coachingCenterId?: string;
    page?: number;
    limit?: number;
}
export interface AdminRatingListItem {
    id: string;
    rating: number;
    comment: string | null;
    status: RatingStatus;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: string;
        firstName: string;
        lastName: string | null;
        email?: string;
        profileImage?: string | null;
    } | null;
    coachingCenter: {
        id: string;
        center_name: string;
    } | null;
}
export interface AdminRatingsListResult {
    ratings: AdminRatingListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
/**
 * Get paginated list of coaching center ratings for admin with filters.
 */
export declare const getRatings: (filters?: AdminRatingFilters) => Promise<AdminRatingsListResult>;
/**
 * Get a single rating by id (Mongo _id).
 */
export declare const getRatingById: (ratingId: string) => Promise<AdminRatingListItem | null>;
/**
 * Update rating status (approve or reject). Recalculates coaching center stats when approved/rejected.
 */
export declare const updateRatingStatus: (ratingId: string, status: RatingStatus) => Promise<AdminRatingListItem>;
//# sourceMappingURL=adminCoachingCenterRating.service.d.ts.map