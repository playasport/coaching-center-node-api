import { Sport } from '../../models/sport.model';
import { CreateSportInput, UpdateSportInput } from '../../validations/sport.validation';
export interface AdminPaginatedResult<T> {
    sports: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
/**
 * Create a new sport
 */
export declare const createSport: (data: CreateSportInput) => Promise<Sport>;
/**
 * Get all sports with pagination and filters
 */
export declare const getAllSports: (page?: number, limit?: number, filters?: {
    search?: string;
    isActive?: boolean;
    isPopular?: boolean;
}) => Promise<AdminPaginatedResult<Sport>>;
/**
 * Get sport by ID
 */
export declare const getSportById: (id: string) => Promise<Sport | null>;
/**
 * Update sport
 */
export declare const updateSport: (id: string, data: UpdateSportInput) => Promise<Sport | null>;
/**
 * Delete sport
 */
export declare const deleteSport: (id: string) => Promise<void>;
/**
 * Toggle sport active status
 */
export declare const toggleSportActiveStatus: (id: string) => Promise<Sport | null>;
//# sourceMappingURL=sport.service.d.ts.map