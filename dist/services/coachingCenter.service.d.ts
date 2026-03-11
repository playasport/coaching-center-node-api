import { Types } from 'mongoose';
import { CoachingCenter } from '../models/coachingCenter.model';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../validations/coachingCenter.validation';
export interface CreateCoachingCenterData extends Omit<CoachingCenterCreateInput, 'sports' | 'facility'> {
    sports: Types.ObjectId[];
    facility: Types.ObjectId[];
}
export declare const createCoachingCenter: (data: CoachingCenterCreateInput, userId?: string) => Promise<CoachingCenter>;
export declare const getCoachingCenterById: (id: string) => Promise<CoachingCenter | null>;
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
export declare const getCoachingCentersByUser: (userId: string, page?: number, limit?: number) => Promise<PaginatedResult<CoachingCenter>>;
export declare const updateCoachingCenter: (id: string, data: CoachingCenterUpdateInput) => Promise<CoachingCenter | null>;
export declare const toggleCoachingCenterStatus: (id: string) => Promise<CoachingCenter | null>;
export declare const deleteCoachingCenter: (id: string) => Promise<void>;
/**
 * Remove media from coaching center (soft delete)
 * Supports: logo, documents, and sport_details media (images, videos)
 */
export declare const removeMediaFromCoachingCenter: (coachingCenterId: string, mediaType: "logo" | "document" | "image" | "video", uniqueId: string, sportId?: string) => Promise<void>;
//# sourceMappingURL=coachingCenter.service.d.ts.map