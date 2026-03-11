import { Batch } from '../../models/batch.model';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';
export interface AdminPaginatedResult<T> {
    batches: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface GetAdminBatchesFilters {
    userId?: string;
    centerId?: string;
    sportId?: string;
    status?: string;
    isActive?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
/**
 * Create batch (admin - can create for any center)
 */
export declare const createBatchByAdmin: (data: BatchCreateInput) => Promise<Batch>;
/**
 * Get all batches for admin view with filters
 */
export declare const getAllBatches: (page?: number, limit?: number, filters?: GetAdminBatchesFilters, currentUserId?: string, currentUserRole?: string) => Promise<AdminPaginatedResult<Batch>>;
/**
 * Get batch by ID (admin view) with agent filtering
 */
export declare const getBatchById: (id: string, currentUserId?: string, currentUserRole?: string) => Promise<Batch | null>;
/**
 * Get batches by user ID (admin view) with agent filtering
 */
export declare const getBatchesByUserId: (userId: string, page?: number, limit?: number, sortBy?: string, sortOrder?: "asc" | "desc", _currentUserId?: string, _currentUserRole?: string) => Promise<AdminPaginatedResult<Batch>>;
/**
 * Get batches by center ID (admin view) with agent filtering
 */
export declare const getBatchesByCenterId: (centerId: string, page?: number, limit?: number, sortBy?: string, sortOrder?: "asc" | "desc", currentUserId?: string, currentUserRole?: string) => Promise<AdminPaginatedResult<Batch>>;
/**
 * Update batch (admin - can update any batch)
 */
export declare const updateBatchByAdmin: (id: string, data: BatchUpdateInput) => Promise<Batch | null>;
/**
 * Delete batch (admin - can delete any batch)
 */
export declare const deleteBatchByAdmin: (id: string) => Promise<void>;
/**
 * Toggle batch status (admin - can toggle any batch)
 */
export declare const toggleBatchStatusByAdmin: (id: string) => Promise<Batch | null>;
//# sourceMappingURL=adminBatch.service.d.ts.map