import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { calculateDistanceDebug } from '../../utils/distance';

/**
 * Test distance calculation between two points
 * GET /api/v1/test/distance?lat1=&lon1=&lat2=&lon2=
 * Optional: skipCache=1 to bypass Redis and force fresh Google API call (for debugging)
 */
export const testDistance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lat1 = req.query.lat1;
    const lon1 = req.query.lon1;
    const lat2 = req.query.lat2;
    const lon2 = req.query.lon2;
    const skipCache = req.query.skipCache === '1' || req.query.skipCache === 'true';

    if (
      lat1 === undefined ||
      lon1 === undefined ||
      lat2 === undefined ||
      lon2 === undefined
    ) {
      throw new ApiError(
        400,
        'Query params required: lat1, lon1, lat2, lon2. Example: ?lat1=28.6139&lon1=77.2090&lat2=19.0760&lon2=72.8777'
      );
    }

    const lat1Num = typeof lat1 === 'string' ? parseFloat(lat1) : Number(lat1);
    const lon1Num = typeof lon1 === 'string' ? parseFloat(lon1) : Number(lon1);
    const lat2Num = typeof lat2 === 'string' ? parseFloat(lat2) : Number(lat2);
    const lon2Num = typeof lon2 === 'string' ? parseFloat(lon2) : Number(lon2);

    if (
      isNaN(lat1Num) ||
      isNaN(lon1Num) ||
      isNaN(lat2Num) ||
      isNaN(lon2Num)
    ) {
      throw new ApiError(400, 'Invalid coordinates. Provide valid numbers for lat1, lon1, lat2, lon2.');
    }

    if (lat1Num < -90 || lat1Num > 90 || lat2Num < -90 || lat2Num > 90) {
      throw new ApiError(400, 'Latitude must be between -90 and 90.');
    }

    if (lon1Num < -180 || lon1Num > 180 || lon2Num < -180 || lon2Num > 180) {
      throw new ApiError(400, 'Longitude must be between -180 and 180.');
    }

    const result = await calculateDistanceDebug(
      lat1Num,
      lon1Num,
      lat2Num,
      lon2Num,
      skipCache
    );

    const response = new ApiResponse(
      200,
      {
        ...result,
        skipCacheUsed: skipCache || undefined,
        methodDescription:
          result.method === 'cache'
            ? 'Redis cache (previously computed)'
            : result.method === 'google_maps'
              ? 'Google Maps Distance Matrix API (road distance)'
              : 'Haversine formula (straight-line distance, fallback)',
      },
      t('common.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};
