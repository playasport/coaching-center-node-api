import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BatchModel } from '../../models/batch.model';
import { SportModel } from '../../models/sport.model';
import { UserModel } from '../../models/user.model';
import { CityModel } from '../../models/location.model';
import { Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { t } from '../../utils/i18n';
import { config } from '../../config/env';
import { calculateDistances, getBoundingBox } from '../../utils/distance';
import { getUserObjectId } from '../../utils/userCache';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import { BatchStatus } from '../../enums/batchStatus.enum';

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

export interface PaginatedResultWithSport<T> extends PaginatedResult<T> {
  sport: {
    id: string;
    name: string;
    logo?: string | null;
  };
}

export interface AcademyListItem {
  id: string; // CoachingCenter UUID id field
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
    id: string;
    name: string;
    logo?: string | null;
    is_popular: boolean;
  }>;
  allowed_genders: string[];
  distance?: number; // Distance in km (if location provided)
}

export interface AcademyDetail extends AcademyListItem {
  mobile_number?: string | null;
  email?: string | null;
  rules_regulation?: string[] | null;
  sport_details: Array<{
    sport_id: {
      id: string;
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
    id: string;
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
  experience: number; // Number of years of experience
  batches?: Array<{
    id: string;
    name: string;
    sport: {
      id: string;
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
    description?: string | null;
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
 * Optimized to use database-level filtering and limit records fetched
 */
export const getAllAcademies = async (
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  userLocation?: { latitude: number; longitude: number },
  userId?: string,
  radius?: number
): Promise<PaginatedResult<AcademyListItem>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));

    // Build base query - only published, active, and approved academies
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      approval_status: 'approved', // Only show approved academies to users
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

    // If location is provided, use bounding box to pre-filter records at database level
    // This significantly reduces the number of records we need to process
    if (userLocation) {
      const searchRadius = radius ?? config.location.defaultRadius;
      const bbox = getBoundingBox(userLocation.latitude, userLocation.longitude, searchRadius);
      query['location.latitude'] = { $gte: bbox.minLat, $lte: bbox.maxLat };
      query['location.longitude'] = { $gte: bbox.minLon, $lte: bbox.maxLon };
    }

    // For location-based queries, fetch more records (5x page size) to ensure we have enough
    // for proper sorting after distance calculation. For non-location queries, use a reasonable limit.
    const fetchLimit = userLocation ? Math.min(pageSize * 5, 200) : Math.min(pageSize * 5, 200);

    // Fetch academies with database-level filtering and limit
    // Use lean() for better performance and populate sports
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .select('id center_name logo location sports allowed_genders sport_details createdAt')
      .sort({ createdAt: -1 }) // Default sort by creation date
      .limit(fetchLimit)
      .lean();

    // Calculate distances if location provided (only for fetched records, not all)
    if (userLocation && academies.length > 0) {
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

      // Filter by exact radius
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

    // Get total count efficiently
    let filteredTotal: number;
    if (userLocation) {
      // For location queries, we use bounding box count as approximation
      // Exact count would require calculating distances for all records (too slow)
      // The bounding box count is close enough and much faster
      filteredTotal = await CoachingCenterModel.countDocuments(query);
      
      // If we have fewer filtered results than the count, use the filtered count
      // This handles the case where some records in bounding box are outside exact radius
      if (academies.length < filteredTotal) {
        // We can't know exact count without calculating all distances
        // Use filtered length as minimum, but this might underestimate total
        // For better UX, we'll use the bounding box count (might be slightly overestimated)
        // In practice, the difference is usually small
      }
    } else {
      // For non-location queries, get accurate count
      filteredTotal = await CoachingCenterModel.countDocuments(query);
    }

    // Apply pagination
    const skip = (pageNumber - 1) * pageSize;
    const paginatedAcademies = academies.slice(skip, skip + pageSize);
    const totalPages = Math.ceil(filteredTotal / pageSize);

    return {
      data: paginatedAcademies.map((academy: any) => {
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
 * Get academy by ID - supports multiple ID types:
 * 1. MongoDB ObjectId (_id) - 24 hex characters
 * 2. CoachingCenter UUID (id field) - UUID format
 * 3. User custom ID - searches by user's custom ID
 */
export const getAcademyById = async (
  id: string,
  isUserLoggedIn: boolean = false
): Promise<AcademyDetail | null> => {
  try {
    let coachingCenter = null;

    // Try searching by CoachingCenter id field first (UUID field)
    coachingCenter = await CoachingCenterModel.findOne({
      id: id,
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      approval_status: 'approved', // Only show approved academies to users
      is_deleted: false,
    })
    .select('-user -addedBy -bank_information -documents -reject_reason -is_deleted -deletedAt -approval_status -createdAt -updatedAt')
      .populate('sports', 'custom_id name logo')
      .populate('sport_details.sport_id', 'custom_id name logo')
      .populate('facility', 'custom_id name description icon')
      .lean();

    // If not found by id field, try by ObjectId (if it's a valid ObjectId)
    if (!coachingCenter && Types.ObjectId.isValid(id) && id.length === 24) {
      coachingCenter = await CoachingCenterModel.findOne({
        _id: new Types.ObjectId(id),
        status: CoachingCenterStatus.PUBLISHED,
        is_active: true,
        approval_status: 'approved', // Only show approved academies to users
        is_deleted: false,
      })
      .select('-user -addedBy -bank_information -documents -reject_reason -is_deleted -deletedAt -approval_status -createdAt -updatedAt')
        .populate('sports', 'custom_id name logo')
        .populate('sport_details.sport_id', 'custom_id name logo')
        .populate('facility', 'custom_id name description icon')
        .lean();
    }


    // If still not found, try by user custom ID
    if (!coachingCenter) {
      const user = await UserModel.findOne({ id: id, isDeleted: false })
        .select('_id')
        .lean();

      if (user) {
        coachingCenter = await CoachingCenterModel.findOne({
          user: user._id,
          status: CoachingCenterStatus.PUBLISHED,
          is_active: true,
          approval_status: 'approved', // Only show approved academies to users
          is_deleted: false,
        })
          .populate('sports', 'custom_id name logo is_popular')
          .populate('sport_details.sport_id', 'custom_id name logo is_popular')
          .populate('facility', 'custom_id name description icon')
          .lean();
      }
    }

    if (!coachingCenter) {
      return null;
    }

    // Return 404 if user is deleted
    if (coachingCenter.user && (coachingCenter.user as any).isDeleted) {
      return null;
    }

    // Filter deleted media and sort images so banner images appear first
    if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
      coachingCenter.sport_details = coachingCenter.sport_details.map((sportDetail: any) => {
        const filteredDetail: any = { ...sportDetail };
        
        // Filter and sort images (banner first), then remove internal fields
        if (sportDetail.images && Array.isArray(sportDetail.images)) {
          const activeImages = sportDetail.images.filter((img: any) => !img.is_deleted);
          const sortedImages = activeImages.sort((a: any, b: any) => {
            if (a.is_banner && !b.is_banner) return -1;
            if (!a.is_banner && b.is_banner) return 1;
            return 0;
          });
          // Remove internal fields (is_deleted, is_banner, is_active, deletedAt) from response
          filteredDetail.images = sortedImages.map((img: any) => {
            const { is_deleted, is_banner, is_active, deletedAt, ...imageData } = img;
            return imageData;
          });
        }
        
        // Filter deleted videos and remove is_deleted field
        if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
          const activeVideos = sportDetail.videos.filter((vid: any) => !vid.is_deleted);
          // Remove internal fields (is_deleted, is_active, deletedAt) from response
          filteredDetail.videos = activeVideos.map((vid: any) => {
            const { is_deleted, is_active, deletedAt, ...videoData } = vid;
            return videoData;
          });
        }
        
        return filteredDetail;
      });
    }
    

    // Get batches for this coaching center
    const batches = await BatchModel.find({
      center: coachingCenter._id,
      is_active: true,
      is_deleted: false,
      status: BatchStatus.PUBLISHED,
    })
      .populate('sport', 'custom_id name logo')
      .populate('coach', 'fullName')
      .select('name sport coach scheduled duration capacity age admission_fee base_price discounted_price certificate_issued status is_active is_allowed_disabled gender description')
      .lean();

    // Transform response: remove _id, status, is_active, transform sports, sport_details, facility, and batches
    const { _id, sports, sport_details, facility, status, is_active, ...coachingCenterData } = coachingCenter as any;
    
    const result: any = {
      ...coachingCenterData,
      id: coachingCenter.id || (coachingCenter as any)._id?.toString(),
      sports: (sports || []).map((sport: any) => ({
        id: sport.custom_id || sport._id?.toString(),
        name: sport.name,
        logo: sport.logo || null,
        is_popular: sport.is_popular || false,
      })),
      sport_details: (sport_details || []).map((sportDetail: any) => ({
        ...sportDetail,
        sport_id: sportDetail.sport_id ? {
          id: sportDetail.sport_id.custom_id || sportDetail.sport_id._id?.toString(),
          name: sportDetail.sport_id.name,
          logo: sportDetail.sport_id.logo || null,
          is_popular: sportDetail.sport_id.is_popular || false,
        } : null,
      })),
      facility: (facility || []).map((fac: any) => ({
        id: fac.custom_id || fac._id?.toString(),
        name: fac.name,
        description: fac.description || null,
        icon: fac.icon || null,
      })),
      batches: batches.map((batch) => {
        const { _id: batchId, sport, status, is_active, ...batchData } = batch as any;
        return {
          ...batchData,
          id: batchId.toString(),
          allowed_genders: (batch as any).gender || [],
          sport: sport ? {
            id: (sport as any).custom_id || (sport as any)._id?.toString(),
            name: (sport as any).name,
            logo: (sport as any).logo || null,
          } : null,
          coach: batch.coach ? (batch.coach as any).fullName : null,
        };
      }),
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
      approval_status: 'approved', // Only show approved academies to users
      is_deleted: false,
      'location.address.city': { $regex: new RegExp(`^${cityName}$`, 'i') },
    };

    // Fetch all academies (we'll filter and paginate after filtering deleted users)
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo')
      .select('id center_name logo location sports allowed_genders sport_details')
      .sort({ createdAt: -1 })
      .lean();

    // Get total count after filtering
    const filteredTotal = academies.length;

    // Apply pagination after filtering
    const paginatedAcademies = academies.slice(skip, skip + pageSize);

    const totalPages = Math.ceil(filteredTotal / pageSize);

    return {
      data: paginatedAcademies.map((academy: any) => {
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
                (img: any) => img.is_active && !img.is_deleted && img.url
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
  userLocation?: { latitude: number; longitude: number },
  radius?: number
): Promise<PaginatedResultWithSport<AcademyListItem>> => {
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
        sport: {
          id: '',
          name: '',
          logo: null,
        },
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
      approval_status: 'approved', // Only show approved academies to users
      is_deleted: false,
      sports: sport._id,
    };

    // Fetch academies (total count will be calculated after filtering by radius)
    let academies = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo')
      .select('id center_name logo location sports allowed_genders sport_details')
      .lean();

    // Calculate distances if location provided
    if (userLocation && academies.length > 0) {
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
          sports: (academy.sports || []).map((sportItem: any) => ({
            id: sportItem.custom_id || sportItem._id?.toString(),
            name: sportItem.name,
            logo: sportItem.logo || null,
            is_popular: sportItem.is_popular || false,
          })),
          allowed_genders: academy.allowed_genders || [],
          distance: academy.distance,
        };
      }) as AcademyListItem[],
      sport: {
        id: sport.custom_id,
        name: sport.name,
        logo: sport.logo,
      },
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


