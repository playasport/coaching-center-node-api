import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as academyService from '../services/academy.service';

/**
 * Get all academies with pagination
 * Supports location-based sorting and favorite sports preference
 */
export const getAllAcademies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;

    // Validate location if provided
    let userLocation: { lat: number; lon: number } | undefined;
    if (lat !== undefined && lon !== undefined) {
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new ApiError(400, t('academy.validation.invalidLocationCoordinates'));
      }
      userLocation = { lat, lon };
    }

    // Get user ID if authenticated (optional)
    const userId = req.user?.id;

    const result = await academyService.getAllAcademies(page, limit, userLocation, userId);

    const response = new ApiResponse(200, result, t('academy.getAll.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get academy details by user's custom ID
 */
export const getAcademyByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('academy.getById.idRequired'));
    }

    // Check if user is logged in
    const isUserLoggedIn = !!req.user;

    const academy = await academyService.getAcademyByUserId(id, isUserLoggedIn);

    if (!academy) {
      throw new ApiError(404, t('academy.getById.notFound'));
    }

    const response = new ApiResponse(200, { academy }, t('academy.getById.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get academies by city name
 */
export const getAcademiesByCity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { cityName } = req.params;

    if (!cityName) {
      throw new ApiError(400, t('academy.getByCity.cityNameRequired'));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await academyService.getAcademiesByCity(cityName, page, limit);

    const response = new ApiResponse(200, result, t('academy.getByCity.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get academies by sport slug
 */
export const getAcademiesBySport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      throw new ApiError(400, t('academy.getBySport.slugRequired'));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;

    // Validate location if provided
    let userLocation: { lat: number; lon: number } | undefined;
    if (lat !== undefined && lon !== undefined) {
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new ApiError(400, t('academy.validation.invalidLocationCoordinates'));
      }
      userLocation = { lat, lon };
    }

    const result = await academyService.getAcademiesBySport(slug, page, limit, userLocation);

    const response = new ApiResponse(200, result, t('academy.getBySport.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

