import type { RatingStatus } from '../../models/coachingCenterRating.model';
import type { AdminRatingListItem, AdminRatingsListResult } from '../admin/adminCoachingCenterRating.service';
export interface AcademyRatingFilters {
    status?: RatingStatus;
    coachingCenterId?: string;
    page?: number;
    limit?: number;
}
/**
 * Get paginated list of ratings for the academy's coaching centers only.
 */
export declare const getRatings: (academyUserId: string, filters?: AcademyRatingFilters) => Promise<AdminRatingsListResult>;
/**
 * Get a single rating by id. Returns null if not found or not owned by academy's centers.
 */
export declare const getRatingById: (academyUserId: string, ratingId: string) => Promise<AdminRatingListItem | null>;
/**
 * Update rating status (approved / rejected / pending). Only for ratings belonging to academy's centers.
 */
export declare const updateRatingStatus: (academyUserId: string, ratingId: string, status: RatingStatus) => Promise<AdminRatingListItem>;
//# sourceMappingURL=academyCoachingCenterRating.service.d.ts.map