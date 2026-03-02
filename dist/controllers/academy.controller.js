"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRatingsByAcademyId = exports.submitRating = exports.getAcademiesBySport = exports.getAcademiesByCity = exports.getAcademyById = exports.getAllAcademies = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const env_1 = require("../config/env");
const academyService = __importStar(require("../services/client/academy.service"));
const coachingCenterRatingService = __importStar(require("../services/client/coachingCenterRating.service"));
/**
 * Get all academies with pagination
 * Supports location-based sorting and favorite sports preference
 */
const getAllAcademies = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const latitude = req.query.latitude ? parseFloat(req.query.latitude) : undefined;
        const longitude = req.query.longitude ? parseFloat(req.query.longitude) : undefined;
        const radius = req.query.radius ? parseFloat(req.query.radius) : undefined;
        const city = req.query.city?.trim() || undefined;
        const state = req.query.state?.trim() || undefined;
        const sportId = req.query.sportId?.trim() || undefined;
        const sportIds = req.query.sportIds?.trim() || undefined;
        const gender = req.query.gender?.trim() || undefined;
        const forDisabled = req.query.for_disabled === 'true' || req.query.for_disabled === '1';
        const minAge = req.query.min_age != null ? parseInt(req.query.min_age, 10) : undefined;
        const maxAge = req.query.max_age != null ? parseInt(req.query.max_age, 10) : undefined;
        const minRating = req.query.min_rating != null ? parseFloat(req.query.min_rating) : undefined;
        // Validate location if provided
        let userLocation;
        if (latitude !== undefined && longitude !== undefined) {
            if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.validation.invalidLocationCoordinates'));
            }
            userLocation = { latitude, longitude };
        }
        // Validate radius if provided
        if (radius !== undefined) {
            if (isNaN(radius) || radius <= 0 || radius > env_1.config.location.maxRadius) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.validation.invalidRadius'));
            }
        }
        // Get user ID if authenticated (optional)
        const userId = req.user?.id;
        const filters = {
            city,
            state,
            sportId,
            sportIds,
            gender,
            forDisabled,
            minAge: minAge != null && !Number.isNaN(minAge) ? minAge : undefined,
            maxAge: maxAge != null && !Number.isNaN(maxAge) ? maxAge : undefined,
            minRating: minRating != null && !Number.isNaN(minRating) ? minRating : undefined,
        };
        const result = await academyService.getAllAcademies(page, limit, userLocation, userId, radius, filters);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('academy.getAll.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllAcademies = getAllAcademies;
/**
 * Get academy details by ID
 * Supports: MongoDB ObjectId, CoachingCenter UUID, or User custom ID
 * When latitude & longitude provided, returns distance in km
 */
const getAcademyById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const latitude = req.query.latitude ? parseFloat(req.query.latitude) : undefined;
        const longitude = req.query.longitude ? parseFloat(req.query.longitude) : undefined;
        if (!id) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.getById.idRequired'));
        }
        let userLocation;
        if (latitude !== undefined && longitude !== undefined) {
            if (isNaN(latitude) ||
                isNaN(longitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude < -180 ||
                longitude > 180) {
                throw new ApiError_1.ApiError(400, 'Invalid latitude or longitude');
            }
            userLocation = { latitude, longitude };
        }
        // Check if user is logged in (for ratings: show their rating first, isAlreadyRated, canUpdateRating)
        const isUserLoggedIn = !!req.user;
        const userId = req.user?.id ?? null;
        const academy = await academyService.getAcademyById(id, isUserLoggedIn, userId, userLocation);
        if (!academy) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('academy.getById.notFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { ...academy }, (0, i18n_1.t)('academy.getById.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAcademyById = getAcademyById;
/**
 * Get academies by city name
 */
const getAcademiesByCity = async (req, res, next) => {
    try {
        const { cityName } = req.params;
        if (!cityName) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.getByCity.cityNameRequired'));
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const userId = req.user?.id;
        const result = await academyService.getAcademiesByCity(cityName, page, limit, userId);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('academy.getByCity.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAcademiesByCity = getAcademiesByCity;
/**
 * Get academies by sport slug
 */
const getAcademiesBySport = async (req, res, next) => {
    try {
        const { slug } = req.params;
        if (!slug) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.getBySport.slugRequired'));
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const latitude = req.query.latitude ? parseFloat(req.query.latitude) : undefined;
        const longitude = req.query.longitude ? parseFloat(req.query.longitude) : undefined;
        const radius = req.query.radius ? parseFloat(req.query.radius) : undefined;
        // Validate location if provided
        let userLocation;
        if (latitude !== undefined && longitude !== undefined) {
            if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.validation.invalidLocationCoordinates'));
            }
            userLocation = { latitude, longitude };
        }
        // Validate radius if provided
        if (radius !== undefined) {
            if (isNaN(radius) || radius <= 0 || radius > env_1.config.location.maxRadius) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('academy.validation.invalidRadius'));
            }
        }
        const userId = req.user?.id;
        const result = await academyService.getAcademiesBySport(slug, page, limit, userLocation, radius, userId);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('academy.getBySport.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAcademiesBySport = getAcademiesBySport;
/**
 * Submit or update rating for a coaching center (one per user, can update).
 */
const submitRating = async (req, res, next) => {
    try {
        const { id: coachingCenterId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        if (!coachingCenterId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.idRequired'));
        }
        const body = req.body;
        if (body.rating == null || typeof body.rating !== 'number') {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenterRating.invalidRating', { min: 1, max: 5 }));
        }
        const result = await coachingCenterRatingService.submitOrUpdateRating(userId, coachingCenterId, { rating: body.rating, comment: body.comment ?? null });
        const message = result.isUpdate
            ? (0, i18n_1.t)('coachingCenterRating.updateSuccess')
            : (0, i18n_1.t)('coachingCenterRating.submitSuccess');
        const response = new ApiResponse_1.ApiResponse(200, result, message);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.submitRating = submitRating;
/**
 * Get paginated ratings for a coaching center.
 */
const getRatingsByAcademyId = async (req, res, next) => {
    try {
        const { id: coachingCenterId } = req.params;
        if (!coachingCenterId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.idRequired'));
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const userId = req.user?.id ?? null;
        const result = await coachingCenterRatingService.getRatingsByCoachingCenterId(coachingCenterId, page, limit, userId);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Ratings retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRatingsByAcademyId = getRatingsByAcademyId;
//# sourceMappingURL=academy.controller.js.map