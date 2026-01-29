import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as batchService from '../../services/academy/batch.service';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';

export const createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as BatchCreateInput;

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Always set userId from logged-in user (userId in request body is ignored)
    data.userId = req.user.id;

    const batch = await batchService.createBatch(data, req.user.id);

    const response = new ApiResponse(201, { batch }, t('batch.create.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('batch.idRequired'));
    }

    const batch = await batchService.getBatchById(id);

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    const response = new ApiResponse(200, { batch }, t('batch.get.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('batch.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as BatchUpdateInput;

    const batch = await batchService.updateBatch(id, data, req.user.id);

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    const response = new ApiResponse(200, { batch }, t('batch.update.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const toggleBatchStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('batch.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const batch = await batchService.toggleBatchStatus(id, req.user.id);

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    const statusMessage = batch.is_active ? t('batch.toggleStatus.active') : t('batch.toggleStatus.inactive');

    const response = new ApiResponse(200, { batch }, statusMessage);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('batch.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    await batchService.deleteBatch(id, req.user.id);

    const response = new ApiResponse(200, {}, t('batch.delete.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getMyBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await batchService.getBatchesByUser(req.user.id, page, limit);

    // Transform response to match expected structure: { batches: [...], pagination: {...} }
    const response = new ApiResponse(
      200,
      {
        batches: result.data,
        pagination: result.pagination,
      },
      t('batch.list.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getBatchesByCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { centerId } = req.params;

    if (!centerId) {
      throw new ApiError(400, t('batch.centerIdRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await batchService.getBatchesByCenter(centerId, req.user.id, page, limit);

    const response = new ApiResponse(200, result, t('batch.list.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

