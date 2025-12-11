import { SportModel } from '../models/sport.model';
import { CoachingCenterModel} from '../models/coachingCenter.model';
import { logger } from '../utils/logger';
import { calculateDistances } from '../utils/distance';
import { Types } from 'mongoose';
import { getUserObjectId } from '../utils/userCache';
import { UserModel } from '../models/user.model';
import { config } from '../config/env';
import type { AcademyListItem } from './academy.service';

export interface PopularSport {
  _id: string;
  custom_id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  is_popular: boolean;
}

export interface HomeData {
  nearbyAcademies: AcademyListItem[];
  popularSports: PopularSport[];
}

/**
 * Get 8 popular sports
 */
export const getPopularSports = async (limit: number = 8): Promise<PopularSport[]> => {
  try {
    const sports = await SportModel.find({
      is_active: true,
      is_popular: true,
    })
      .select('_id custom_id name slug logo is_popular')
      .sort({ createdAt: -1 }) // Sort by newest first, or you can use a custom order field
      .limit(limit)
      .lean();

    return sports.map((sport) => ({
      _id: sport._id.toString(),
      custom_id: sport.custom_id,
      name: sport.name,
      slug: sport.slug || null,
      logo: sport.logo || null,
      is_popular: sport.is_popular || false,
    })) as PopularSport[];
  } catch (error) {
    logger.error('Failed to get popular sports:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Get nearby academies based on location
 */
export const getNearbyAcademies = async (
  userLocation: { lat: number; lon: number },
  limit: number = 12,
  userId?: string,
  radius?: number
): Promise<AcademyListItem[]> => {
  try {
    // Build base query - only published and active academies
    const query: any = {
      status: 'published',
      is_active: true,
      is_deleted: false,
    };

    // Get user's favorite sports if logged in
    let favoriteSportIds: Types.ObjectId[] = [];
    if (userId) {
      try {
        const userObjectId = await getUserObjectId(userId);
        if (userObjectId) {
          const user = await UserModel.findById(userObjectId)
            .select('favoriteSports')
            .lean();
          if (user?.favoriteSports && user.favoriteSports.length > 0) {
            favoriteSportIds = user.favoriteSports;
          }
        }
      } catch (error) {
        logger.warn('Failed to get user favorite sports', { userId, error });
      }
    }

    // Fetch academies
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .populate({
        path: 'user',
        select: 'id',
        match: { isDeleted: false },
      })
      .select('center_name logo location sports age allowed_genders sport_details user')
      .lean();

    // Calculate distances
    if (academies.length > 0) {
      const destinations = academies.map((academy) => ({
        lat: academy.location.latitude,
        lon: academy.location.longitude,
      }));

      const distances = await calculateDistances(
        userLocation.lat,
        userLocation.lon,
        destinations
      );

      // Add distance to each academy
      academies = academies.map((academy, index) => ({
        ...academy,
        distance: distances[index],
      }));

      // Filter by radius if provided
      const searchRadius = radius ?? config.location.defaultRadius;
      academies = academies.filter((academy) => {
        const distance = (academy as any).distance;
        return distance !== undefined && distance <= searchRadius;
      });
    }

    // Sort academies
    academies.sort((a, b) => {
      // Priority 1: Favorite sports (if user logged in and has favorites)
      if (favoriteSportIds.length > 0) {
        const aHasFavorite = (a as any).sports?.some((s: any) =>
          favoriteSportIds.some((favId) => favId.toString() === s._id?.toString())
        );
        const bHasFavorite = (b as any).sports?.some((s: any) =>
          favoriteSportIds.some((favId) => favId.toString() === s._id?.toString())
        );

        if (aHasFavorite && !bHasFavorite) return -1;
        if (!aHasFavorite && bHasFavorite) return 1;
      }

      // Priority 2: Distance (always sort by distance for nearby academies)
      if ((a as any).distance !== undefined && (b as any).distance !== undefined) {
        return (a as any).distance - (b as any).distance;
      }

      // Priority 3: Default sort (by creation date)
      return 0;
    });

    // Limit results
    const limitedAcademies = academies.slice(0, limit);

    // Map to AcademyListItem format
    return limitedAcademies.map((academy: any) => {
      // Get user's custom ID
      const customId = academy.user?.id || null;

      // Get first active image from sport_details
      let image: string | null = null;
      if (academy.sport_details && Array.isArray(academy.sport_details)) {
        for (const sportDetail of academy.sport_details) {
          if (sportDetail.images && Array.isArray(sportDetail.images)) {
            const activeImage = sportDetail.images.find(
              (img: any) => img.is_active && !img.is_deleted
            );
            if (activeImage) {
              image = activeImage.url;
              break;
            }
          }
        }
      }

      return {
        _id: academy._id.toString(),
        custom_id: customId,
        center_name: academy.center_name,
        logo: academy.logo,
        image: image,
        location: academy.location,
        sports: academy.sports || [],
        age: academy.age,
        allowed_genders: academy.allowed_genders || [],
        distance: academy.distance,
      };
    }) as AcademyListItem[];
  } catch (error) {
    logger.error('Failed to get nearby academies:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Get home page data (nearby academies and popular sports)
 */
export const getHomeData = async (
  userLocation?: { lat: number; lon: number },
  userId?: string,
  radius?: number
): Promise<HomeData> => {
  try {
    // Get popular sports and nearby academies in parallel
    // If any error occurs, it will return empty array instead of throwing
    const [popularSports, nearbyAcademies] = await Promise.all([
      getPopularSports(8).catch((error) => {
        logger.error('Error getting popular sports, returning empty array:', error);
        return [];
      }),
      userLocation 
        ? getNearbyAcademies(userLocation, 12, userId, radius).catch((error) => {
            logger.error('Error getting nearby academies, returning empty array:', error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    return {
      nearbyAcademies: nearbyAcademies || [],
      popularSports: popularSports || [],
    };
  } catch (error) {
    logger.error('Failed to get home data:', error);
    // Return default structure even on error
    return {
      nearbyAcademies: [],
      popularSports: [],
    };
  }
};

