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
import { calculateDistances, getBoundingBox, calculateHaversineDistance } from '../../utils/distance';
import { getUserObjectId } from '../../utils/userCache';
import { getLatestRatingsForCenter } from './coachingCenterRating.service';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import { BatchStatus } from '../../enums/batchStatus.enum';
import {
  getCachedAcademyList,
  cacheAcademyList,
  type AcademyListCacheParams,
} from '../../utils/homeDataCache';

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
  age?: { min: number; max: number }; // Age range (years) the academy accepts
  allowed_disabled?: boolean; // Academy allows persons with disability
  is_only_for_disabled?: boolean; // Academy is only for persons with disability
  distance?: number; // Distance in km (if location provided)
  averageRating?: number; // Average rating 0-5
  totalRatings?: number; // Number of ratings
}

/** Single rating item as returned in academy detail (latest 5). */
export interface AcademyRatingItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    profileImage?: string | null;
  } | null;
}

export interface AcademyDetail extends AcademyListItem {
  mobile_number?: string | null;
  email?: string | null;
  rules_regulation?: string[] | null;
  /** Latest 5 ratings; if user is logged in and has rated, their rating appears first */
  ratings: AcademyRatingItem[];
  /** Whether the current user has already rated this center (only when logged in) */
  isAlreadyRated: boolean;
  /** Whether the current user can update their rating (true if they have rated; only when logged in) */
  canUpdateRating: boolean;
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

/** Filter options for get all academies (same as search API) */
export interface GetAllAcademiesFilters {
  city?: string;
  state?: string;
  sportId?: string;
  sportIds?: string;
  gender?: string;
  forDisabled?: boolean;
  minAge?: number;
  maxAge?: number;
}

/**
 * Get all academies with pagination, location-based sorting, and favorite sports preference
 * Optimized to use database-level filtering and limit records fetched.
 * Supports same filters as search API: city, state, sportId, sportIds, gender, for_disabled, min_age, max_age.
 */
export const getAllAcademies = async (
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  userLocation?: { latitude: number; longitude: number },
  userId?: string,
  radius?: number,
  filters: GetAllAcademiesFilters = {}
): Promise<PaginatedResult<AcademyListItem>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));

    // Check cache first
    const cacheParams: AcademyListCacheParams = {
      page: pageNumber,
      limit: pageSize,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      radius,
      userId,
      ...filters,
    };
    const cached = await getCachedAcademyList(cacheParams);
    if (cached) return cached as PaginatedResult<AcademyListItem>;

    const {
      city: filterCity,
      state: filterState,
      sportId: filterSportId,
      sportIds: filterSportIds,
      gender: filterGender,
      forDisabled: filterForDisabled,
      minAge: filterMinAge,
      maxAge: filterMaxAge,
    } = filters;

    // Build base query - only published, active, and approved academies
    const query: any = {
      status: CoachingCenterStatus.PUBLISHED,
      is_active: true,
      approval_status: 'approved', // Only show approved academies to users
      is_deleted: false,
    };

    // Apply filters: city, state, sportId/sportIds, gender, forDisabled, age range
    if (filterCity && filterCity.trim()) {
      query['location.address.city'] = new RegExp(filterCity.trim(), 'i');
    }
    if (filterState && filterState.trim()) {
      query['location.address.state'] = new RegExp(filterState.trim(), 'i');
    }
    if (filterGender && filterGender.trim()) {
      const g = filterGender.trim().toLowerCase();
      if (['male', 'female', 'other'].includes(g)) {
        query.allowed_genders = g;
      }
    }
    if (filterForDisabled === true) {
      query.allowed_disabled = true;
    }
    if (filterMinAge != null && !Number.isNaN(filterMinAge) && filterMaxAge != null && !Number.isNaN(filterMaxAge)) {
      query['age.max'] = { $gte: filterMinAge };
      query['age.min'] = { $lte: filterMaxAge };
    } else if (filterMinAge != null && !Number.isNaN(filterMinAge)) {
      query['age.max'] = { $gte: filterMinAge };
    } else if (filterMaxAge != null && !Number.isNaN(filterMaxAge)) {
      query['age.min'] = { $lte: filterMaxAge };
    }
    const sportIdStrings: string[] = [];
    if (filterSportId && filterSportId.trim()) sportIdStrings.push(filterSportId.trim());
    if (filterSportIds && filterSportIds.trim()) {
      sportIdStrings.push(...filterSportIds.split(',').map((s) => s.trim()).filter(Boolean));
    }
    /** When sport filter is applied: use for image (that sport's banner first) and put that sport first in sports list */
    let filterSportObjectIds: Types.ObjectId[] = [];
    if (sportIdStrings.length > 0) {
      const validObjectIds = sportIdStrings
        .filter((id) => Types.ObjectId.isValid(id) && String(id).length === 24)
        .map((id) => new Types.ObjectId(id));
      const byObjectId = validObjectIds.length > 0
        ? await SportModel.find({ _id: { $in: validObjectIds }, is_active: true }).select('_id').lean()
        : [];
      const byCustomId = await SportModel.find({
        custom_id: { $in: sportIdStrings },
        is_active: true,
      })
        .select('_id')
        .lean();
      const ids = [...new Set([...byObjectId.map((s: any) => s._id), ...byCustomId.map((s: any) => s._id)])];
      if (ids.length > 0) {
        query.sports = { $in: ids };
        filterSportObjectIds = ids;
      }
    }

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

    // When city or state filter is applied, skip location filter (lat/long/radius)
    const useLocationFilter = userLocation && !filterCity && !filterState;

    // If location is provided (and no city/state filter), use bounding box to pre-filter records at database level
    if (useLocationFilter) {
      const searchRadius = radius ?? config.location.defaultRadius;
      const bbox = getBoundingBox(userLocation!.latitude, userLocation!.longitude, searchRadius);
      query['location.latitude'] = { $gte: bbox.minLat, $lte: bbox.maxLat };
      query['location.longitude'] = { $gte: bbox.minLon, $lte: bbox.maxLon };
    }

    // For location-based queries, fetch ALL records in the bounding box so we can
    // sort by distance and paginate correctly. The bounding box already limits the
    // geographic area so the result set is bounded. For non-location queries, use a
    // reasonable limit based on page size.
    const fetchLimit = useLocationFilter ? 0 : Math.min(pageSize * 5, 200);

    // Fetch academies with database-level filtering
    const academyQuery = CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .select('id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings createdAt')
      .sort({ createdAt: -1 });

    if (fetchLimit > 0) {
      academyQuery.limit(fetchLimit);
    }

    let academies = await academyQuery.lean();

    // Calculate distances if location provided and not skipped by city/state filter
    if (useLocationFilter && academies.length > 0) {
      const destinations = academies.map((academy) => ({
        latitude: academy.location.latitude,
        longitude: academy.location.longitude,
      }));

      const distances = await calculateDistances(
        userLocation!.latitude,
        userLocation!.longitude,
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

      // Priority 2: Distance (if location provided and not skipped by city/state filter)
      if (useLocationFilter && (a as any).distance !== undefined && (b as any).distance !== undefined) {
        return (a as any).distance - (b as any).distance;
      }

      // Priority 3: Default sort (by creation date)
      return 0;
    });

    // Get total count
    let filteredTotal: number;
    if (useLocationFilter) {
      // We already fetched all records in bounding box and filtered by exact radius,
      // so academies.length is the accurate count
      filteredTotal = academies.length;
    } else {
      filteredTotal = await CoachingCenterModel.countDocuments(query);
    }

    // Apply pagination
    const skip = (pageNumber - 1) * pageSize;
    const paginatedAcademies = academies.slice(skip, skip + pageSize);
    const totalPages = Math.ceil(filteredTotal / pageSize);

    const filterSportIdSet = new Set(filterSportObjectIds.map((id) => id.toString()));

    const result: PaginatedResult<AcademyListItem> = {
      data: paginatedAcademies.map((academy: any) => {
        let image: string | null = null;
        if (academy.sport_details && Array.isArray(academy.sport_details)) {
          if (filterSportIdSet.size > 0) {
            const matchedDetail = academy.sport_details.find(
              (sd: any) => filterSportIdSet.has((sd.sport_id?._id || sd.sport_id)?.toString())
            );
            if (matchedDetail?.images && Array.isArray(matchedDetail.images)) {
              const sortedImages = [...matchedDetail.images].sort((a: any, b: any) => {
                if (a.is_banner && !b.is_banner) return -1;
                if (!a.is_banner && b.is_banner) return 1;
                return 0;
              });
              const activeImage = sortedImages.find(
                (img: any) => img.is_active && !img.is_deleted
              );
              if (activeImage) image = activeImage.url;
            }
          }
          if (!image) {
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
        }

        // Sports list: when sport filter applied, put filtered sport(s) first
        let sportsList = (academy.sports || []).map((sport: any) => ({
          id: sport.custom_id || sport._id?.toString(),
          name: sport.name,
          logo: sport.logo || null,
          is_popular: sport.is_popular || false,
          _oid: sport._id?.toString(),
        }));
        if (filterSportIdSet.size > 0 && sportsList.length > 1) {
          sportsList = [...sportsList].sort((a: any, b: any) => {
            const aMatch = filterSportIdSet.has(a._oid);
            const bMatch = filterSportIdSet.has(b._oid);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
          });
        }
        sportsList = sportsList.map((s: any) => ({
          id: s.id,
          name: s.name,
          logo: s.logo ?? null,
          is_popular: s.is_popular ?? false,
        }));

        return {
          id: academy.id || academy._id.toString(),
          center_name: academy.center_name,
          logo: academy.logo,
          image: image,
          location: academy.location,
          sports: sportsList,
          allowed_genders: academy.allowed_genders || [],
          age: academy.age ? { min: academy.age.min, max: academy.age.max } : undefined,
          allowed_disabled: academy.allowed_disabled === true,
          is_only_for_disabled: academy.is_only_for_disabled === true,
          distance: academy.distance,
          averageRating: (academy as any).averageRating ?? 0,
          totalRatings: (academy as any).totalRatings ?? 0,
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

    // Cache the result (non-blocking)
    cacheAcademyList(cacheParams, result).catch(() => {});

    return result;
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
 * When userId is provided, response includes latest 5 ratings with that user's rating first (if any), and isAlreadyRated/canUpdateRating.
 * When userLocation is provided, returns distance in km from user to academy.
 */
export const getAcademyById = async (
  id: string,
  isUserLoggedIn: boolean = false,
  userId?: string | null,
  userLocation?: { latitude: number; longitude: number }
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
    

    // Get batches and latest 5 ratings (with current user's rating first if logged in)
    const centerIdForRatings = coachingCenter.id || (coachingCenter as any)._id?.toString();
    const [batches, ratingData] = await Promise.all([
      BatchModel.find({
        center: coachingCenter._id,
        is_active: true,
        is_deleted: false,
        status: BatchStatus.PUBLISHED,
      })
        .populate('sport', 'custom_id name logo')
        .populate('coach', 'fullName')
        .select('name sport coach scheduled duration capacity age admission_fee base_price discounted_price certificate_issued status is_active is_allowed_disabled gender description')
        .lean(),
      getLatestRatingsForCenter(centerIdForRatings, 5, userId),
    ]);

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
      ratings: ratingData.ratings,
      averageRating: ratingData.averageRating,
      totalRatings: ratingData.totalRatings,
      isAlreadyRated: ratingData.isAlreadyRated,
      canUpdateRating: ratingData.canUpdateRating,
    };

    if (!isUserLoggedIn) {
      result.mobile_number = coachingCenter.mobile_number
        ? maskMobile(coachingCenter.mobile_number)
        : null;
      result.email = coachingCenter.email ? maskEmail(coachingCenter.email) : null;
    }

    // Add distance when user location provided and academy has location
    if (userLocation) {
      const loc = (coachingCenter as any).location;
      const acLat = loc?.latitude ?? loc?.lat;
      const acLon = loc?.longitude ?? loc?.long;
      if (
        acLat != null &&
        acLon != null &&
        typeof acLat === 'number' &&
        typeof acLon === 'number'
      ) {
        result.distance = Math.round(
          calculateHaversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            acLat,
            acLon
          ) * 100
        ) / 100;
      }
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
      .select('id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings')
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
          age: academy.age ? { min: academy.age.min, max: academy.age.max } : undefined,
          allowed_disabled: academy.allowed_disabled === true,
          is_only_for_disabled: academy.is_only_for_disabled === true,
          averageRating: (academy as any).averageRating ?? 0,
          totalRatings: (academy as any).totalRatings ?? 0,
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
      .select('id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings')
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

    const searchedSportIdStr = sport._id.toString();

    return {
      data: paginatedAcademies.map((academy: any) => {
        // Get image from the sport_detail of the searched sport only, prioritizing banner
        let image: string | null = null;
        if (academy.sport_details && Array.isArray(academy.sport_details)) {
          const searchedSportDetail = academy.sport_details.find(
            (sd: any) => (sd.sport_id?._id || sd.sport_id)?.toString() === searchedSportIdStr
          );
          if (searchedSportDetail?.images && Array.isArray(searchedSportDetail.images)) {
            const sortedImages = [...searchedSportDetail.images].sort((a, b) => {
              if (a.is_banner && !b.is_banner) return -1;
              if (!a.is_banner && b.is_banner) return 1;
              return 0;
            });
            const activeImage = sortedImages.find(
              (img: any) => img.is_active && !img.is_deleted
            );
            if (activeImage) image = activeImage.url;
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
          age: academy.age ? { min: academy.age.min, max: academy.age.max } : undefined,
          allowed_disabled: academy.allowed_disabled === true,
          is_only_for_disabled: academy.is_only_for_disabled === true,
          distance: academy.distance,
          averageRating: (academy as any).averageRating ?? 0,
          totalRatings: (academy as any).totalRatings ?? 0,
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


