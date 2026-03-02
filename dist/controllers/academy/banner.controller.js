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
exports.getAllCenterBanners = exports.getCenterBanners = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const bannerService = __importStar(require("../../services/client/banner.service"));
const banner_model_1 = require("../../models/banner.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const userCache_1 = require("../../utils/userCache");
const i18n_1 = require("../../utils/i18n");
/**
 * Get banners for coaching center
 * Returns banners that are either general or targeted to this specific center
 */
const getCenterBanners = async (req, res, next) => {
    try {
        const { position, sportId, limit, centerId: queryCenterId } = req.query;
        const user = req.user;
        if (!user || !user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get center IDs from user's coaching centers
        let centerIds = [];
        if (queryCenterId) {
            // If specific center ID is provided, verify it belongs to user
            const userObjectId = await (0, userCache_1.getUserObjectId)(user.id);
            if (!userObjectId) {
                throw new ApiError_1.ApiError(404, 'User not found');
            }
            const center = await coachingCenter_model_1.CoachingCenterModel.findOne({
                id: queryCenterId,
                user: userObjectId,
                is_deleted: false,
            }).select('id').lean();
            if (!center) {
                throw new ApiError_1.ApiError(403, 'Center does not belong to you');
            }
            centerIds = [center.id];
        }
        else {
            // Get all center IDs owned by the user
            const userObjectId = await (0, userCache_1.getUserObjectId)(user.id);
            if (!userObjectId) {
                throw new ApiError_1.ApiError(404, 'User not found');
            }
            const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
                user: userObjectId,
                is_deleted: false,
            }).select('id').lean();
            centerIds = coachingCenters.map(center => center.id);
        }
        // Default to center_page position if not specified
        const bannerPosition = position || banner_model_1.BannerPosition.CENTER_PAGE;
        // Validate position
        if (!Object.values(banner_model_1.BannerPosition).includes(bannerPosition)) {
            res.status(400).json(new ApiResponse_1.ApiResponse(400, null, 'Invalid banner position'));
            return;
        }
        // Get banners for each center and general banners in parallel
        const bannerPromises = [];
        // Get banners for each center
        for (const centerId of centerIds) {
            bannerPromises.push(bannerService.getActiveBannersByPosition(bannerPosition, {
                centerId,
                sportId: sportId,
                limit: limit ? parseInt(limit) : undefined,
                academyOnly: true, // Include academy-only banners
            }));
        }
        // Also get general banners (centerIds: null)
        bannerPromises.push(bannerService.getActiveBannersByPosition(bannerPosition, {
            sportId: sportId,
            limit: limit ? parseInt(limit) : undefined,
            academyOnly: true, // Include academy-only banners
        }));
        // Execute all banner queries in parallel
        const bannerResults = await Promise.all(bannerPromises);
        const allBanners = bannerResults.flat();
        // Remove duplicates and sort by priority
        const uniqueBanners = Array.from(new Map(allBanners.map(banner => [banner.id, banner])).values()).sort((a, b) => b.priority - a.priority);
        const banners = uniqueBanners.slice(0, limit ? parseInt(limit) : 10);
        const response = new ApiResponse_1.ApiResponse(200, { banners }, 'Banners retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCenterBanners = getCenterBanners;
/**
 * Get all banners for coaching center (all positions)
 */
const getAllCenterBanners = async (req, res, next) => {
    try {
        const { sportId, limit, centerId: queryCenterId } = req.query;
        const user = req.user;
        if (!user || !user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get user ObjectId once (cached lookup)
        const userObjectId = await (0, userCache_1.getUserObjectId)(user.id);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Get center IDs from user's coaching centers
        let centerIds = [];
        if (queryCenterId) {
            // If specific center ID is provided, verify it belongs to user
            const center = await coachingCenter_model_1.CoachingCenterModel.findOne({
                id: queryCenterId,
                user: userObjectId,
                is_deleted: false,
            }).select('id').lean();
            if (!center) {
                throw new ApiError_1.ApiError(403, 'Center does not belong to you');
            }
            centerIds = [center.id];
        }
        else {
            // Get all center IDs owned by the user
            const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
                user: userObjectId,
                is_deleted: false,
            }).select('id').lean();
            centerIds = coachingCenters.map(center => center.id);
        }
        // Get banners for common positions used on center pages
        const positions = [
            banner_model_1.BannerPosition.CENTER_PAGE,
            banner_model_1.BannerPosition.HOMEPAGE_TOP,
            banner_model_1.BannerPosition.HOMEPAGE_MIDDLE,
        ];
        // Build all banner queries in parallel (for all positions and centers)
        const bannerPromises = [];
        for (const position of positions) {
            // Get banners for each center
            for (const centerId of centerIds) {
                bannerPromises.push(bannerService.getActiveBannersByPosition(position, {
                    centerId,
                    sportId: sportId,
                    limit: limit ? parseInt(limit) : 5,
                    academyOnly: true, // Include academy-only banners
                }).then(banners => banners.map(b => ({ ...b, position }))));
            }
            // Also get general banners (centerIds: null)
            bannerPromises.push(bannerService.getActiveBannersByPosition(position, {
                sportId: sportId,
                limit: limit ? parseInt(limit) : 5,
                academyOnly: true, // Include academy-only banners
            }).then(banners => banners.map(b => ({ ...b, position }))));
        }
        // Execute all banner queries in parallel
        const bannerResults = await Promise.all(bannerPromises);
        const allBanners = bannerResults.flat();
        // Remove duplicates and group by position
        const bannersByPosition = allBanners.reduce((acc, banner) => {
            if (!acc[banner.position]) {
                acc[banner.position] = [];
            }
            acc[banner.position].push(banner);
            return acc;
        }, {});
        const response = new ApiResponse_1.ApiResponse(200, { banners: bannersByPosition }, 'Banners retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCenterBanners = getAllCenterBanners;
//# sourceMappingURL=banner.controller.js.map