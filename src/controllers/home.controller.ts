import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { config } from '../config/env';
import * as homeService from '../services/home.service';

/**
 * Get home page data (nearby academies and popular sports)
 * GET /home
 * Query params: lat, lon (optional) - location coordinates
 */
export const getHomeData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse location from query parameters
    let userLocation: { lat: number; lon: number } | undefined;
    const lat = req.query.lat;
    const lon = req.query.lon;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;

    if (lat !== undefined && lon !== undefined) {
      const latNum = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
      const lonNum = typeof lon === 'string' ? parseFloat(lon) : Number(lon);

      if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        throw new ApiError(400, t('academy.validation.invalidLocationCoordinates'));
      }

      userLocation = { lat: latNum, lon: lonNum };
    }

    // Validate radius if provided
    if (radius !== undefined) {
      if (isNaN(radius) || radius <= 0 || radius > config.location.maxRadius) {
        throw new ApiError(400, t('academy.validation.invalidRadius'));
      }
    }

    // Get user ID if authenticated (optional)
    const userId = req.user?.id;

    // Get home data
    const homeData = await homeService.getHomeData(userLocation, userId, radius);

    const response = new ApiResponse(200, homeData, t('home.getHomeData.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

