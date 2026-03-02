"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRatingStatus = exports.getRatingById = exports.getRatings = void 0;
const mongoose_1 = require("mongoose");
const coachingCenterRating_model_1 = require("../../models/coachingCenterRating.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const coachingCenterRating_service_1 = require("../client/coachingCenterRating.service");
/**
 * Get paginated list of coaching center ratings for admin with filters.
 */
const getRatings = async (filters = {}) => {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;
    const query = {};
    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.coachingCenterId) {
        const isObjectId = mongoose_1.Types.ObjectId.isValid(filters.coachingCenterId) && filters.coachingCenterId.length === 24;
        const center = await coachingCenter_model_1.CoachingCenterModel.findOne(isObjectId
            ? { _id: filters.coachingCenterId, is_deleted: false }
            : { id: filters.coachingCenterId, is_deleted: false })
            .select('_id')
            .lean();
        if (center) {
            query.coachingCenter = center._id;
        }
        else {
            return {
                ratings: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }
    }
    const [ratings, total] = await Promise.all([
        coachingCenterRating_model_1.CoachingCenterRatingModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'id firstName lastName email profileImage')
            .populate('coachingCenter', 'id center_name')
            .lean(),
        coachingCenterRating_model_1.CoachingCenterRatingModel.countDocuments(query),
    ]);
    const ratingList = ratings.map((r) => ({
        id: r.id ?? r._id?.toString(),
        rating: r.rating,
        comment: r.comment ?? null,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: r.user
            ? {
                id: String(r.user.id ?? r.user._id),
                firstName: r.user.firstName,
                lastName: r.user.lastName ?? null,
                email: r.user.email,
                profileImage: r.user.profileImage ?? null,
            }
            : null,
        coachingCenter: r.coachingCenter
            ? {
                id: String(r.coachingCenter.id ?? r.coachingCenter._id),
                center_name: r.coachingCenter.center_name,
            }
            : null,
    }));
    return {
        ratings: ratingList,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
exports.getRatings = getRatings;
/**
 * Get a single rating by id (Mongo _id).
 */
const getRatingById = async (ratingId) => {
    if (!mongoose_1.Types.ObjectId.isValid(ratingId) || ratingId.length !== 24) {
        return null;
    }
    const rating = await coachingCenterRating_model_1.CoachingCenterRatingModel.findById(ratingId)
        .populate('user', 'id firstName lastName email profileImage')
        .populate('coachingCenter', 'id center_name')
        .lean();
    if (!rating)
        return null;
    const r = rating;
    return {
        id: r.id ?? r._id?.toString(),
        rating: r.rating,
        comment: r.comment ?? null,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: r.user
            ? {
                id: String(r.user.id ?? r.user._id),
                firstName: r.user.firstName,
                lastName: r.user.lastName ?? null,
                email: r.user.email,
                profileImage: r.user.profileImage ?? null,
            }
            : null,
        coachingCenter: r.coachingCenter
            ? {
                id: String(r.coachingCenter.id ?? r.coachingCenter._id),
                center_name: r.coachingCenter.center_name,
            }
            : null,
    };
};
exports.getRatingById = getRatingById;
/**
 * Update rating status (approve or reject). Recalculates coaching center stats when approved/rejected.
 */
const updateRatingStatus = async (ratingId, status) => {
    if (!['approved', 'rejected', 'pending'].includes(status)) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenterRating.invalidStatus'));
    }
    if (!mongoose_1.Types.ObjectId.isValid(ratingId) || ratingId.length !== 24) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenterRating.ratingNotFound'));
    }
    const ratingDoc = await coachingCenterRating_model_1.CoachingCenterRatingModel.findById(ratingId)
        .populate('coachingCenter', '_id')
        .lean();
    if (!ratingDoc) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenterRating.ratingNotFound'));
    }
    const centerObjectId = ratingDoc.coachingCenter?._id ?? ratingDoc.coachingCenter;
    const docId = ratingDoc._id;
    const updated = await coachingCenterRating_model_1.CoachingCenterRatingModel.findByIdAndUpdate(docId, { status }, { new: true })
        .populate('user', 'id firstName lastName email profileImage')
        .populate('coachingCenter', 'id center_name')
        .lean();
    if (centerObjectId) {
        await (0, coachingCenterRating_service_1.recalcCoachingCenterRatingStats)(centerObjectId);
    }
    const r = updated;
    return {
        id: r.id ?? r._id?.toString(),
        rating: r.rating,
        comment: r.comment ?? null,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: r.user
            ? {
                id: String(r.user.id ?? r.user._id),
                firstName: r.user.firstName,
                lastName: r.user.lastName ?? null,
                email: r.user.email,
                profileImage: r.user.profileImage ?? null,
            }
            : null,
        coachingCenter: r.coachingCenter
            ? {
                id: String(r.coachingCenter.id ?? r.coachingCenter._id),
                center_name: r.coachingCenter.center_name,
            }
            : null,
    };
};
exports.updateRatingStatus = updateRatingStatus;
//# sourceMappingURL=adminCoachingCenterRating.service.js.map