"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeData = exports.getPopularReels = exports.getNearbyAcademies = exports.getPopularSports = void 0;
const sport_model_1 = require("../models/sport.model");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const logger_1 = require("../utils/logger");
const distance_1 = require("../utils/distance");
const userCache_1 = require("../utils/userCache");
const user_model_1 = require("../models/user.model");
const env_1 = require("../config/env");
const reel_model_1 = require("../models/reel.model");
const reel_service_1 = require("./reel.service");
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
 */
const getNearbyAcademies = async (userLocation, limit = 12, userId, radius) => {
    try {
        // Build base query - only published and active academies
        const query = {
            status: 'published',
            is_active: true,
            is_deleted: false,
        };
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
        // Fetch academies
        let academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo is_popular')
            .populate({
            path: 'user',
            select: 'id',
            match: { isDeleted: false },
        })
            .select('id center_name logo location sports age allowed_genders sport_details user')
            .lean();
        // Calculate distances
        if (academies.length > 0) {
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
        }
        // Sort academies
        academies.sort((a, b) => {
            // Priority 1: Favorite sports (if user logged in and has favorites)
            if (favoriteSportIds.length > 0) {
                const aHasFavorite = a.sports?.some((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString()));
                const bHasFavorite = b.sports?.some((s) => favoriteSportIds.some((favId) => favId.toString() === s._id?.toString()));
                if (aHasFavorite && !bHasFavorite)
                    return -1;
                if (!aHasFavorite && bHasFavorite)
                    return 1;
            }
            // Priority 2: Distance (always sort by distance for nearby academies)
            if (a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance;
            }
            // Priority 3: Default sort (by creation date)
            return 0;
        });
        // Limit results
        const limitedAcademies = academies.slice(0, limit);
        // Map to AcademyListItem format
        return limitedAcademies.map((academy) => {
            // Get first active image from sport_details
            let image = null;
            if (academy.sport_details && Array.isArray(academy.sport_details)) {
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
            return {
                _id: academy._id.toString(),
                id: academy.id || academy._id.toString(),
                center_name: academy.center_name,
                logo: academy.logo,
                image: image,
                location: academy.location,
                sports: academy.sports || [],
                age: academy.age,
                allowed_genders: academy.allowed_genders || [],
                distance: academy.distance,
            };
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get nearby academies:', error);
        // Return empty array instead of throwing error
        return [];
    }
};
exports.getNearbyAcademies = getNearbyAcademies;
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
                    videoProcessedStatus: reel_model_1.VideoProcessedStatus.DONE,
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
        const reels = await reel_model_1.ReelModel.aggregate(aggregationPipeline);
        // Format reels for response
        return reels.map((reel) => {
            const user = reel.user || null;
            // Build reel URLs using helper function
            const urls = (0, reel_service_1.buildReelUrls)({
                masterM3u8Url: reel.masterM3u8Url,
                previewUrl: reel.previewUrl,
                thumbnailPath: reel.thumbnailPath,
            });
            // Build user name
            const userName = user
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
                : 'Unknown User';
            // User avatar URL (already full URL in database)
            const userAvatar = user?.profileImage || null;
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get popular reels:', error);
        return [];
    }
};
exports.getPopularReels = getPopularReels;
/**
 * Get home page data (nearby academies, popular sports, and popular reels)
 */
const getHomeData = async (userLocation, userId, radius) => {
    try {
        // Get popular sports, nearby academies, and popular reels in parallel
        // If any error occurs, it will return empty array instead of throwing
        const [popularSports, nearbyAcademies, popularReels] = await Promise.all([
            (0, exports.getPopularSports)(8).catch((error) => {
                logger_1.logger.error('Error getting popular sports, returning empty array:', error);
                return [];
            }),
            userLocation
                ? (0, exports.getNearbyAcademies)(userLocation, 12, userId, radius).catch((error) => {
                    logger_1.logger.error('Error getting nearby academies, returning empty array:', error);
                    return [];
                })
                : Promise.resolve([]),
            (0, exports.getPopularReels)(5).catch((error) => {
                logger_1.logger.error('Error getting popular reels, returning empty array:', error);
                return [];
            }),
        ]);
        return {
            nearbyAcademies: nearbyAcademies || [],
            popularSports: popularSports || [],
            popularReels: popularReels || [],
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get home data:', error);
        // Return default structure even on error
        return {
            nearbyAcademies: [],
            popularSports: [],
            popularReels: [],
        };
    }
};
exports.getHomeData = getHomeData;
//# sourceMappingURL=home.service.js.map