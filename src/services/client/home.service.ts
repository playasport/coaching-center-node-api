import { SportModel } from '../../models/sport.model';
import { CoachingCenterModel} from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { calculateDistances } from '../../utils/distance';
import { Types } from 'mongoose';
import { getUserObjectId } from '../../utils/userCache';
import { UserModel } from '../../models/user.model';
import { config } from '../../config/env';
import type { AcademyListItem } from './academy.service';
import { ReelModel, ReelStatus } from '../../models/reel.model';
import { VideoProcessingStatus } from '../../models/streamHighlight.model';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';

export interface PopularSport {
  _id: string;
  custom_id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  is_popular: boolean;
}

export interface PopularReel {
  id: string;
  videoUrl: string;
  videoPreviewUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string | null;
  user: {
    name: string;
    avatar: string | null;
  };
  likes: number;
  views: number;
  comments: number;
}

export interface HomeData {
  nearbyAcademies: AcademyListItem[];
  popularSports: PopularSport[];
  popularReels: PopularReel[];
  topCities: TopCity[];
}

/**
 * Get popular sports, fill remaining slots with non-popular sports if needed
 */
export const getPopularSports = async (limit: number = 8): Promise<PopularSport[]> => {
  try {
    // First, get popular sports
    const popularSports = await SportModel.find({
      is_active: true,
      is_popular: true,
    })
      .select('_id custom_id name slug logo is_popular')
      .sort({ createdAt: -1 })
      .lean();

    const popularSportsList = popularSports.map((sport) => ({
      _id: sport._id.toString(),
      custom_id: sport.custom_id,
      name: sport.name,
      slug: sport.slug || null,
      logo: sport.logo || null,
      is_popular: sport.is_popular || false,
    })) as PopularSport[];

    // If we have enough popular sports, return them
    if (popularSportsList.length >= limit) {
      return popularSportsList.slice(0, limit);
    }

    // If we need more sports, get non-popular sports to fill the remaining slots
    const remainingCount = limit - popularSportsList.length;
    
    // Get the MongoDB ObjectIds of popular sports to exclude them
    const popularSportObjectIds = popularSports.map((sport) => sport._id);

    const additionalSports = await SportModel.find({
      is_active: true,
      is_popular: false,
      _id: { $nin: popularSportObjectIds },
    })
      .select('_id custom_id name slug logo is_popular')
      .sort({ createdAt: -1 })
      .limit(remainingCount)
      .lean();

    const additionalSportsList = additionalSports.map((sport) => ({
      _id: sport._id.toString(),
      custom_id: sport.custom_id,
      name: sport.name,
      slug: sport.slug || null,
      logo: sport.logo || null,
      is_popular: sport.is_popular || false,
    })) as PopularSport[];

    // Combine popular sports with additional sports
    return [...popularSportsList, ...additionalSportsList];
  } catch (error) {
    logger.error('Failed to get popular sports:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Get nearby academies based on location
 * Optimized to use database-level filtering and limit records fetched
 */
export const getNearbyAcademies = async (
  userLocation: { latitude: number; longitude: number },
  limit: number = 12,
  userId?: string,
  radius?: number
): Promise<AcademyListItem[]> => {
  try {
    // Build base query - only published and active academies
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      is_deleted: false,
      approval_status: 'approved',
    };

    // Don't use bounding box filter - fetch records and calculate distances directly
    // This ensures we don't miss nearby records (even with 0.0 distance)
    const searchRadius = radius ?? config.location.defaultRadius;

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

    // Fetch records without location filtering - we'll filter by distance after calculation
    // Fetch enough records to ensure we have enough after distance filtering
    // For nearby academies, we fetch more records to get accurate results
    const fetchLimit = Math.min(limit * 10, 500);
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .select('id center_name logo location sports allowed_genders sport_details createdAt user')
      .sort({ createdAt: -1 }) // Default sort by creation date
      .limit(fetchLimit)
      .lean();

    // Filter out academies with deleted users
    if (academies.length > 0) {
      const academyUserIds = academies
        .map((a: any) => a.user)
        .filter((uid: any) => uid && (Types.ObjectId.isValid(uid) || uid._id));
      
      if (academyUserIds.length > 0) {
        // Convert to ObjectIds if needed
        const userIds = academyUserIds.map((uid: any) => 
          Types.ObjectId.isValid(uid) ? new Types.ObjectId(uid) : (uid._id || uid)
        );
        
        const validUsers = await UserModel.find({
          _id: { $in: userIds },
          isDeleted: false,
        })
          .select('_id')
          .lean();
        
        const validUserIds = new Set(validUsers.map((u: any) => u._id.toString()));
        
        academies = academies.filter((academy: any) => {
          if (!academy.user) return false;
          const userId = academy.user._id || academy.user;
          const userIdStr = userId.toString ? userId.toString() : String(userId);
          return validUserIds.has(userIdStr);
        });
      } else {
        // If no valid user IDs, filter all out
        academies = [];
      }
    }

    // Calculate distances for ALL fetched records
    // This ensures we don't miss any nearby records
    if (academies.length > 0) {
      const destinations = academies.map((academy) => ({
        latitude: academy.location.latitude,
        longitude: academy.location.longitude,
      }));

      const distances = await calculateDistances(
        userLocation.latitude,
        userLocation.longitude,
        destinations
      );

      // Add distance to each academy
      academies = academies.map((academy, index) => ({
        ...academy,
        distance: distances[index],
      }));

      // Filter by exact radius after calculating distances
      // This ensures we include all records within radius, including 0.0 distance
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
      // Get first active image from sport_details, prioritizing banner images
      let image: string | null = null;
      if (academy.sport_details && Array.isArray(academy.sport_details)) {
        for (const sportDetail of academy.sport_details) {
          if (sportDetail.images && Array.isArray(sportDetail.images)) {
            // Sort images: banner first, then others
            const sortedImages = [...sportDetail.images].sort((a, b) => {
              if (a.is_banner && !b.is_banner) return -1;
              if (!a.is_banner && b.is_banner) return 1;
              return 0;
            });
            const activeImage = sortedImages.find(
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
        id: academy.id || academy._id.toString(),
        center_name: academy.center_name,
        logo: academy.logo,
        image: image,
        location: academy.location,
        sports: (academy.sports || []).map((sport: any) => ({
          id: sport.custom_id || sport._id?.toString(),
          name: sport.name,
          logo: sport.logo || null,
          is_popular: sport.is_popular || false,
        })),
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
 * Get popular reels sorted by views count
 */
export const getPopularReels = async (limit: number = 6): Promise<PopularReel[]> => {
  try {
    // Use aggregation to get popular reels with active users
    const aggregationPipeline: any[] = [
      {
        $match: {
          status: ReelStatus.APPROVED,
          videoProcessingStatus: VideoProcessingStatus.COMPLETED,
          deletedAt: null,
        },
      },
      // Convert userId to ObjectId if it's stored as string
      {
        $addFields: {
          userIdObjectId: {
            $cond: {
              if: { $eq: [{ $type: '$userId' }, 'string'] },
              then: { $toObjectId: '$userId' },
              else: '$userId',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObjectId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'user.isDeleted': { $ne: true },
          'user.isActive': true,
        },
      },
      // Sort by views count descending
      { $sort: { viewsCount: -1 } },
      { $limit: limit },
    ];

    const reels = await ReelModel.aggregate(aggregationPipeline);

    // Format reels for response
    return reels.map((reel: any) => {
      const user = reel.user || null;

      // Build user name
      const userName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
        : 'Unknown User';

      // User avatar URL (already full URL in database)
      const userAvatar = user?.profileImage || null;

      return {
        id: reel.id,
        videoUrl: reel.masterM3u8Url || '', // Use master playlist URL directly from database
        videoPreviewUrl: reel.previewUrl || '', // Use preview URL directly from database
        thumbnailUrl: reel.thumbnailPath || '', // Use thumbnail URL directly from database
        title: reel.title,
        description: reel.description || null,
        user: {
          name: userName,
          avatar: userAvatar,
        },
        likes: reel.likesCount || 0,
        views: reel.viewsCount || 0,
        comments: reel.commentsCount || 0,
      };
    });
  } catch (error) {
    logger.error('Failed to get popular reels:', error);
    return [];
  }
};

export interface TopCity {
  city: string;
  state: string;
  academyCount: number;
}

/**
 * Get top 10 cities with the most academies
 * Only counts approved, active, non-deleted academies
 */
export const getTopCities = async (limit: number = 10): Promise<TopCity[]> => {
  try {
    const aggregationPipeline: any[] = [
      {
        $match: {
          status: 'published',
          is_active: true,
          is_deleted: false,
          approval_status: 'approved',
          $and: [
            { 'location.address.city': { $exists: true } },
            { 'location.address.city': { $ne: null } },
            { 'location.address.city': { $ne: '' } },
          ],
        },
      },
      {
        $group: {
          _id: {
            city: '$location.address.city',
            state: '$location.address.state',
          },
          academyCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          state: '$_id.state',
          academyCount: 1,
        },
      },
      {
        $sort: { academyCount: -1 },
      },
      {
        $limit: limit,
      },
    ];

    const topCities = await CoachingCenterModel.aggregate(aggregationPipeline);

    return topCities.map((city) => ({
      city: city.city,
      state: city.state || '',
      academyCount: city.academyCount,
    })) as TopCity[];
  } catch (error) {
    logger.error('Failed to get top cities:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Get home page data (nearby academies, popular sports, and popular reels)
 */
export const getHomeData = async (
  userLocation?: { latitude: number; longitude: number },
  userId?: string,
  radius?: number
): Promise<HomeData> => {
  try {
    // Get popular sports, nearby academies, popular reels, and top cities in parallel
    // If any error occurs, it will return empty array instead of throwing
    const [popularSports, nearbyAcademies, popularReels, topCities] = await Promise.all([
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
      getPopularReels(5).catch((error) => {
        logger.error('Error getting popular reels, returning empty array:', error);
        return [];
      }),
      getTopCities(10).catch((error) => {
        logger.error('Error getting top cities, returning empty array:', error);
        return [];
      }),
    ]);

    return {
      nearbyAcademies: nearbyAcademies || [],
      popularSports: popularSports || [],
      popularReels: popularReels || [],
      topCities: topCities || [],
    };
  } catch (error) {
    logger.error('Failed to get home data:', error);
    // Return default structure even on error
    return {
      nearbyAcademies: [],
      popularSports: [],
      popularReels: [],
      topCities: [],
    };
  }
};


