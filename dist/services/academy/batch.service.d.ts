import { Batch } from '../../models/batch.model';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';
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
export declare const createBatch: (data: BatchCreateInput, loggedInUserId: string) => Promise<Batch>;
export declare const getBatchById: (id: string) => Promise<Batch | null>;
export declare const getBatchesByUser: (userId: string, page?: number, limit?: number) => Promise<PaginatedResult<Batch>>;
export declare const getBatchesByCenter: (centerId: string, userId: string, page?: number, limit?: number) => Promise<PaginatedResult<Batch>>;
export declare const updateBatch: (id: string, data: BatchUpdateInput, loggedInUserId: string) => Promise<Batch | null>;
export declare const toggleBatchStatus: (id: string, loggedInUserId: string) => Promise<Batch | null>;
export declare const deleteBatch: (id: string, loggedInUserId: string) => Promise<void>;
//# sourceMappingURL=batch.service.d.ts.map