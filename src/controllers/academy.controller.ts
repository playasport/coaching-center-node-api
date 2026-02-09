import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { config } from '../config/env';
import * as academyService from '../services/client/academy.service';

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
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;
    const city = (req.query.city as string)?.trim() || undefined;
    const state = (req.query.state as string)?.trim() || undefined;
    const sportId = (req.query.sportId as string)?.trim() || undefined;
    const sportIds = (req.query.sportIds as string)?.trim() || undefined;
    const gender = (req.query.gender as string)?.trim() || undefined;
    const forDisabled = req.query.for_disabled === 'true' || req.query.for_disabled === '1';
    const minAge = req.query.min_age != null ? parseInt(req.query.min_age as string, 10) : undefined;
    const maxAge = req.query.max_age != null ? parseInt(req.query.max_age as string, 10) : undefined;

    // Validate location if provided
    let userLocation: { latitude: number; longitude: number } | undefined;
    if (latitude !== undefined && longitude !== undefined) {
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new ApiError(400, t('academy.validation.invalidLocationCoordinates'));
      }
      userLocation = { latitude, longitude };
    }

    // Validate radius if provided
    if (radius !== undefined) {
      if (isNaN(radius) || radius <= 0 || radius > config.location.maxRadius) {
        throw new ApiError(400, t('academy.validation.invalidRadius'));
      }
    }

    // Get user ID if authenticated (optional)
    const userId = req.user?.id;

    const filters = {
      city,
      state,
      sportId,
      sportIds,
      gender,
      forDisabled,
      minAge: minAge != null && !Number.isNaN(minAge) ? minAge : undefined,
      maxAge: maxAge != null && !Number.isNaN(maxAge) ? maxAge : undefined,
    };
    const result = await academyService.getAllAcademies(page, limit, userLocation, userId, radius, filters);

    const response = new ApiResponse(200, result, t('academy.getAll.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get academy details by ID
 * Supports: MongoDB ObjectId, CoachingCenter UUID, or User custom ID
 */
export const getAcademyById = async (
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

    const academy = await academyService.getAcademyById(id, isUserLoggedIn);

    if (!academy) {
      throw new ApiError(404, t('academy.getById.notFound'));
    }

    const response = new ApiResponse(200, { ...academy }, t('academy.getById.success'));
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
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

    // Validate location if provided
    let userLocation: { latitude: number; longitude: number } | undefined;
    if (latitude !== undefined && longitude !== undefined) {
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new ApiError(400, t('academy.validation.invalidLocationCoordinates'));
      }
      userLocation = { latitude, longitude };
    }

    // Validate radius if provided
    if (radius !== undefined) {
      if (isNaN(radius) || radius <= 0 || radius > config.location.maxRadius) {
        throw new ApiError(400, t('academy.validation.invalidRadius'));
      }
    }

    const result = await academyService.getAcademiesBySport(slug, page, limit, userLocation, radius);

    const response = new ApiResponse(200, result, t('academy.getBySport.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

