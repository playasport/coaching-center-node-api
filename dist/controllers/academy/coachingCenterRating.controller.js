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
exports.updateRatingStatus = exports.getRatingById = exports.getRatings = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const academyRatingService = __importStar(require("../../services/academy/academyCoachingCenterRating.service"));
/**
 * Get paginated list of ratings for the academy's coaching centers.
 */
const getRatings = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const coachingCenterId = req.query.coachingCenterId;
        const filters = {
            page,
            limit,
            ...(status &&
                ['pending', 'approved', 'rejected'].includes(status) && { status }),
            ...(coachingCenterId && { coachingCenterId }),
        };
        const result = await academyRatingService.getRatings(req.user.id, filters);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('coachingCenterRating.listSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRatings = getRatings;
/**
 * Get a single rating by id (only if it belongs to the academy's centers).
 */
const getRatingById = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const rating = await academyRatingService.getRatingById(req.user.id, id);
        if (!rating) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenterRating.ratingNotFound'));
        }
        const response = new ApiResponse_1.ApiResponse(200, { rating }, (0, i18n_1.t)('coachingCenterRating.getSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRatingById = getRatingById;
/**
 * Update rating status (approve / reject / pending) for a rating belonging to the academy's centers.
 */
const updateRatingStatus = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenterRating.invalidStatus'));
        }
        const rating = await academyRatingService.updateRatingStatus(req.user.id, id, status);
        const response = new ApiResponse_1.ApiResponse(200, { rating }, (0, i18n_1.t)('coachingCenterRating.statusUpdated'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRatingStatus = updateRatingStatus;
//# sourceMappingURL=coachingCenterRating.controller.js.map