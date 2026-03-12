"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademiesBySport = exports.getAcademiesByCity = exports.getAcademyById = exports.getAllAcademies = void 0;
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const batch_model_1 = require("../../models/batch.model");
const sport_model_1 = require("../../models/sport.model");
const user_model_1 = require("../../models/user.model");
const location_model_1 = require("../../models/location.model");
const mongoose_1 = require("mongoose");
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
const i18n_1 = require("../../utils/i18n");
const env_1 = require("../../config/env");
const distance_1 = require("../../utils/distance");
const geoNearAcademies_service_1 = require("../common/geoNearAcademies.service");
const userCache_1 = require("../../utils/userCache");
const coachingCenterRating_service_1 = require("./coachingCenterRating.service");
const userAcademyBookmark_model_1 = require("../../models/userAcademyBookmark.model");
const coachingCenterStatus_enum_1 = require("../../enums/coachingCenterStatus.enum");
const batchStatus_enum_1 = require("../../enums/batchStatus.enum");
const homeDataCache_1 = require("../../utils/homeDataCache");
const slugify = (text) => {
    if (!text)
        return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};
/**
 * Mask email address for privacy
 */
const maskEmail = (email) => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain)
        return '***@***';
    const maskedLocal = localPart.length > 2
        ? `${localPart.substring(0, 2)}***`
        : '***';
    return `${maskedLocal}@${domain}`;
};
/**
 * Mask mobile number for privacy
 */
const maskMobile = (mobile) => {
    if (mobile.length <= 4)
        return '****';
    return `${mobile.substring(0, 2)}****${mobile.substring(mobile.length - 2)}`;
};
/**
 * Get all academies with pagination, location-based sorting, and favorite sports preference
 * Optimized to use database-level filtering and limit records fetched.
 * Supports same filters as search API: city, state, sportId, sportIds, gender, for_disabled, min_age, max_age.
 */
