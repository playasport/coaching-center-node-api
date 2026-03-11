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
const adminRatingService = __importStar(require("../../services/admin/adminCoachingCenterRating.service"));
/**
 * Get paginated list of coaching center ratings (admin).
 */
const getRatings = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const coachingCenterId = req.query.coachingCenterId;
        const filters = {
            page,
            limit,
            ...(status && ['pending', 'approved', 'rejected'].includes(status) && { status }),
            ...(coachingCenterId && { coachingCenterId }),
        };
        const result = await adminRatingService.getRatings(filters);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('coachingCenterRating.listSuccess'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getRatings = getRatings;
/**
 * Get a single rating by id (admin).
 */
const getRatingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const rating = await adminRatingService.getRatingById(id);
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
 * Update rating status (approve / reject / pending).
 */
const updateRatingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenterRating.invalidStatus'));
        }
        const rating = await adminRatingService.updateRatingStatus(id, status);
        const response = new ApiResponse_1.ApiResponse(200, { rating }, (0, i18n_1.t)('coachingCenterRating.statusUpdated'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRatingStatus = updateRatingStatus;
//# sourceMappingURL=coachingCenterRating.controller.js.map