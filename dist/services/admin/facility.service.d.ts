import { CreateFacilityInput, UpdateFacilityInput } from '../../validations/facility.validation';
export interface GetAdminFacilitiesParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminFacilityListItem {
    _id: string;
    custom_id: string;
    name: string;
    description: string | null;
    icon: string | null;
    is_active: boolean;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface AdminPaginatedFacilitiesResult {
    facilities: AdminFacilityListItem[];
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
 * Get all facilities for admin with filters and pagination
 */
export declare const getAllFacilities: (params?: GetAdminFacilitiesParams) => Promise<AdminPaginatedFacilitiesResult>;
/**
 * Get facility by ID
 */
export declare const getFacilityById: (id: string, includeDeleted?: boolean) => Promise<AdminFacilityListItem | null>;
/**
 * Create a new facility
 */
export declare const createFacility: (data: CreateFacilityInput) => Promise<AdminFacilityListItem>;
/**
 * Update facility
 */
export declare const updateFacility: (id: string, data: UpdateFacilityInput) => Promise<AdminFacilityListItem | null>;
/**
 * Delete facility (soft delete)
 * Sets isDeleted to true and deletedAt timestamp
 * Note: We don't hard delete to maintain referential integrity
 */
export declare const deleteFacility: (id: string) => Promise<void>;
/**
 * Restore soft-deleted facility
 * Sets isDeleted to false and clears deletedAt
 */
export declare const restoreFacility: (id: string) => Promise<AdminFacilityListItem>;
//# sourceMappingURL=facility.service.d.ts.map