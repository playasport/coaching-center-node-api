"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademiesBySport = exports.getAcademiesByCity = exports.getAcademyById = exports.getAllAcademies = void 0;
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const batch_model_1 = require("../models/batch.model");
const sport_model_1 = require("../models/sport.model");
const user_model_1 = require("../models/user.model");
const location_model_1 = require("../models/location.model");
const mongoose_1 = require("mongoose");
const ApiError_1 = require("../utils/ApiError");
const logger_1 = require("../utils/logger");
const i18n_1 = require("../utils/i18n");
const env_1 = require("../config/env");
const distance_1 = require("../utils/distance");
const userCache_1 = require("../utils/userCache");
const coachingCenterStatus_enum_1 = require("../enums/coachingCenterStatus.enum");
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
 */
const getAllAcademies = async (page = 1, limit = env_1.config.pagination.defaultLimit, userLocation, userId, radius) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Build base query - only published and active academies
        const query = {
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
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
        // Fetch academies (total count will be calculated after filtering by radius)
        let academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo is_popular')
            .populate({
            path: 'user',
            select: 'id',
            match: { isDeleted: false },
        })
            .select('id center_name logo location sports age allowed_genders sport_details user')
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
            // Priority 2: Distance (if location provided)
            if (userLocation && a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance;
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
            data: paginatedAcademies.map((academy) => {
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
 */
const getAcademyById = async (id, isUserLoggedIn = false) => {
    try {
        let coachingCenter = null;
        // Try searching by CoachingCenter id field first (UUID field)
        coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne({
            id: id,
            status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
            is_active: true,
            is_deleted: false,
        })
            .populate('sports', 'custom_id name logo is_popular')
            .populate('sport_details.sport_id', 'custom_id name logo is_popular')
            .populate('facility', 'custom_id name description icon')
            .lean();
        // If not found by id field, try by ObjectId (if it's a valid ObjectId)
        if (!coachingCenter && mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findOne({
                _id: new mongoose_1.Types.ObjectId(id),
                status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
                is_active: true,
                is_deleted: false,
            })
                .populate('sports', 'custom_id name logo is_popular')
                .populate('sport_details.sport_id', 'custom_id name logo is_popular')
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
        // Get batches for this coaching center
        const batches = await batch_model_1.BatchModel.find({
            center: coachingCenter._id,
            is_active: true,
            is_deleted: false,
        })
            .populate('sport', 'custom_id name logo')
            .select('name sport scheduled duration capacity age admission_fee fee_structure status is_active')
            .lean();
        // Mask email and mobile if user not logged in
        const result = {
            ...coachingCenter,
            batches: batches.map((batch) => ({
                ...batch,
                _id: batch._id.toString(),
                sport: batch.sport ? {
                    _id: batch.sport._id?.toString(),
                    custom_id: batch.sport.custom_id,
                    name: batch.sport.name,
                    logo: batch.sport.logo,
                } : null,
            })),
        };
        if (!isUserLoggedIn) {
            result.mobile_number = coachingCenter.mobile_number
                ? maskMobile(coachingCenter.mobile_number)
                : null;
            result.email = coachingCenter.email ? maskEmail(coachingCenter.email) : null;
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
const getAcademiesByCity = async (cityName, page = 1, limit = env_1.config.pagination.defaultLimit) => {
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
            is_deleted: false,
            'location.address.city': { $regex: new RegExp(`^${cityName}$`, 'i') },
        };
        // Get total count
        const total = await coachingCenter_model_1.CoachingCenterModel.countDocuments(query);
        // Fetch academies
        const academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo is_popular')
            .select('id center_name logo location sports age allowed_genders sport_details')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();
        const totalPages = Math.ceil(total / pageSize);
        return {
            data: academies.map((academy) => {
                // Get first active image from sport_details
                let image = null;
                if (academy.sport_details && Array.isArray(academy.sport_details)) {
                    for (const sportDetail of academy.sport_details) {
                        if (sportDetail.images && Array.isArray(sportDetail.images)) {
                            const activeImage = sportDetail.images.find((img) => img.is_active && !img.is_deleted && img.url);
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
                };
            }),
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
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
const getAcademiesBySport = async (sportSlug, page = 1, limit = env_1.config.pagination.defaultLimit, userLocation, radius) => {
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
            is_deleted: false,
            sports: sport._id,
        };
        // Fetch academies (total count will be calculated after filtering by radius)
        let academies = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('sports', 'custom_id name logo is_popular')
            .populate({
            path: 'user',
            select: 'id',
            match: { isDeleted: false },
        })
            .select('id center_name logo location sports age allowed_genders sport_details user')
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
        return {
            data: paginatedAcademies.map((academy) => {
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
        logger_1.logger.error('Failed to get academies by sport:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAcademiesBySport = getAcademiesBySport;
//# sourceMappingURL=academy.service.js.map