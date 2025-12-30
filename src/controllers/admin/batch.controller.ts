import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as adminBatchService from '../../services/admin/adminBatch.service';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';

/**
 * Create batch (admin)
 */
export const createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as BatchCreateInput;

    // centerId is required for admin batch creation
    if (!data.centerId) {
      throw new ApiError(400, t('validation.batch.centerId.required'));
    }

    const batch = await adminBatchService.createBatchByAdmin(data);

    const response = new ApiResponse(201, { batch }, t('batch.create.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all batches (admin view)
 */
export const getAllBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { userId, centerId, sportId, status, isActive, search, sortBy, sortOrder } = req.query;

    const filters: adminBatchService.GetAdminBatchesFilters = {
      userId: userId as string,
      centerId: centerId as string,
      sportId: sportId as string,
      status: status as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminBatchService.getAllBatches(page, limit, filters);

    const response = new ApiResponse(200, result, t('batch.list.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get batch by ID (admin view)
 */
export const getBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const batch = await adminBatchService.getBatchById(id);

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    const response = new ApiResponse(200, { batch }, t('batch.get.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get batches by user ID (admin view)
 */
export const getBatchesByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { sortBy, sortOrder } = req.query;

    const result = await adminBatchService.getBatchesByUserId(
      userId,
      page,
      limit,
      sortBy as string,
      sortOrder as 'asc' | 'desc'
    );

    const response = new ApiResponse(200, result, t('batch.list.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get batches by center ID (admin view)
 */
export const getBatchesByCenterId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { centerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { sortBy, sortOrder } = req.query;

    const result = await adminBatchService.getBatchesByCenterId(
      centerId,
      page,
      limit,
      sortBy as string,
      sortOrder as 'asc' | 'desc'
    );

    const response = new ApiResponse(200, result, t('batch.list.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update batch (admin)
 */
export const updateBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as BatchUpdateInput;

    const batch = await adminBatchService.updateBatchByAdmin(id, data);

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    const response = new ApiResponse(200, { batch }, t('batch.update.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete batch (admin)
 */
export const deleteBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await adminBatchService.deleteBatchByAdmin(id);

    const response = new ApiResponse(200, null, t('batch.delete.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle batch status (admin)
 */
export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const batch = await adminBatchService.toggleBatchStatusByAdmin(id);

    const statusMessage = batch?.is_active ? t('batch.toggleStatus.active') : t('batch.toggleStatus.inactive');
    const response = new ApiResponse(200, { batch }, statusMessage);
    res.json(response);
  } catch (error) {
    next(error);
  }
};
