import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import * as sportService from '../../services/admin/sport.service';
import * as sportImageService from '../../services/admin/sportImage.service';

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
 * Supports image upload via multipart/form-data
 */
export const createSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Parse body data - handle both JSON and multipart/form-data
    let sportData: any = { ...req.body };
    
    // If it's multipart/form-data, parse boolean strings
    if (req.body.is_active !== undefined) {
      if (typeof req.body.is_active === 'string') {
        sportData.is_active = req.body.is_active === 'true' || req.body.is_active === '1';
      }
    }
    if (req.body.is_popular !== undefined) {
      if (typeof req.body.is_popular === 'string') {
        sportData.is_popular = req.body.is_popular === 'true' || req.body.is_popular === '1';
      }
    }
    
    // If image file is provided, don't include logo URL (image file takes precedence)
    if (req.file) {
      delete sportData.logo; // Remove logo URL if image file is provided
    }
    
    // Create sport first
    const sport = await sportService.createSport(sportData);
    
    // If image file is provided, upload it
    if (req.file) {
      try {
        // Use custom_id to identify the sport
        const sportId = sport.custom_id;
        const imageUrl = await sportImageService.uploadSportImage(sportId, req.file);
        // Update sport with image URL
        const updatedSport = await sportService.updateSport(sportId, { logo: imageUrl });
        const response = new ApiResponse(201, { sport: updatedSport }, t('sport.create.success'));
        res.status(201).json(response);
        return;
      } catch (imageError) {
        // If image upload fails, log but don't fail the sport creation
        logger.warn('Failed to upload image during sport creation, sport created without image', {
          sportId: sport.custom_id,
          error: imageError,
        });
      }
    }
    
    const response = new ApiResponse(201, { sport }, t('sport.create.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update sport (admin only)
 * Supports image upload via multipart/form-data
 */
export const updateSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Parse body data - handle both JSON and multipart/form-data
    let sportData: any = { ...req.body };
    
    // If it's multipart/form-data, parse boolean strings
    if (req.body.is_active !== undefined) {
      if (typeof req.body.is_active === 'string') {
        sportData.is_active = req.body.is_active === 'true' || req.body.is_active === '1';
      }
    }
    if (req.body.is_popular !== undefined) {
      if (typeof req.body.is_popular === 'string') {
        sportData.is_popular = req.body.is_popular === 'true' || req.body.is_popular === '1';
      }
    }
    
    // If image file is provided, don't include logo URL (image file takes precedence)
    if (req.file) {
      delete sportData.logo; // Remove logo URL if image file is provided
    }
    
    // Update sport first
    const sport = await sportService.updateSport(id, sportData);

    if (!sport) {
      throw new ApiError(404, t('sport.notFound'));
    }
    
    // If image file is provided, upload it
    if (req.file) {
      try {
        // Use custom_id to identify the sport
        const sportId = sport.custom_id;
        const imageUrl = await sportImageService.uploadSportImage(sportId, req.file);
        // Update sport with image URL
        const updatedSport = await sportService.updateSport(sportId, { logo: imageUrl });
        const response = new ApiResponse(200, { sport: updatedSport }, t('sport.update.success'));
        res.json(response);
        return;
      } catch (imageError) {
        // If image upload fails, log but don't fail the sport update
        logger.warn('Failed to upload image during sport update, sport updated without image', {
          sportId: sport.custom_id,
          error: imageError,
        });
      }
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

/**
 * Delete sport image (admin only)
 */
export const deleteSportImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sportImageService.deleteSportImage(id);
    const response = new ApiResponse(200, null, 'Sport image deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