const getAllAcademies = async (page = 1, limit = env_1.config.pagination.defaultLimit, userLocation, userId, radius, filters = {}) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        // Check cache first
        const cacheParams = {
            page: pageNumber,
            limit: pageSize,
            latitude: userLocation?.latitude,
            longitude: userLocation?.longitude,
            radius,
            userId,
            ...filters,
        };
        const cached = await (0, homeDataCache_1.getCachedAcademyList)(cacheParams);
        if (cached)
            return cached;
        const { city: filterCity, state: filterState, sportId: filterSportId, sportIds: filterSportIds, gender: filterGender, forDisabled: filterForDisabled, minAge: filterMinAge, maxAge: filterMaxAge, minRating: filterMinRating, } = filters;
        // Build base query - only published, active, and approved academies
        const query = {
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
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
        }
        else if (filterMinAge != null && !Number.isNaN(filterMinAge)) {
            query['age.max'] = { $gte: filterMinAge };
        }
        else if (filterMaxAge != null && !Number.isNaN(filterMaxAge)) {
            query['age.min'] = { $lte: filterMaxAge };
        }
        if (filterMinRating != null && !Number.isNaN(filterMinRating) && filterMinRating > 0) {
            query.averageRating = { $gte: Math.min(filterMinRating, 5) };
        }
        const sportIdStrings = [];
        if (filterSportId && filterSportId.trim())
            sportIdStrings.push(filterSportId.trim());
        if (filterSportIds && filterSportIds.trim()) {
            sportIdStrings.push(...filterSportIds.split(',').map((s) => s.trim()).filter(Boolean));
        }
        /** When sport filter is applied: use for image (that sport's banner first) and put that sport first in sports list */
        let filterSportObjectIds = [];
        if (sportIdStrings.length > 0) {
            const validObjectIds = sportIdStrings
                .filter((id) => mongoose_1.Types.ObjectId.isValid(id) && String(id).length === 24)
                .map((id) => new mongoose_1.Types.ObjectId(id));
            const byObjectId = validObjectIds.length > 0
                ? await sport_model_1.SportModel.find({ _id: { $in: validObjectIds }, is_active: true }).select('_id').lean()
                : [];
            const byCustomId = await sport_model_1.SportModel.find({
                custom_id: { $in: sportIdStrings },
                is_active: true,
            })
                .select('_id')
                .lean();
            const ids = [...new Set([...byObjectId.map((s) => s._id), ...byCustomId.map((s) => s._id)])];
            if (ids.length > 0) {
                query.sports = { $in: ids };
                filterSportObjectIds = ids;
            }
        }
        // Get user's favorite sports if logged in
        let favoriteSportIds = [];
        if (userId) {
            try {
                const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
                if (userObjectId) {
                    const user = await user_model_1.UserModel.findById(userObjectId)
                        .select('favoriteSports')
                        .lean();
                    if (user?.favoriteSports && user.favoriteSports.length > 0) {
                        favoriteSportIds = user.favoriteSports;
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn('Failed to get user favorite sports', { userId, error });
            }
        }
        // When city or state filter is applied, skip location filter (lat/long/radius)
        const useLocationFilter = userLocation && !filterCity && !filterState;
        const searchRadius = radius ?? env_1.config.location.defaultRadius;
        let academies = [];
        if (useLocationFilter) {
            // Try geoNear + road distance first (Redis cache → $geoNear → Google road distance)
            const geoExtraQuery = {
                status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
                is_active: true,
                is_deleted: false,
                approval_status: 'approved',
            };
            if (query['location.address.city'])
                geoExtraQuery['location.address.city'] = query['location.address.city'];
            if (query['location.address.state'])
                geoExtraQuery['location.address.state'] = query['location.address.state'];
            if (query.allowed_genders)
                geoExtraQuery.allowed_genders = query.allowed_genders;
            if (query.allowed_disabled)
                geoExtraQuery.allowed_disabled = query.allowed_disabled;
            if (query['age.max'])
                geoExtraQuery['age.max'] = query['age.max'];
            if (query['age.min'])
                geoExtraQuery['age.min'] = query['age.min'];
            if (query.averageRating)
                geoExtraQuery.averageRating = query.averageRating;
            if (query.sports)
                geoExtraQuery.sports = query.sports;
            const geoResults = await (0, geoNearAcademies_service_1.getNearbyAcademiesWithRoadDistance)(userLocation, {
                maxRadiusKm: searchRadius,
                limit: 200,
                extraQuery: geoExtraQuery,
            });
            if (geoResults.length > 0) {
                academies = geoResults.map((r) => ({ ...r.academy, distance: r.roadDistanceKm }));
            }
        }
        // Fallback to bounding box when geoNear returns nothing
        if (!useLocationFilter || academies.length === 0) {
            if (useLocationFilter) {
                const bbox = (0, distance_1.getBoundingBox)(userLocation.latitude, userLocation.longitude, searchRadius);
                query['location.latitude'] = { $gte: bbox.minLat, $lte: bbox.maxLat };
                query['location.longitude'] = { $gte: bbox.minLon, $lte: bbox.maxLon };
            }
            const fetchLimit = useLocationFilter ? 0 : Math.min(pageSize * 5, 200);
            const academyQuery = coachingCenter_model_1.CoachingCenterModel.find(query)
                .populate('sports', 'custom_id name logo is_popular')
                .select('id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings createdAt')
                .sort({ createdAt: -1 });
            if (fetchLimit > 0)
                academyQuery.limit(fetchLimit);
            academies = await academyQuery.lean();
            if (useLocationFilter && academies.length > 0) {
                const destinations = academies.map((a) => ({
                    latitude: a.location.latitude,
                    longitude: a.location.longitude,
                }));
                const distances = await (0, distance_1.calculateDistances)(userLocation.latitude, userLocation.longitude, destinations);
                academies = academies.map((a, i) => ({ ...a, distance: distances[i] }));
                academies = academies.filter((a) => a.distance !== undefined && a.distance <= searchRadius);
            }
        }
        // Sort academies
        const genderFilterActive = filterGender && ['male', 'female', 'other'].includes(filterGender.trim().toLowerCase());
        const normalizedGender = genderFilterActive ? filterGender.trim().toLowerCase() : null;
        academies.sort((a, b) => {
            // Priority 1: Gender exclusivity — exclusive match (e.g. female-only) before mixed
            if (normalizedGender) {
                const aExclusive = a.allowed_genders?.length === 1 && a.allowed_genders[0] === normalizedGender;
                const bExclusive = b.allowed_genders?.length === 1 && b.allowed_genders[0] === normalizedGender;
                if (aExclusive && !bExclusive)
                    return -1;
                if (!aExclusive && bExclusive)
                    return 1;
            }
            // Priority 2: Favorite sports (if user logged in and has favorites)
            if (favoriteSportIds.length > 0) {
                const aHasFavorite = a.sports?.some((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString()));
                const bHasFavorite = b.sports?.some((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString()));
                if (aHasFavorite && !bHasFavorite)
                    return -1;
                if (!aHasFavorite && bHasFavorite)
                    return 1;
            }
            // Priority 3: Distance (if location provided and not skipped by city/state filter)
            if (useLocationFilter && a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance;
            }
            // Priority 4: Default sort (by creation date)
            return 0;
        });
        // Get total count
        let filteredTotal;
        if (useLocationFilter) {
            // We already fetched all records in bounding box and filtered by exact radius,
            // so academies.length is the accurate count
            filteredTotal = academies.length;
        }
        else {
            filteredTotal = await coachingCenter_model_1.CoachingCenterModel.countDocuments(query);
        }
        // Apply pagination
        const skip = (pageNumber - 1) * pageSize;
        const paginatedAcademies = academies.slice(skip, skip + pageSize);
        const totalPages = Math.ceil(filteredTotal / pageSize);
        const filterSportIdSet = new Set(filterSportObjectIds.map((id) => id.toString()));
        // Batch-check bookmarks for paginated academies when user is logged in
        const bookmarkedIdSet = new Set();
        if (userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
            if (userObjectId) {
                const centerObjectIds = paginatedAcademies.map((a) => a._id);
                const bookmarks = await userAcademyBookmark_model_1.UserAcademyBookmarkModel.find({
                    user: userObjectId,
                    academy: { $in: centerObjectIds },
                }).select('academy').lean();
                bookmarks.forEach((b) => bookmarkedIdSet.add(b.academy.toString()));
            }
        }
        const result = {
            data: paginatedAcademies.map((academy) => {
                let image = null;
                if (academy.sport_details && Array.isArray(academy.sport_details)) {
                    if (filterSportIdSet.size > 0) {
                        const matchedDetail = academy.sport_details.find((sd) => filterSportIdSet.has((sd.sport_id?._id || sd.sport_id)?.toString()));
                        if (matchedDetail?.images && Array.isArray(matchedDetail.images)) {
                            const sortedImages = [...matchedDetail.images].sort((a, b) => {
                                if (a.is_banner && !b.is_banner)
                                    return -1;
                                if (!a.is_banner && b.is_banner)
                                    return 1;
                                return 0;
                            });
                            const activeImage = sortedImages.find((img) => img.is_active && !img.is_deleted);
                            if (activeImage)
                                image = activeImage.url;
                        }
                    }
                    if (!image) {
                        for (const sportDetail of academy.sport_details) {
                            if (sportDetail.images && Array.isArray(sportDetail.images)) {
                                const activeImage = sportDetail.images.find((img) => img.is_active && !img.is_deleted);
                                if (activeImage) {
                                    image = activeImage.url;
                                    break;
                                }
                            }
                        }
                    }
                }
                // Sports list: when sport filter applied, put filtered sport(s) first
                let sportsList = (academy.sports || []).map((sport) => ({
                    id: sport.custom_id || sport._id?.toString(),
                    name: sport.name,
                    logo: sport.logo || null,
                    is_popular: sport.is_popular || false,
                    _oid: sport._id?.toString(),
                }));
                if (filterSportIdSet.size > 0 && sportsList.length > 1) {
                    sportsList = [...sportsList].sort((a, b) => {
                        const aMatch = filterSportIdSet.has(a._oid);
                        const bMatch = filterSportIdSet.has(b._oid);
                        if (aMatch && !bMatch)
                            return -1;
                        if (!aMatch && bMatch)
                            return 1;
                        return 0;
                    });
                }
                sportsList = sportsList.map((s) => ({
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
                    averageRating: academy.averageRating ?? 0,
                    totalRatings: academy.totalRatings ?? 0,
                    isBookmarked: bookmarkedIdSet.has(academy._id.toString()),
                };
            }),
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
        (0, homeDataCache_1.cacheAcademyList)(cacheParams, result).catch(() => { });
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to get all academies:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllAcademies = getAllAcademies;
/**
 * Get academy by ID - supports multiple ID types:
 * 1. MongoDB ObjectId (_id) - 24 hex characters
 * 2. CoachingCenter UUID (id field) - UUID format
 * 3. User custom ID - searches by user's custom ID
 * When userId is provided, response includes latest 5 ratings with that user's rating first (if any), and isAlreadyRated/canUpdateRating.
 * When userLocation is provided, returns distance in km from user to academy.
 */
const getAcademyById = async (id, isUserLoggedIn = false, userId, userLocation) => {
    try {
        let coachingCenter = null;
        // Try searching by CoachingCenter id field first (UUID field)
        coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne({
            id: id,
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
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
        if (!coachingCenter && mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne({
                _id: new mongoose_1.Types.ObjectId(id),
                status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
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
            const user = await user_model_1.UserModel.findOne({ id: id, isDeleted: false })
                .select('_id')
                .lean();
            if (user) {
                coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne({
                    user: user._id,
                    status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
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
        if (coachingCenter.user && coachingCenter.user.isDeleted) {
            return null;
        }
        // Filter deleted media and sort images so banner images appear first
        if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
            coachingCenter.sport_details = coachingCenter.sport_details.map((sportDetail) => {
                const filteredDetail = { ...sportDetail };
                // Filter and sort images (banner first), then remove internal fields
                if (sportDetail.images && Array.isArray(sportDetail.images)) {
                    const activeImages = sportDetail.images.filter((img) => !img.is_deleted);
                    const sortedImages = activeImages.sort((a, b) => {
                        if (a.is_banner && !b.is_banner)
                            return -1;
                        if (!a.is_banner && b.is_banner)
                            return 1;
                        return 0;
                    });
                    // Remove internal fields (is_deleted, is_banner, is_active, deletedAt) from response
                    filteredDetail.images = sortedImages.map((img) => {
                        const { is_deleted, is_banner, is_active, deletedAt, ...imageData } = img;
                        return imageData;
                    });
                }
                // Filter deleted videos and remove is_deleted field
                if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                    const activeVideos = sportDetail.videos.filter((vid) => !vid.is_deleted);
                    // Remove internal fields (is_deleted, is_active, deletedAt) from response
                    filteredDetail.videos = activeVideos.map((vid) => {
                        const { is_deleted, is_active, deletedAt, ...videoData } = vid;
                        return videoData;
                    });
                }
                return filteredDetail;
            });
        }
        // Get batches, latest 5 ratings, and bookmark status in parallel
        const centerIdForRatings = coachingCenter.id || coachingCenter._id?.toString();
        const bookmarkCheckPromise = userId
            ? (0, userCache_1.getUserObjectId)(userId).then((userObjId) => userObjId
                ? userAcademyBookmark_model_1.UserAcademyBookmarkModel.exists({ user: userObjId, academy: coachingCenter._id })
                : null)
            : Promise.resolve(null);
        const [batches, ratingData, bookmarkDoc] = await Promise.all([
            batch_model_1.BatchModel.find({
                center: coachingCenter._id,
                is_active: true,
                is_deleted: false,
                status: batchStatus_enum_1.BatchStatus.PUBLISHED,
            })
                .populate('sport', 'custom_id name logo')
                .populate('coach', 'fullName')
                .select('name sport coach scheduled duration capacity age admission_fee base_price discounted_price certificate_issued status is_active is_allowed_disabled gender description')
                .lean(),
            (0, coachingCenterRating_service_1.getLatestRatingsForCenter)(centerIdForRatings, 5, userId),
            bookmarkCheckPromise,
        ]);
        // Transform response: remove _id, status, is_active, transform sports, sport_details, facility, and batches
        const { _id, sports, sport_details, facility, status, is_active, ...coachingCenterData } = coachingCenter;
        const academyId = coachingCenter.id || coachingCenter._id?.toString();
        const slug = slugify(coachingCenterData.center_name);
        const baseUrl = env_1.config.mainSiteUrl;
        const result = {
            ...coachingCenterData,
            id: academyId,
            share_url: `${baseUrl}/academies/${academyId}/${slug}`,
            sports: (sports || []).map((sport) => ({
                id: sport.custom_id || sport._id?.toString(),
                name: sport.name,
                logo: sport.logo || null,
                is_popular: sport.is_popular || false,
            })),
            sport_details: (sport_details || []).map((sportDetail) => ({
                ...sportDetail,
                sport_id: sportDetail.sport_id ? {
                    id: sportDetail.sport_id.custom_id || sportDetail.sport_id._id?.toString(),
                    name: sportDetail.sport_id.name,
                    logo: sportDetail.sport_id.logo || null,
                    is_popular: sportDetail.sport_id.is_popular || false,
                } : null,
            })),
            facility: (facility || []).map((fac) => ({
                id: fac.custom_id || fac._id?.toString(),
                name: fac.name,
                description: fac.description || null,
                icon: fac.icon || null,
            })),
            batches: batches.map((batch) => {
                const { _id: batchId, sport, status, is_active, ...batchData } = batch;
                return {
                    ...batchData,
                    id: batchId.toString(),
                    allowed_genders: batch.gender || [],
                    sport: sport ? {
                        id: sport.custom_id || sport._id?.toString(),
                        name: sport.name,
                        logo: sport.logo || null,
                    } : null,
                    coach: batch.coach ? batch.coach.fullName : null,
                };
            }),
            ratings: ratingData.ratings,
            averageRating: ratingData.averageRating,
            totalRatings: ratingData.totalRatings,
            isAlreadyRated: ratingData.isAlreadyRated,
            canUpdateRating: ratingData.canUpdateRating,
            isBookmarked: !!bookmarkDoc,
        };
        if (!isUserLoggedIn) {
            result.mobile_number = coachingCenter.mobile_number
                ? maskMobile(coachingCenter.mobile_number)
                : null;
            result.email = coachingCenter.email ? maskEmail(coachingCenter.email) : null;
        }
        // Add distance when user location provided and academy has location (uses Google Maps + cache)
        if (userLocation) {
            const loc = coachingCenter.location;
            const acLat = loc?.latitude ?? loc?.lat;
            const acLon = loc?.longitude ?? loc?.long;
            if (acLat != null &&
                acLon != null &&
                typeof acLat === 'number' &&
                typeof acLon === 'number') {
                const distKm = await (0, distance_1.calculateDistance)(userLocation.latitude, userLocation.longitude, acLat, acLon);
                result.distance = Math.round(distKm * 100) / 100;
            }
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to get academy by user ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAcademyById = getAcademyById;
/**
 * Get academies by city name
 */
const getAcademiesByCity = async (cityName, page = 1, limit = env_1.config.pagination.defaultLimit, userId) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Find city (case-insensitive)
        const city = await location_model_1.CityModel.findOne({
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
        const query = {
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
            is_active: true,
            approval_status: 'approved', // Only show approved academies to users
            is_deleted: false,
            'location.address.city': { $regex: new RegExp(`^${cityName}$`, 'i') },
        };
        // Fetch all academies (we'll filter and paginate after filtering deleted users)
        let academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo')
            .select('id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings')
            .sort({ createdAt: -1 })
            .lean();
        // Get total count after filtering
        const filteredTotal = academies.length;
        // Apply pagination after filtering
        const paginatedAcademies = academies.slice(skip, skip + pageSize);
        const totalPages = Math.ceil(filteredTotal / pageSize);
        const bookmarkedCitySet = new Set();
        if (userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
            if (userObjectId) {
                const centerObjectIds = paginatedAcademies.map((a) => a._id);
                const bookmarks = await userAcademyBookmark_model_1.UserAcademyBookmarkModel.find({
                    user: userObjectId,
                    academy: { $in: centerObjectIds },
                }).select('academy').lean();
                bookmarks.forEach((b) => bookmarkedCitySet.add(b.academy.toString()));
            }
        }
        return {
            data: paginatedAcademies.map((academy) => {
                // Get first active image from sport_details, prioritizing banner images
                let image = null;
                if (academy.sport_details && Array.isArray(academy.sport_details)) {
                    for (const sportDetail of academy.sport_details) {
                        if (sportDetail.images && Array.isArray(sportDetail.images)) {
                            // Sort images: banner first, then others
                            const sortedImages = [...sportDetail.images].sort((a, b) => {
                                if (a.is_banner && !b.is_banner)
                                    return -1;
                                if (!a.is_banner && b.is_banner)
                                    return 1;
                                return 0;
                            });
                            const activeImage = sortedImages.find((img) => img.is_active && !img.is_deleted && img.url);
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
                    sports: (academy.sports || []).map((sport) => ({
                        id: sport.custom_id || sport._id?.toString(),
                        name: sport.name,
                        logo: sport.logo || null,
                        is_popular: sport.is_popular || false,
                    })),
                    allowed_genders: academy.allowed_genders || [],
                    age: academy.age ? { min: academy.age.min, max: academy.age.max } : undefined,
                    allowed_disabled: academy.allowed_disabled === true,
                    is_only_for_disabled: academy.is_only_for_disabled === true,
                    averageRating: academy.averageRating ?? 0,
                    totalRatings: academy.totalRatings ?? 0,
                    isBookmarked: bookmarkedCitySet.has(academy._id.toString()),
                };
            }),
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total: filteredTotal,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get academies by city:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAcademiesByCity = getAcademiesByCity;
/**
 * Get academies by sport slug
 */
const getAcademiesBySport = async (sportSlug, page = 1, limit = env_1.config.pagination.defaultLimit, userLocation, radius, userId) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Find sport by slug
        const sport = await sport_model_1.SportModel.findOne({
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
        const query = {
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
            is_active: true,
            approval_status: 'approved', // Only show approved academies to users
            is_deleted: false,
            sports: sport._id,
        };
        // Fetch academies (total count will be calculated after filtering by radius)
        let academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo')
            .select('id center_name logo location sports allowed_genders sport_details age allowed_disabled is_only_for_disabled averageRating totalRatings')
            .lean();
        // Calculate distances if location provided
        if (userLocation && academies.length > 0) {
            const destinations = academies.map((academy) => ({
                latitude: academy.location.latitude,
                longitude: academy.location.longitude,
            }));
            const distances = await (0, distance_1.calculateDistances)(userLocation.latitude, userLocation.longitude, destinations);
            // Add distance to each academy
            academies = academies.map((academy, index) => ({
                ...academy,
                distance: distances[index],
            }));
            // Filter by radius if provided
            const searchRadius = radius ?? env_1.config.location.defaultRadius;
            academies = academies.filter((academy) => {
                const distance = academy.distance;
                return distance !== undefined && distance <= searchRadius;
            });
            // Sort by distance
            academies.sort((a, b) => a.distance - b.distance);
        }
        else {
            // Sort by creation date (if available) or keep original order
            academies.sort((a, b) => {
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
        const bookmarkedSportSet = new Set();
        if (userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
            if (userObjectId) {
                const centerObjectIds = paginatedAcademies.map((a) => a._id);
                const bookmarks = await userAcademyBookmark_model_1.UserAcademyBookmarkModel.find({
                    user: userObjectId,
                    academy: { $in: centerObjectIds },
                }).select('academy').lean();
                bookmarks.forEach((b) => bookmarkedSportSet.add(b.academy.toString()));
            }
        }
        return {
            data: paginatedAcademies.map((academy) => {
                // Get image from the sport_detail of the searched sport only, prioritizing banner
                let image = null;
                if (academy.sport_details && Array.isArray(academy.sport_details)) {
                    const searchedSportDetail = academy.sport_details.find((sd) => (sd.sport_id?._id || sd.sport_id)?.toString() === searchedSportIdStr);
                    if (searchedSportDetail?.images && Array.isArray(searchedSportDetail.images)) {
                        const sortedImages = [...searchedSportDetail.images].sort((a, b) => {
                            if (a.is_banner && !b.is_banner)
                                return -1;
                            if (!a.is_banner && b.is_banner)
                                return 1;
                            return 0;
                        });
                        const activeImage = sortedImages.find((img) => img.is_active && !img.is_deleted);
                        if (activeImage)
                            image = activeImage.url;
                    }
                }
                return {
                    id: academy.id || academy._id.toString(),
                    center_name: academy.center_name,
                    logo: academy.logo,
                    image: image,
                    location: academy.location,
                    sports: (academy.sports || []).map((sportItem) => ({
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
                    averageRating: academy.averageRating ?? 0,
                    totalRatings: academy.totalRatings ?? 0,
                    isBookmarked: bookmarkedSportSet.has(academy._id.toString()),
                };
            }),
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get academies by sport:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAcademiesBySport = getAcademiesBySport;
//# sourceMappingURL=academy.service.js.map