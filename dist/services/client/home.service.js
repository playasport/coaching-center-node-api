"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeData = exports.getSportsWiseAcademies = exports.getTopCities = exports.getPopularReels = exports.getRecommendedAcademies = exports.getNearbyAcademies = exports.getPopularSports = void 0;
const sport_model_1 = require("../../models/sport.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const logger_1 = require("../../utils/logger");
const distance_1 = require("../../utils/distance");
const geoNearAcademies_service_1 = require("../common/geoNearAcademies.service");
const mongoose_1 = require("mongoose");
const userCache_1 = require("../../utils/userCache");
const user_model_1 = require("../../models/user.model");
const env_1 = require("../../config/env");
const reel_model_1 = require("../../models/reel.model");
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const coachingCenterStatus_enum_1 = require("../../enums/coachingCenterStatus.enum");
const homeDataCache_1 = require("../../utils/homeDataCache");
/**
 * Get popular sports, fill remaining slots with non-popular sports if needed
 */
const getPopularSports = async (limit = 8) => {
    try {
        // First, get popular sports
        const popularSports = await sport_model_1.SportModel.find({
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
        }));
        // If we have enough popular sports, return them
        if (popularSportsList.length >= limit) {
            return popularSportsList.slice(0, limit);
        }
        // If we need more sports, get non-popular sports to fill the remaining slots
        const remainingCount = limit - popularSportsList.length;
        // Get the MongoDB ObjectIds of popular sports to exclude them
        const popularSportObjectIds = popularSports.map((sport) => sport._id);
        const additionalSports = await sport_model_1.SportModel.find({
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
        }));
        // Combine popular sports with additional sports
        return [...popularSportsList, ...additionalSportsList];
    }
    catch (error) {
        logger_1.logger.error('Failed to get popular sports:', error);
        // Return empty array instead of throwing error
        return [];
    }
};
exports.getPopularSports = getPopularSports;
/**
 * Get nearby academies based on location
 * Flow: MongoDB $geoNear (top 200) → Redis/Google road distance → final sorted result
 * Fallback: bounding box + calculateDistances when location.geo not populated
 */
const getNearbyAcademies = async (userLocation, limit = 12, userId, radius) => {
    try {
        const searchRadius = radius ?? env_1.config.location.defaultRadius;
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
        // Try geoNear + road distance first (requires location.geo - run migrate:coaching-center-geo)
        const geoResults = await (0, geoNearAcademies_service_1.getNearbyAcademiesWithRoadDistance)(userLocation, {
            maxRadiusKm: searchRadius,
            limit: 200,
        });
        let academies = [];
        if (geoResults.length > 0) {
            academies = geoResults.map((r) => ({ ...r.academy, distance: r.roadDistanceKm }));
        }
        // Fallback to bounding box when geoNear returns nothing (e.g. no location.geo yet)
        if (academies.length === 0) {
            const bbox = (0, distance_1.getBoundingBox)(userLocation.latitude, userLocation.longitude, searchRadius);
            const query = {
                status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
                is_active: true,
                is_deleted: false,
                approval_status: 'approved',
                'location.latitude': { $gte: bbox.minLat, $lte: bbox.maxLat },
                'location.longitude': { $gte: bbox.minLon, $lte: bbox.maxLon },
            };
            const fetchLimit = Math.min(limit * 10, 500);
            academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
                .populate('sports', 'custom_id name logo is_popular')
                .select('id center_name logo location sports allowed_genders sport_details createdAt user')
                .sort({ createdAt: -1 })
                .limit(fetchLimit)
                .lean();
            if (academies.length > 0) {
                const destinations = academies.map((a) => ({
                    latitude: a.location.latitude,
                    longitude: a.location.longitude,
                }));
                const distances = await (0, distance_1.calculateDistances)(userLocation.latitude, userLocation.longitude, destinations);
                academies = academies.map((a, i) => ({ ...a, distance: distances[i] }));
                academies = academies.filter((a) => a.distance !== undefined && a.distance <= searchRadius);
            }
        }
        // Filter out academies with deleted users
        if (academies.length > 0) {
            const academyUserIds = academies
                .map((a) => a.user)
                .filter((uid) => uid && (mongoose_1.Types.ObjectId.isValid(uid) || uid._id));
            if (academyUserIds.length > 0) {
                const userIds = academyUserIds.map((uid) => mongoose_1.Types.ObjectId.isValid(uid) ? new mongoose_1.Types.ObjectId(uid) : (uid._id || uid));
                const validUsers = await user_model_1.UserModel.find({
                    _id: { $in: userIds },
                    isDeleted: false,
                    $or: [{ academyRoleDeletedAt: null }, { academyRoleDeletedAt: { $exists: false } }],
                })
                    .select('_id')
                    .lean();
                const validUserIds = new Set(validUsers.map((u) => u._id.toString()));
                academies = academies.filter((academy) => {
                    if (!academy.user)
                        return false;
                    const uid = academy.user._id || academy.user;
                    return validUserIds.has(uid.toString ? uid.toString() : String(uid));
                });
            }
            else {
                academies = [];
            }
        }
        // Sort: favorite sports first, then by distance
        academies.sort((a, b) => {
            if (favoriteSportIds.length > 0) {
                const aHasFavorite = a.sports?.some((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString()));
                const bHasFavorite = b.sports?.some((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString()));
                if (aHasFavorite && !bHasFavorite)
                    return -1;
                if (!aHasFavorite && bHasFavorite)
                    return 1;
            }
            if (a.distance !== undefined && b.distance !== undefined)
                return a.distance - b.distance;
            return 0;
        });
        return academies.slice(0, limit).map((a) => mapAcademyToListItem(a));
    }
    catch (error) {
        logger_1.logger.error('Failed to get nearby academies:', error);
        return [];
    }
};
exports.getNearbyAcademies = getNearbyAcademies;
/**
 * Map raw academy document to AcademyListItem format
 */
