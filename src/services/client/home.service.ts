import { SportModel } from '../../models/sport.model';
import { CoachingCenterModel} from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { calculateDistances, getBoundingBox } from '../../utils/distance';
import { Types } from 'mongoose';
import { getUserObjectId } from '../../utils/userCache';
import { UserModel } from '../../models/user.model';
import { config } from '../../config/env';
import type { AcademyListItem } from './academy.service';
import { ReelModel, ReelStatus } from '../../models/reel.model';
import { VideoProcessingStatus } from '../../models/streamHighlight.model';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import {
  getCachedHomeData,
  cacheHomeData,
  getCachedGlobalHomeData,
  cacheGlobalHomeData,
} from '../../utils/homeDataCache';

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
  recommendedAcademies: AcademyListItem[];
  sportsWiseAcademies: SportWiseAcademy[];
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

    const searchRadius = radius ?? config.location.defaultRadius;

    // Use bounding box to fetch academies in user's geographic area (same as getAllAcademies).
    // Previously we fetched newest N globally by createdAt—academies near the user were often
    // excluded, so nearby returned empty while getAllAcademies showed data.
    const bbox = getBoundingBox(userLocation.latitude, userLocation.longitude, searchRadius);
    query['location.latitude'] = { $gte: bbox.minLat, $lte: bbox.maxLat };
    query['location.longitude'] = { $gte: bbox.minLon, $lte: bbox.maxLon };

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

    // Fetch academies within bounding box; then filter by exact radius after distance calc
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

    return limitedAcademies.map((academy: any) => mapAcademyToListItem(academy)) as AcademyListItem[];
  } catch (error) {
    logger.error('Failed to get nearby academies:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Map raw academy document to AcademyListItem format
 */
const mapAcademyToListItem = (academy: any): AcademyListItem => {
  let image: string | null = null;
  if (academy.sport_details && Array.isArray(academy.sport_details)) {
    for (const sportDetail of academy.sport_details) {
      if (sportDetail.images && Array.isArray(sportDetail.images)) {
        const sortedImages = [...sportDetail.images].sort((a: any, b: any) => {
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
};

/**
 * Get recommended academies based on user location and favorite sports
 * Only returns results when user is logged in with favorite sports and location is provided
 */
export const getRecommendedAcademies = async (
  userLocation: { latitude: number; longitude: number },
  limit: number = 12,
  userId?: string,
  radius?: number
): Promise<AcademyListItem[]> => {
  try {
    if (!userId) return [];

    // Get user's favorite sports
    let favoriteSportIds: Types.ObjectId[] = [];
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

    if (favoriteSportIds.length === 0) return [];

    const searchRadius = radius ?? config.location.defaultRadius;
    const bbox = getBoundingBox(userLocation.latitude, userLocation.longitude, searchRadius);

    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      is_deleted: false,
      approval_status: 'approved',
      sports: { $in: favoriteSportIds },
      'location.latitude': { $gte: bbox.minLat, $lte: bbox.maxLat },
      'location.longitude': { $gte: bbox.minLon, $lte: bbox.maxLon },
    };

    const fetchLimit = Math.min(limit * 10, 500);
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .select('id center_name logo location sports allowed_genders sport_details createdAt user')
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .lean();

    // Filter out academies with deleted users
    if (academies.length > 0) {
      const academyUserIds = academies
        .map((a: any) => a.user)
        .filter((uid: any) => uid && (Types.ObjectId.isValid(uid) || uid._id));

      if (academyUserIds.length > 0) {
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
          const uid = academy.user._id || academy.user;
          const uidStr = uid.toString ? uid.toString() : String(uid);
          return validUserIds.has(uidStr);
        });
      } else {
        academies = [];
      }
    }

    // Calculate distances
    if (academies.length > 0) {
      const destinations = academies.map((academy: any) => ({
        latitude: academy.location.latitude,
        longitude: academy.location.longitude,
      }));

      const distances = await calculateDistances(
        userLocation.latitude,
        userLocation.longitude,
        destinations
      );

      academies = academies.map((academy: any, index: number) => ({
        ...academy,
        distance: distances[index],
      }));

      academies = academies.filter((academy: any) => {
        const distance = academy.distance;
        return distance !== undefined && distance <= searchRadius;
      });
    }

    // Sort: 1) More matching favorite sports first, 2) Then by distance
    academies.sort((a: any, b: any) => {
      const aMatchCount = (a.sports || []).filter((s: any) =>
        favoriteSportIds.some((favId) => favId.toString() === s._id?.toString())
      ).length;
      const bMatchCount = (b.sports || []).filter((s: any) =>
        favoriteSportIds.some((favId) => favId.toString() === s._id?.toString())
      ).length;

      if (bMatchCount !== aMatchCount) return bMatchCount - aMatchCount;

      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    const limitedAcademies = academies.slice(0, limit);
    return limitedAcademies.map(mapAcademyToListItem) as AcademyListItem[];
  } catch (error) {
    logger.error('Failed to get recommended academies:', error);
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

export interface SportWiseAcademy {
  sport: {
    id: string;
    custom_id: string;
    name: string;
    slug: string | null;
    logo: string | null;
    is_popular: boolean;
  };
  academies: AcademyListItem[];
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

const SPORTS_WISE_SPORTS_LIMIT = 5;
const SPORTS_WISE_ACADEMIES_PER_SPORT = 18;

/**
 * Get sports-wise academies: max 18 academies per sport for 5 sports.
 * When user is logged in, favorite sports appear first; otherwise only popular sports.
 * Requires user location.
 */
export const getSportsWiseAcademies = async (
  userLocation: { latitude: number; longitude: number },
  userId?: string,
  radius?: number
): Promise<SportWiseAcademy[]> => {
  try {
    const searchRadius = radius ?? config.location.defaultRadius;
    const bbox = getBoundingBox(userLocation.latitude, userLocation.longitude, searchRadius);

    // Get 5 sports: favorites first when logged in, then fill with popular sports
    let sportIds: Types.ObjectId[] = [];
    const sportIdOrder: Types.ObjectId[] = [];

    if (userId) {
      try {
        const userObjectId = await getUserObjectId(userId);
        if (userObjectId) {
          const user = await UserModel.findById(userObjectId)
            .select('favoriteSports')
            .lean();
          if (user?.favoriteSports && user.favoriteSports.length > 0) {
            const favorites = user.favoriteSports.slice(0, SPORTS_WISE_SPORTS_LIMIT);
            sportIdOrder.push(...favorites);
          }
        }
      } catch (error) {
        logger.warn('Failed to get user favorite sports for sports-wise', { userId, error });
      }
    }

    // Fill remaining slots with popular sports (alphabetical by name)
    if (sportIdOrder.length < SPORTS_WISE_SPORTS_LIMIT) {
      const popularSports = await SportModel.find({
        is_active: true,
        is_popular: true,
        _id: { $nin: sportIdOrder },
      })
        .select('_id')
        .sort({ name: 1 })
        .limit(SPORTS_WISE_SPORTS_LIMIT - sportIdOrder.length)
        .lean();

      sportIdOrder.push(...popularSports.map((s) => s._id));
    }

    // If no userId, use only 5 popular sports (alphabetical by name)
    if (sportIdOrder.length === 0) {
      const popularSports = await SportModel.find({
        is_active: true,
        is_popular: true,
      })
        .select('_id')
        .sort({ name: 1 })
        .limit(SPORTS_WISE_SPORTS_LIMIT)
        .lean();
      sportIdOrder.push(...popularSports.map((s) => s._id));
    }

    // Deduplicate while preserving order (favorites first)
    const seen = new Set<string>();
    const orderedSportIds = sportIdOrder.filter((id) => {
      const str = id.toString();
      if (seen.has(str)) return false;
      seen.add(str);
      return true;
    });
    sportIds = orderedSportIds;

    if (sportIds.length === 0) return [];

    // Fetch sport details for response
    const sportsData = await SportModel.find({ _id: { $in: sportIds } })
      .select('_id custom_id name slug logo is_popular')
      .lean();

    const sportMap = new Map(
      sportsData.map((s) => [
        s._id.toString(),
        {
          id: s._id.toString(),
          custom_id: s.custom_id,
          name: s.name,
          slug: s.slug || null,
          logo: s.logo || null,
          is_popular: s.is_popular || false,
        },
      ])
    );

    // Fetch academies that have any of these sports, within location
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      is_deleted: false,
      approval_status: 'approved',
      sports: { $in: sportIds },
      'location.latitude': { $gte: bbox.minLat, $lte: bbox.maxLat },
      'location.longitude': { $gte: bbox.minLon, $lte: bbox.maxLon },
    };

    const fetchLimit = Math.min(
      SPORTS_WISE_SPORTS_LIMIT * SPORTS_WISE_ACADEMIES_PER_SPORT * 3,
      600
    );
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .select('id center_name logo location sports allowed_genders sport_details createdAt user')
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .lean();

    // Filter out academies with deleted users
    if (academies.length > 0) {
      const academyUserIds = academies
        .map((a: any) => a.user)
        .filter((uid: any) => uid && (Types.ObjectId.isValid(uid) || uid._id));

      if (academyUserIds.length > 0) {
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
          const uid = academy.user._id || academy.user;
          const uidStr = uid.toString ? uid.toString() : String(uid);
          return validUserIds.has(uidStr);
        });
      } else {
        academies = [];
      }
    }

    // Calculate distances
    if (academies.length > 0) {
      const destinations = academies.map((academy: any) => ({
        latitude: academy.location.latitude,
        longitude: academy.location.longitude,
      }));

      const distances = await calculateDistances(
        userLocation.latitude,
        userLocation.longitude,
        destinations
      );

      academies = academies.map((academy: any, index: number) => ({
        ...academy,
        distance: distances[index],
      }));

      academies = academies.filter((academy: any) => {
        const distance = academy.distance;
        return distance !== undefined && distance <= searchRadius;
      });
    }

    // Group by sport (preserving order): each sport gets max 18 academies, sorted by distance
    const result: SportWiseAcademy[] = [];

    for (const sportId of orderedSportIds) {
      const sportIdStr = sportId.toString();
      const sportInfo = sportMap.get(sportIdStr);
      if (!sportInfo) continue;

      const academiesForSport = academies
        .filter((a: any) =>
          (a.sports || []).some((s: any) => s._id?.toString() === sportIdStr)
        )
        .sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, SPORTS_WISE_ACADEMIES_PER_SPORT);

      result.push({
        sport: sportInfo,
        academies: academiesForSport.map(mapAcademyToListItem) as AcademyListItem[],
      });
    }

    return result;
  } catch (error) {
    logger.error('Failed to get sports-wise academies:', error);
    return [];
  }
};

/**
 * Get home page data (nearby academies, recommended academies, popular sports, and popular reels)
 * Uses Redis cache (5 min TTL) when same user + same location to avoid repeated DB calls
 */
export const getHomeData = async (
  userLocation?: { latitude: number; longitude: number },
  userId?: string,
  radius?: number
): Promise<HomeData> => {
  try {
    // Check cache first - skip DB when same user + same location (coordinates rounded to ~111m)
    const cached = await getCachedHomeData({
      userId,
      userLocation,
      radius,
    });
    if (cached) {
      return cached as HomeData;
    }

    // Try global cache (popularSports, popularReels, topCities) - reduces DB load on cache misses
    let popularSports: PopularSport[];
    let popularReels: PopularReel[];
    let topCities: TopCity[];
    const globalCached = await getCachedGlobalHomeData();

    if (globalCached) {
      popularSports = globalCached.popularSports;
      popularReels = globalCached.popularReels;
      topCities = globalCached.topCities;
    } else {
      const [sports, reels, cities] = await Promise.all([
        getPopularSports(8).catch((error) => {
          logger.error('Error getting popular sports, returning empty array:', error);
          return [];
        }),
        getPopularReels(5).catch((error) => {
          logger.error('Error getting popular reels, returning empty array:', error);
          return [];
        }),
        getTopCities(10).catch((error) => {
          logger.error('Error getting top cities, returning empty array:', error);
          return [];
        }),
      ]);
      popularSports = sports;
      popularReels = reels;
      topCities = cities;
      cacheGlobalHomeData({ popularSports, popularReels, topCities }).catch(() => {});
    }

    // Fetch location-dependent data in parallel
    const [nearbyAcademies, recommendedAcademies, sportsWiseAcademies] = await Promise.all([
      userLocation
        ? getNearbyAcademies(userLocation, 12, userId, radius).catch((error) => {
            logger.error('Error getting nearby academies, returning empty array:', error);
            return [];
          })
        : Promise.resolve([]),
      userLocation && userId
        ? getRecommendedAcademies(userLocation, 12, userId, radius).catch((error) => {
            logger.error('Error getting recommended academies, returning empty array:', error);
            return [];
          })
        : Promise.resolve([]),
      userLocation
        ? getSportsWiseAcademies(userLocation, userId, radius).catch((error) => {
            logger.error('Error getting sports-wise academies, returning empty array:', error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    const homeData: HomeData = {
      nearbyAcademies: nearbyAcademies || [],
      recommendedAcademies: recommendedAcademies || [],
      sportsWiseAcademies: sportsWiseAcademies || [],
      popularSports: popularSports || [],
      popularReels: popularReels || [],
      topCities: topCities || [],
    };

    // Cache for future requests (non-blocking)
    cacheHomeData({ userId, userLocation, radius }, homeData).catch((cacheError) => {
      logger.warn('Failed to cache home data (non-blocking)', { error: cacheError });
    });

    return homeData;
  } catch (error) {
    logger.error('Failed to get home data:', error);
    // Return default structure even on error
    return {
      nearbyAcademies: [],
      recommendedAcademies: [],
      sportsWiseAcademies: [],
      popularSports: [],
      popularReels: [],
      topCities: [],
    };
  }
};


