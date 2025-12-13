import { SportModel } from '../models/sport.model';
import { CoachingCenterModel} from '../models/coachingCenter.model';
import { logger } from '../utils/logger';
import { calculateDistances } from '../utils/distance';
import { Types } from 'mongoose';
import { getUserObjectId } from '../utils/userCache';
import { UserModel } from '../models/user.model';
import { config } from '../config/env';
import type { AcademyListItem } from './academy.service';
import { ReelModel, ReelStatus, VideoProcessedStatus } from '../models/reel.model';
import { buildReelUrls, buildS3Url } from './reel.service';

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
  popular_reels: PopularReel[];
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
 * Get popular reels sorted by views count
 */
export const getPopularReels = async (limit: number = 6): Promise<PopularReel[]> => {
  try {
    // Use aggregation to get popular reels with active users
    const aggregationPipeline: any[] = [
      {
        $match: {
          status: ReelStatus.APPROVED,
          videoProcessedStatus: VideoProcessedStatus.DONE,
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

      // Build reel URLs using helper function
      const urls = buildReelUrls({
        masterM3u8Url: reel.masterM3u8Url,
        folderPath: reel.folderPath,
        originalPath: reel.originalPath,
        thumbnailPath: reel.thumbnailPath,
      });

      // Build user name
      const userName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
        : 'Unknown User';

      // Build user avatar URL
      const userAvatar = user && user.profileImage ? buildS3Url(user.profileImage) : null;

      return {
        id: reel.id,
        videoUrl: urls.videoUrl,
        videoPreviewUrl: urls.videoPreviewUrl,
        thumbnailUrl: urls.thumbnailUrl,
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

/**
 * Get home page data (nearby academies, popular sports, and popular reels)
 */
export const getHomeData = async (
  userLocation?: { latitude: number; longitude: number },
  userId?: string,
  radius?: number
): Promise<HomeData> => {
  try {
    // Get popular sports, nearby academies, and popular reels in parallel
    // If any error occurs, it will return empty array instead of throwing
    const [popularSports, nearbyAcademies, popularReels] = await Promise.all([
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
    ]);

    return {
      nearbyAcademies: nearbyAcademies || [],
      popularSports: popularSports || [],
      popular_reels: popularReels || [],
    };
  } catch (error) {
    logger.error('Failed to get home data:', error);
    // Return default structure even on error
    return {
      nearbyAcademies: [],
      popularSports: [],
      popular_reels: [],
    };
  }
};