const mapAcademyToListItem = (academy) => {
    let image = null;
    if (academy.sport_details && Array.isArray(academy.sport_details)) {
        for (const sportDetail of academy.sport_details) {
            if (sportDetail.images && Array.isArray(sportDetail.images)) {
                const sortedImages = [...sportDetail.images].sort((a, b) => {
                    if (a.is_banner && !b.is_banner)
                        return -1;
                    if (!a.is_banner && b.is_banner)
                        return 1;
                    return 0;
                });
                const activeImage = sortedImages.find((img) => img.is_active && !img.is_deleted);
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
        distance: academy.distance,
    };
};
/**
 * Get recommended academies based on user location and favorite sports
 * Only returns results when user is logged in with favorite sports and location is provided
 */
const getRecommendedAcademies = async (userLocation, limit = 12, userId, radius) => {
    try {
        if (!userId)
            return [];
        // Get user's favorite sports
        let favoriteSportIds = [];
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
        if (favoriteSportIds.length === 0)
            return [];
        const searchRadius = radius ?? env_1.config.location.defaultRadius;
        // Try geoNear + road distance first
        let academies = [];
        const geoResults = await (0, geoNearAcademies_service_1.getNearbyAcademiesWithRoadDistance)(userLocation, {
            maxRadiusKm: searchRadius,
            limit: 200,
            extraQuery: { sports: { $in: favoriteSportIds } },
        });
        if (geoResults.length > 0) {
            academies = geoResults.map((r) => ({ ...r.academy, distance: r.roadDistanceKm }));
        }
        // Fallback to bounding box
        if (academies.length === 0) {
            const bbox = (0, distance_1.getBoundingBox)(userLocation.latitude, userLocation.longitude, searchRadius);
            const query = {
                status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
                is_active: true,
                is_deleted: false,
                approval_status: 'approved',
                sports: { $in: favoriteSportIds },
                'location.latitude': { $gte: bbox.minLat, $lte: bbox.maxLat },
                'location.longitude': { $gte: bbox.minLon, $lte: bbox.maxLon },
            };
            const fetchLimit = Math.min(limit * 10, 500);
            academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
                .populate('sports', 'custom_id name logo is_popular')
                .select('id center_name logo location sports allowed_genders sport_details createdAt user')
                .sort({ createdAt: -1 })
                .limit(fetchLimit)
                .lean();
            if (academies.length > 0) {
                const destinations = academies.map((a) => ({
                    latitude: a.location.latitude,
                    longitude: a.location.longitude,
                }));
                const distances = await (0, distance_1.calculateDistances)(userLocation.latitude, userLocation.longitude, destinations);
                academies = academies.map((a, i) => ({ ...a, distance: distances[i] }));
                academies = academies.filter((a) => a.distance !== undefined && a.distance <= searchRadius);
            }
        }
        // Filter out academies with deleted users
        if (academies.length > 0) {
            const academyUserIds = academies
                .map((a) => a.user)
                .filter((uid) => uid && (mongoose_1.Types.ObjectId.isValid(uid) || uid._id));
            if (academyUserIds.length > 0) {
                const userIds = academyUserIds.map((uid) => mongoose_1.Types.ObjectId.isValid(uid) ? new mongoose_1.Types.ObjectId(uid) : (uid._id || uid));
                const validUsers = await user_model_1.UserModel.find({
                    _id: { $in: userIds },
                    isDeleted: false,
                    $or: [{ academyRoleDeletedAt: null }, { academyRoleDeletedAt: { $exists: false } }],
                })
                    .select('_id')
                    .lean();
                const validUserIds = new Set(validUsers.map((u) => u._id.toString()));
                academies = academies.filter((academy) => {
                    if (!academy.user)
                        return false;
                    const uid = academy.user._id || academy.user;
                    return validUserIds.has(uid.toString ? uid.toString() : String(uid));
                });
            }
            else {
                academies = [];
            }
        }
        // Sort: 1) More matching favorite sports first, 2) Then by distance
        academies.sort((a, b) => {
            const aMatchCount = (a.sports || []).filter((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString())).length;
            const bMatchCount = (b.sports || []).filter((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString())).length;
            if (bMatchCount !== aMatchCount)
                return bMatchCount - aMatchCount;
            if (a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance;
            }
            return 0;
        });
        const limitedAcademies = academies.slice(0, limit);
        return limitedAcademies.map(mapAcademyToListItem);
    }
    catch (error) {
        logger_1.logger.error('Failed to get recommended academies:', error);
        return [];
    }
};
exports.getRecommendedAcademies = getRecommendedAcademies;
/**
 * Get popular reels sorted by views count
 */
const getPopularReels = async (limit = 6) => {
    try {
        // Use aggregation to get popular reels with active users
        const aggregationPipeline = [
            {
                $match: {
                    status: reel_model_1.ReelStatus.APPROVED,
                    videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
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
                    $or: [
                        { 'user.userRoleDeletedAt': null },
                        { 'user.userRoleDeletedAt': { $exists: false } },
                    ],
                },
            },
            // Sort by views count descending
            { $sort: { viewsCount: -1 } },
            { $limit: limit },
        ];
        const reels = await reel_model_1.ReelModel.aggregate(aggregationPipeline);
        // Format reels for response
        return reels.map((reel) => {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get popular reels:', error);
        return [];
    }
};
exports.getPopularReels = getPopularReels;
/**
 * Get top 10 cities with the most academies
 * Only counts approved, active, non-deleted academies
 */
const getTopCities = async (limit = 10) => {
    try {
        const aggregationPipeline = [
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
        const topCities = await coachingCenter_model_1.CoachingCenterModel.aggregate(aggregationPipeline);
        return topCities.map((city) => ({
            city: city.city,
            state: city.state || '',
            academyCount: city.academyCount,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to get top cities:', error);
        // Return empty array instead of throwing error
        return [];
    }
};
exports.getTopCities = getTopCities;
const SPORTS_WISE_SPORTS_LIMIT = 5;
const SPORTS_WISE_ACADEMIES_PER_SPORT = 18;
/**
 * Get sports-wise academies: max 18 academies per sport for 5 sports.
 * When user is logged in, favorite sports appear first; otherwise only popular sports.
 * Requires user location.
 */
const getSportsWiseAcademies = async (userLocation, userId, radius) => {
    try {
        const searchRadius = radius ?? env_1.config.location.defaultRadius;
        const bbox = (0, distance_1.getBoundingBox)(userLocation.latitude, userLocation.longitude, searchRadius);
        // Get 5 sports: favorites first when logged in, then fill with popular sports
        let sportIds = [];
        const sportIdOrder = [];
        if (userId) {
            try {
                const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
                if (userObjectId) {
                    const user = await user_model_1.UserModel.findById(userObjectId)
                        .select('favoriteSports')
                        .lean();
                    if (user?.favoriteSports && user.favoriteSports.length > 0) {
                        const favorites = user.favoriteSports.slice(0, SPORTS_WISE_SPORTS_LIMIT);
                        sportIdOrder.push(...favorites);
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn('Failed to get user favorite sports for sports-wise', { userId, error });
            }
        }
        // Fill remaining slots with popular sports (alphabetical by name)
        if (sportIdOrder.length < SPORTS_WISE_SPORTS_LIMIT) {
            const popularSports = await sport_model_1.SportModel.find({
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
            const popularSports = await sport_model_1.SportModel.find({
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
        const seen = new Set();
        const orderedSportIds = sportIdOrder.filter((id) => {
            const str = id.toString();
            if (seen.has(str))
                return false;
            seen.add(str);
            return true;
        });
        sportIds = orderedSportIds;
        if (sportIds.length === 0)
            return [];
        // Fetch sport details for response
        const sportsData = await sport_model_1.SportModel.find({ _id: { $in: sportIds } })
            .select('_id custom_id name slug logo is_popular')
            .lean();
        const sportMap = new Map(sportsData.map((s) => [
            s._id.toString(),
            {
                id: s._id.toString(),
                custom_id: s.custom_id,
                name: s.name,
                slug: s.slug || null,
                logo: s.logo || null,
                is_popular: s.is_popular || false,
            },
        ]));
        // Fetch academies that have any of these sports, within location
        const query = {
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
            is_active: true,
            is_deleted: false,
            approval_status: 'approved',
            sports: { $in: sportIds },
            'location.latitude': { $gte: bbox.minLat, $lte: bbox.maxLat },
            'location.longitude': { $gte: bbox.minLon, $lte: bbox.maxLon },
        };
        const fetchLimit = Math.min(SPORTS_WISE_SPORTS_LIMIT * SPORTS_WISE_ACADEMIES_PER_SPORT * 3, 600);
        let academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo is_popular')
            .select('id center_name logo location sports allowed_genders sport_details createdAt user')
            .sort({ createdAt: -1 })
            .limit(fetchLimit)
            .lean();
        // Filter out academies with deleted users
        if (academies.length > 0) {
            const academyUserIds = academies
                .map((a) => a.user)
                .filter((uid) => uid && (mongoose_1.Types.ObjectId.isValid(uid) || uid._id));
            if (academyUserIds.length > 0) {
                const userIds = academyUserIds.map((uid) => mongoose_1.Types.ObjectId.isValid(uid) ? new mongoose_1.Types.ObjectId(uid) : (uid._id || uid));
                const validUsers = await user_model_1.UserModel.find({
                    _id: { $in: userIds },
                    isDeleted: false,
                    $or: [{ academyRoleDeletedAt: null }, { academyRoleDeletedAt: { $exists: false } }],
                })
                    .select('_id')
                    .lean();
                const validUserIds = new Set(validUsers.map((u) => u._id.toString()));
                academies = academies.filter((academy) => {
                    if (!academy.user)
                        return false;
                    const uid = academy.user._id || academy.user;
                    const uidStr = uid.toString ? uid.toString() : String(uid);
                    return validUserIds.has(uidStr);
                });
            }
            else {
                academies = [];
            }
        }
        // Calculate distances
        if (academies.length > 0) {
            const destinations = academies.map((academy) => ({
                latitude: academy.location.latitude,
                longitude: academy.location.longitude,
            }));
            const distances = await (0, distance_1.calculateDistances)(userLocation.latitude, userLocation.longitude, destinations);
            academies = academies.map((academy, index) => ({
                ...academy,
                distance: distances[index],
            }));
            academies = academies.filter((academy) => {
                const distance = academy.distance;
                return distance !== undefined && distance <= searchRadius;
            });
        }
        // Group by sport (preserving order): each sport gets max 18 academies, sorted by distance
        const result = [];
        for (const sportId of orderedSportIds) {
            const sportIdStr = sportId.toString();
            const sportInfo = sportMap.get(sportIdStr);
            if (!sportInfo)
                continue;
            const academiesForSport = academies
                .filter((a) => (a.sports || []).some((s) => s._id?.toString() === sportIdStr))
                .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
                .slice(0, SPORTS_WISE_ACADEMIES_PER_SPORT);
            result.push({
                sport: sportInfo,
                academies: academiesForSport.map(mapAcademyToListItem),
            });
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error('Failed to get sports-wise academies:', error);
        return [];
    }
};
exports.getSportsWiseAcademies = getSportsWiseAcademies;
/**
 * Get home page data (nearby academies, recommended academies, popular sports, and popular reels)
 * Uses Redis cache (5 min TTL) when same user + same location to avoid repeated DB calls
 */
const getHomeData = async (userLocation, userId, radius) => {
    try {
        // Check cache first - skip DB when same user + same location (coordinates rounded to ~111m)
        const cached = await (0, homeDataCache_1.getCachedHomeData)({
            userId,
            userLocation,
            radius,
        });
        if (cached) {
            return cached;
        }
        // Try global cache (popularSports, popularReels, topCities) - reduces DB load on cache misses
        let popularSports;
        let popularReels;
        let topCities;
        const globalCached = await (0, homeDataCache_1.getCachedGlobalHomeData)();
        if (globalCached) {
            popularSports = globalCached.popularSports;
            popularReels = globalCached.popularReels;
            topCities = globalCached.topCities;
        }
        else {
            const [sports, reels, cities] = await Promise.all([
                (0, exports.getPopularSports)(8).catch((error) => {
                    logger_1.logger.error('Error getting popular sports, returning empty array:', error);
                    return [];
                }),
                (0, exports.getPopularReels)(5).catch((error) => {
                    logger_1.logger.error('Error getting popular reels, returning empty array:', error);
                    return [];
                }),
                (0, exports.getTopCities)(10).catch((error) => {
                    logger_1.logger.error('Error getting top cities, returning empty array:', error);
                    return [];
                }),
            ]);
            popularSports = sports;
            popularReels = reels;
            topCities = cities;
            (0, homeDataCache_1.cacheGlobalHomeData)({ popularSports, popularReels, topCities }).catch(() => { });
        }
        // Fetch location-dependent data in parallel
        const [nearbyAcademies, recommendedAcademies, sportsWiseAcademies] = await Promise.all([
            userLocation
                ? (0, exports.getNearbyAcademies)(userLocation, 12, userId, radius).catch((error) => {
                    logger_1.logger.error('Error getting nearby academies, returning empty array:', error);
                    return [];
                })
                : Promise.resolve([]),
            userLocation && userId
                ? (0, exports.getRecommendedAcademies)(userLocation, 12, userId, radius).catch((error) => {
                    logger_1.logger.error('Error getting recommended academies, returning empty array:', error);
                    return [];
                })
                : Promise.resolve([]),
            userLocation
                ? (0, exports.getSportsWiseAcademies)(userLocation, userId, radius).catch((error) => {
                    logger_1.logger.error('Error getting sports-wise academies, returning empty array:', error);
                    return [];
                })
                : Promise.resolve([]),
        ]);
        const homeData = {
            nearbyAcademies: nearbyAcademies || [],
            recommendedAcademies: recommendedAcademies || [],
            sportsWiseAcademies: sportsWiseAcademies || [],
            popularSports: popularSports || [],
            popularReels: popularReels || [],
            topCities: topCities || [],
        };
        // Cache for future requests (non-blocking)
        (0, homeDataCache_1.cacheHomeData)({ userId, userLocation, radius }, homeData).catch((cacheError) => {
            logger_1.logger.warn('Failed to cache home data (non-blocking)', { error: cacheError });
        });
        return homeData;
    }
    catch (error) {
        logger_1.logger.error('Failed to get home data:', error);
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
exports.getHomeData = getHomeData;
//# sourceMappingURL=home.service.js.map