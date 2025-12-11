import { CoachingCenterModel } from '../models/coachingCenter.model';
import { BatchModel } from '../models/batch.model';
import { SportModel } from '../models/sport.model';
import { UserModel } from '../models/user.model';
import { CityModel } from '../models/location.model';
import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { t } from '../utils/i18n';
import { config } from '../config/env';
import { calculateDistances } from '../utils/distance';
import { getUserObjectId } from '../utils/userCache';
import { CoachingCenterStatus } from '../enums/coachingCenterStatus.enum';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AcademyListItem {
  _id: string;
  custom_id: string | null; // User's custom ID (academy owner's user ID)
  center_name: string;
  logo?: string | null;
  image?: string | null; // One image from sport_details
  location: {
    latitude: number;
    longitude: number;
    address: {
      line1?: string | null;
      line2: string;
      city: string;
      state: string;
      country?: string | null;
      pincode: string;
    };
  };
  sports: Array<{
    _id: string;
    custom_id: string;
    name: string;
    logo?: string | null;
    is_popular: boolean;
  }>;
  age: {
    min: number;
    max: number;
  };
  allowed_genders: string[];
  distance?: number; // Distance in km (if location provided)
}

export interface AcademyDetail extends AcademyListItem {
  mobile_number?: string | null;
  email?: string | null;
  rules_regulation?: string[] | null;
  sport_details: Array<{
    sport_id: {
      _id: string;
      custom_id: string;
      name: string;
      logo?: string | null;
      is_popular: boolean;
    };
    description: string;
    images: Array<{
      unique_id: string;
      url: string;
      is_active: boolean;
    }>;
    videos: Array<{
      unique_id: string;
      url: string;
      thumbnail?: string | null;
      is_active: boolean;
    }>;
  }>;
  facility: Array<{
    _id: string;
    custom_id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
  }>;
  operational_timing: {
    operating_days: string[];
    opening_time: string;
    closing_time: string;
  };
  allowed_genders: string[];
  allowed_disabled: boolean;
  is_only_for_disabled: boolean;
  batches?: Array<{
    _id: string;
    name: string;
    sport: {
      _id: string;
      custom_id: string;
      name: string;
      logo?: string | null;
    };
    scheduled: {
      start_date: Date;
      start_time: string;
      end_time: string;
      training_days: string[];
    };
    duration: {
      count: number;
      type: string;
    };
    capacity: {
      min: number;
      max?: number | null;
    };
    age: {
      min: number;
      max: number;
    };
    admission_fee?: number | null;
    fee_structure?: {
      fee_type: string;
      fee_configuration: Record<string, any>;
      admission_fee?: number | null;
    } | null;
    status: string;
    is_active: boolean;
  }>;
}

/**
 * Mask email address for privacy
 */
const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***@***';
  const maskedLocal = localPart.length > 2 
    ? `${localPart.substring(0, 2)}***` 
    : '***';
  return `${maskedLocal}@${domain}`;
};

/**
 * Mask mobile number for privacy
 */
const maskMobile = (mobile: string): string => {
  if (mobile.length <= 4) return '****';
  return `${mobile.substring(0, 2)}****${mobile.substring(mobile.length - 2)}`;
};

/**
 * Get all academies with pagination, location-based sorting, and favorite sports preference
 */
