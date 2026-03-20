import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { parseRadiusKmFromQuery, assertValidRadiusKmIfProvided } from '../utils/searchRadius';
import * as homeService from '../services/client/home.service';

/**
 * Get home page data (nearby academies and popular sports)
 * GET /home
 * Query params: latitude, longitude (optional) - location coordinates
 */
export const getHomeData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse location from query parameters
    let userLocation: { latitude: number; longitude: number } | undefined;
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const radius = parseRadiusKmFromQuery(req.query.radius);

    if (latitude !== undefined && longitude !== undefined) {
      const latitudeNum = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
      const longitudeNum = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);

      if (isNaN(latitudeNum) || isNaN(longitudeNum) || latitudeNum < -90 || latitudeNum > 90 || longitudeNum < -180 || longitudeNum > 180) {
        throw new ApiError(400, t('academy.validation.invalidLocationCoordinates'));
      }

      userLocation = { latitude: latitudeNum, longitude: longitudeNum };
    }

    assertValidRadiusKmIfProvided(radius, t('academy.validation.invalidRadius'));

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

