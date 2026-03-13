/**
 * GeoNear-based nearest academies with road distance enrichment
 *
 * Flow:
 * 1. MongoDB $geoNear → top N academies by spherical distance (fast)
 * 2. calculateDistances (Redis cache + Google Maps API) → road distance
 * 3. Filter by radius, sort by road distance
 * 4. Return final result
 */

import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { calculateDistances } from '../../utils/distance';
import { logger } from '../../utils/logger';

const GEO_NEAR_LIMIT = 200; // Top N from $geoNear before road distance enrichment

export interface GeoNearAcademyResult {
  academy: any;
  sphericalDistanceKm: number;
  roadDistanceKm: number;
}

/**
 * Get nearby academies using $geoNear, then enrich with Google Maps road distance
 * Falls back to empty array if location.geo is not populated (run migrate:coaching-center-geo)
 *
 * @param userLocation - User's latitude/longitude
 * @param options - maxRadiusKm, extraQuery, limit
 * @returns Academies with roadDistanceKm, sorted by road distance
 */
export const getNearbyAcademiesWithRoadDistance = async (
  userLocation: { latitude: number; longitude: number },
  options: {
    maxRadiusKm?: number;
    limit?: number;
    extraQuery?: Record<string, any>;
  } = {}
): Promise<GeoNearAcademyResult[]> => {
  const {
    maxRadiusKm = 50,
    limit = GEO_NEAR_LIMIT,
    extraQuery = {},
  } = options;

  try {
    const baseQuery = {
      status: 'published',
      is_active: true,
      is_deleted: false,
      approval_status: 'approved',
      'location.geo': { $exists: true, $ne: null },
      ...extraQuery,
    };

    // $geoNear must be first stage; maxDistance in meters
    const maxDistanceMeters = maxRadiusKm * 1000 * 1.5; // 1.5x buffer for road vs straight-line

    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLocation.longitude, userLocation.latitude],
          },
          distanceField: 'sphericalDistance',
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: baseQuery,
        },
      },
      { $limit: limit },
      {
        $lookup: {
          from: 'sports',
          localField: 'sports',
          foreignField: '_id',
          as: 'sports',
          pipeline: [{ $project: { custom_id: 1, name: 1, logo: 1, is_popular: 1 } }],
        },
      },
    ];

    const results = await CoachingCenterModel.aggregate(pipeline).exec();

    if (results.length === 0) {
      return [];
    }

    // Get road distance via Redis cache + Google Maps API
    const destinations = results.map((r: any) => ({
      latitude: r.location?.latitude ?? r.location?.coordinates?.[1],
      longitude: r.location?.longitude ?? r.location?.coordinates?.[0],
    }));

    const roadDistances = await calculateDistances(
      userLocation.latitude,
      userLocation.longitude,
      destinations
    );

    const combined: GeoNearAcademyResult[] = results
      .map((academy: any, i: number) => ({
        academy,
        sphericalDistanceKm: (academy.sphericalDistance || 0) / 1000,
        roadDistanceKm: roadDistances[i] ?? academy.sphericalDistance / 1000,
      }))
      .filter((r: GeoNearAcademyResult) => r.roadDistanceKm <= maxRadiusKm)
      .sort((a: GeoNearAcademyResult, b: GeoNearAcademyResult) => a.roadDistanceKm - b.roadDistanceKm);

    return combined;
  } catch (err) {
    logger.warn('geoNear academies failed, may need migrate:coaching-center-geo', {
      error: err instanceof Error ? err.message : err,
    });
    return [];
  }
};