export const getAllAcademies = async (
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  userLocation?: { lat: number; lon: number },
  userId?: string,
  radius?: number
): Promise<PaginatedResult<AcademyListItem>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Build base query - only published and active academies
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
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

    // Fetch academies (total count will be calculated after filtering by radius)
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .populate({
        path: 'user',
        select: 'id',
        match: { isDeleted: false },
      })
      .select('center_name logo location sports age allowed_genders sport_details user')
      .lean();

    // Calculate distances if location provided
    if (userLocation && academies.length > 0) {
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

      // Priority 2: Distance (if location provided)
      if (userLocation && (a as any).distance !== undefined && (b as any).distance !== undefined) {
        return (a as any).distance - (b as any).distance;
      }

      // Priority 3: Default sort (by creation date)
      return 0;
    });

    // Update total count after filtering by radius
    const filteredTotal = academies.length;

    // Apply pagination
    const paginatedAcademies = academies.slice(skip, skip + pageSize);

    const totalPages = Math.ceil(filteredTotal / pageSize);

    return {
      data: paginatedAcademies.map((academy: any) => {
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
      }) as AcademyListItem[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: filteredTotal,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to get all academies:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get academy details by user's custom ID
 */
export const getAcademyByUserId = async (
  userCustomId: string,
  isUserLoggedIn: boolean = false
): Promise<AcademyDetail | null> => {
  try {
    // Get user ObjectId from custom ID
    const user = await UserModel.findOne({ id: userCustomId, isDeleted: false })
      .select('_id')
      .lean();

    if (!user) {
      return null;
    }

    // Find coaching center by user ObjectId
    const coachingCenter = await CoachingCenterModel.findOne({
      user: user._id,
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      is_deleted: false,
    })
      .populate('sports', 'custom_id name logo is_popular')
      .populate('sport_details.sport_id', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .lean();

    if (!coachingCenter) {
      return null;
    }

    // Get batches for this coaching center
    const batches = await BatchModel.find({
      center: coachingCenter._id,
      is_active: true,
      is_deleted: false,
    })
      .populate('sport', 'custom_id name logo')
      .select('name sport scheduled duration capacity age admission_fee fee_structure status is_active')
      .lean();

    // Mask email and mobile if user not logged in
    const result: any = {
      ...coachingCenter,
      batches: batches.map((batch) => ({
        ...batch,
        _id: batch._id.toString(),
        sport: batch.sport ? {
          _id: (batch.sport as any)._id?.toString(),
          custom_id: (batch.sport as any).custom_id,
          name: (batch.sport as any).name,
          logo: (batch.sport as any).logo,
        } : null,
      })),
    };

    if (!isUserLoggedIn) {
      result.mobile_number = coachingCenter.mobile_number
        ? maskMobile(coachingCenter.mobile_number)
        : null;
      result.email = coachingCenter.email ? maskEmail(coachingCenter.email) : null;
    }

    return result as AcademyDetail;
  } catch (error) {
    logger.error('Failed to get academy by user ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get academies by city name
 */
export const getAcademiesByCity = async (
  cityName: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): Promise<PaginatedResult<AcademyListItem>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Find city (case-insensitive)
    const city = await CityModel.findOne({
      name: { $regex: new RegExp(`^${cityName}$`, 'i') },
    }).lean();

    if (!city) {
      return {
        data: [],
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    // Build query
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      is_deleted: false,
      'location.address.city': { $regex: new RegExp(`^${cityName}$`, 'i') },
    };

    // Get total count
    const total = await CoachingCenterModel.countDocuments(query);

    // Fetch academies
    const academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .select('center_name logo location sports age')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: academies.map((academy: any) => ({
        _id: academy._id.toString(),
        center_name: academy.center_name,
        logo: academy.logo,
        location: academy.location,
        sports: academy.sports || [],
        age: academy.age,
      })) as AcademyListItem[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to get academies by city:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get academies by sport slug
 */
export const getAcademiesBySport = async (
  sportSlug: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  userLocation?: { lat: number; lon: number },
  radius?: number
): Promise<PaginatedResult<AcademyListItem>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Find sport by slug
    const sport = await SportModel.findOne({
      slug: sportSlug.toLowerCase(),
      is_active: true,
    }).lean();

    if (!sport) {
      return {
        data: [],
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    // Build query - academies that have this sport
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      is_deleted: false,
      sports: sport._id,
    };

    // Fetch academies (total count will be calculated after filtering by radius)
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .populate({
        path: 'user',
        select: 'id',
        match: { isDeleted: false },
      })
      .select('center_name logo location sports age allowed_genders sport_details user')
      .lean();

    // Calculate distances if location provided
    if (userLocation && academies.length > 0) {
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

      // Sort by distance
      academies.sort((a, b) => (a as any).distance - (b as any).distance);
    } else {
      // Sort by creation date (if available) or keep original order
      academies.sort((a: any, b: any) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
    }

    // Update total count after filtering by radius
    const filteredTotal = academies.length;

    // Apply pagination
    const paginatedAcademies = academies.slice(skip, skip + pageSize);

    const totalPages = Math.ceil(filteredTotal / pageSize);

    return {
      data: paginatedAcademies.map((academy: any) => {
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
      }) as AcademyListItem[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: filteredTotal,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to get academies by sport:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

