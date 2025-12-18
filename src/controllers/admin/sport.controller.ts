import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as sportService from '../../services/admin/sport.service';

/**
 * Get all sports for admin
 */
export const getAllSports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { search, isActive, isPopular } = req.query;

    const filters = {
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isPopular: isPopular === 'true' ? true : isPopular === 'false' ? false : undefined,
    };

    const result = await sportService.getAllSports(page, limit, filters);

    const response = new ApiResponse(200, result, t('sport.getAll.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sport by ID for admin
 */
export const getSportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const sport = await sportService.getSportById(id);

    if (!sport) {
      throw new ApiError(404, t('sport.notFound'));
    }

    const response = new ApiResponse(200, { sport }, t('sport.getById.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new sport (admin only)
 */
export const createSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sport = await sportService.createSport(req.body);
    const response = new ApiResponse(201, { sport }, t('sport.create.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update sport (admin only)
 */
export const updateSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const sport = await sportService.updateSport(id, req.body);

    if (!sport) {
      throw new ApiError(404, t('sport.notFound'));
    }

    const response = new ApiResponse(200, { sport }, t('sport.update.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete sport (admin only)
 */
export const deleteSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sportService.deleteSport(id);
    const response = new ApiResponse(200, null, t('sport.delete.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};
