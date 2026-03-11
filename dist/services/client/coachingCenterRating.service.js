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
exports.getLatestRatingsForCenter = exports.getRatingsByCoachingCenterId = exports.getUserRatings = exports.submitOrUpdateRating = exports.recalcCoachingCenterRatingStats = void 0;
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const coachingCenterRating_model_1 = require("../../models/coachingCenterRating.model");
const user_model_1 = require("../../models/user.model");
const userCache_1 = require("../../utils/userCache");
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
const i18n_1 = require("../../utils/i18n");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const settings_service_1 = require("../common/settings.service");
/**
 * Recalculate and update coaching center's averageRating, totalRatings, and ratings array.
 */
const recalcCoachingCenterRatingStats = async (coachingCenterObjectId) => {
    const ratings = await coachingCenterRating_model_1.CoachingCenterRatingModel.find({
        coachingCenter: coachingCenterObjectId,
        status: 'approved',
    })
        .select('_id rating')
        .lean();
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10) / 10
        : 0;
    const ratingIds = ratings.map((r) => r._id);
    await coachingCenter_model_1.CoachingCenterModel.findByIdAndUpdate(coachingCenterObjectId, {
        averageRating,
        totalRatings,
        ratings: ratingIds,
    });
    logger_1.logger.debug('Recalculated coaching center rating stats', {
        coachingCenterId: coachingCenterObjectId.toString(),
        averageRating,
        totalRatings,
    });
};
exports.recalcCoachingCenterRatingStats = recalcCoachingCenterRatingStats;
/**
 * Submit or update a user's rating for a coaching center. One rating per user per center.
 * Rejects if settings.general.ratings_enabled is false.
 */
const submitOrUpdateRating = async (userId, coachingCenterId, input) => {
    const { rating, comment } = input;
    const settings = await (0, settings_service_1.getSettings)(false);
    if (settings.general?.ratings_enabled === false) {
        throw new ApiError_1.ApiError(403, (0, i18n_1.t)('coachingCenterRating.ratingsDisabled'));
    }
    if (typeof rating !== 'number' ||
        rating < coachingCenterRating_model_1.RATING_MIN_VALUE ||
        rating > coachingCenterRating_model_1.RATING_MAX_VALUE) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenterRating.invalidRating', { min: coachingCenterRating_model_1.RATING_MIN_VALUE, max: coachingCenterRating_model_1.RATING_MAX_VALUE }));
    }
    const [userObjectId, center] = await Promise.all([
        (0, userCache_1.getUserObjectId)(userId),
        coachingCenter_model_1.CoachingCenterModel.findOne({ id: coachingCenterId, is_deleted: false })
            .select('_id')
            .lean(),
    ]);
    if (!userObjectId) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('errors.userNotFound'));
    }
    if (!center) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenterRating.centerNotFound'));
    }
    const centerObjectId = center._id;
    const existing = await coachingCenterRating_model_1.CoachingCenterRatingModel.findOne({
        user: userObjectId,
        coachingCenter: centerObjectId,
    }).lean();
    let ratingDoc;
    let isUpdate;
    if (existing) {
        ratingDoc = await coachingCenterRating_model_1.CoachingCenterRatingModel.findByIdAndUpdate(existing._id, { rating, comment: comment ?? existing.comment ?? null, status: 'pending' }, { new: true }).lean();
        isUpdate = true;
    }
    else {
        const created = await coachingCenterRating_model_1.CoachingCenterRatingModel.create({
            user: userObjectId,
            coachingCenter: centerObjectId,
            rating,
            comment: comment ?? null,
        });
        ratingDoc = created.toObject();
        isUpdate = false;
    }
    await (0, exports.recalcCoachingCenterRatingStats)(centerObjectId);
    const id = ratingDoc.id ?? ratingDoc._id.toString();
    const result = {
        id,
        rating: ratingDoc.rating,
        comment: ratingDoc.comment ?? null,
        isUpdate,
    };
    // Non-blocking: send push notification to admins
    setImmediate(() => {
        (async () => {
            try {
                const [centerDoc, userDoc] = await Promise.all([
                    coachingCenter_model_1.CoachingCenterModel.findById(centerObjectId).select('center_name id').lean(),
                    user_model_1.UserModel.findById(userObjectId).select('firstName lastName').lean(),
                ]);
                if (!centerDoc)
                    return;
                const centerName = centerDoc.center_name || 'An academy';
                const userName = userDoc && (userDoc.firstName || userDoc.lastName)
                    ? [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim()
                    : 'A user';
                const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('../common/notification.service')));
                await createAndSendNotification({
                    recipientType: 'role',
                    roles: [defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN],
                    title: isUpdate ? 'Academy rating updated' : 'New academy rating',
                    body: `${userName} ${isUpdate ? 'updated their rating to' : 'rated'} "${centerName}" ${rating} star(s).`,
                    channels: ['push'],
                    priority: 'medium',
                    data: {
                        type: 'academy_rated',
                        coachingCenterId: coachingCenterId,
                        centerName: centerName,
                        rating: String(rating),
                        isUpdate: String(isUpdate),
                    },
                });
            }
            catch (err) {
                logger_1.logger.warn('Failed to send admin notification for academy rating (non-blocking)', {
                    error: err instanceof Error ? err.message : err,
                    coachingCenterId,
                });
            }
        })();
    });
    return result;
};
exports.submitOrUpdateRating = submitOrUpdateRating;
const getUserRatings = async (userId, page = 1, limit = 10) => {
    const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
    if (!userObjectId) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('errors.userNotFound'));
    }
    const pageNumber = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    const skip = (pageNumber - 1) * pageSize;
    const [ratings, total] = await Promise.all([
        coachingCenterRating_model_1.CoachingCenterRatingModel.find({ user: userObjectId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate('coachingCenter', 'id center_name logo')
            .lean(),
        coachingCenterRating_model_1.CoachingCenterRatingModel.countDocuments({ user: userObjectId }),
    ]);
    const totalPages = Math.ceil(total / pageSize);
    const transformedRatings = ratings.map((r) => ({
        id: r.id ?? r._id?.toString(),
        rating: r.rating,
        comment: r.comment ?? null,
        status: r.status,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        coaching_center: r.coachingCenter
            ? {
                id: r.coachingCenter.id ?? r.coachingCenter._id?.toString(),
                center_name: r.coachingCenter.center_name || 'N/A',
                logo: r.coachingCenter.logo ?? null,
            }
            : null,
    }));
    return {
        ratings: transformedRatings,
        pagination: {
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages,
            hasNextPage: pageNumber < totalPages,
            hasPrevPage: pageNumber > 1,
        },
    };
};
exports.getUserRatings = getUserRatings;
/** When user is not logged in, only this many ratings are returned. */
const GUEST_RATINGS_LIMIT = 5;
/**
 * Get paginated ratings for a coaching center. Optionally populate user info.
 * When userId is not provided (guest), returns only the first 5 ratings (page and limit ignored).
 */
const getRatingsByCoachingCenterId = async (coachingCenterId, page = 1, limit = 20, userId) => {
    const center = await coachingCenter_model_1.CoachingCenterModel.findOne({ id: coachingCenterId, is_deleted: false })
        .select('_id averageRating totalRatings')
        .lean();
    if (!center) {
        throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenterRating.centerNotFound'));
    }
    const centerObjectId = center._id;
    const isGuest = !userId;
    const pageNumber = isGuest ? 1 : Math.max(1, page);
    const pageSize = isGuest ? GUEST_RATINGS_LIMIT : Math.min(100, Math.max(1, limit));
    const skip = (pageNumber - 1) * pageSize;
    const approvedFilter = { status: 'approved' };
    const [ratings, total] = await Promise.all([
        coachingCenterRating_model_1.CoachingCenterRatingModel.find({
            coachingCenter: centerObjectId,
            ...approvedFilter,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate('user', 'id firstName lastName profileImage')
            .lean(),
        coachingCenterRating_model_1.CoachingCenterRatingModel.countDocuments({
            coachingCenter: centerObjectId,
            ...approvedFilter,
        }),
    ]);
    const ratingList = ratings.map((r) => ({
        id: r.id ?? r._id?.toString(),
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        user: r.user
            ? {
                id: r.user.id,
                firstName: r.user.firstName,
                lastName: r.user.lastName ?? null,
                profileImage: r.user.profileImage ?? null,
            }
            : null,
    }));
    return {
        ratings: ratingList,
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: isGuest ? 1 : Math.ceil(total / pageSize),
        averageRating: center.averageRating ?? 0,
        totalRatings: center.totalRatings ?? 0,
    };
};
exports.getRatingsByCoachingCenterId = getRatingsByCoachingCenterId;
/**
 * Get latest N ratings for a coaching center. If userId provided, put that user's rating first and set isAlreadyRated/canUpdateRating.
 */
const getLatestRatingsForCenter = async (coachingCenterId, limit = 5, userId) => {
    const center = await coachingCenter_model_1.CoachingCenterModel.findOne({
        id: coachingCenterId,
        is_deleted: false,
    })
        .select('_id averageRating totalRatings')
        .lean();
    if (!center) {
        return {
            ratings: [],
            averageRating: 0,
            totalRatings: 0,
            isAlreadyRated: false,
            canUpdateRating: false,
        };
    }
    const centerObjectId = center._id;
    const averageRating = center.averageRating ?? 0;
    const totalRatings = center.totalRatings ?? 0;
    let isAlreadyRated = false;
    let canUpdateRating = false;
    let myRatingDoc = null;
    if (userId) {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (userObjectId) {
            myRatingDoc = await coachingCenterRating_model_1.CoachingCenterRatingModel.findOne({
                user: userObjectId,
                coachingCenter: centerObjectId,
            })
                .populate('user', 'id firstName lastName profileImage')
                .lean();
            if (myRatingDoc) {
                isAlreadyRated = true;
                canUpdateRating = true;
            }
        }
    }
    // Client: only show approved ratings
    const latestRatings = await coachingCenterRating_model_1.CoachingCenterRatingModel.find({
        coachingCenter: centerObjectId,
        status: 'approved',
    })
        .sort({ createdAt: -1 })
        .limit(limit +
        (myRatingDoc &&
            myRatingDoc.status === 'approved'
            ? 1
            : 0))
        .populate('user', 'id firstName lastName profileImage')
        .lean();
    const toListItem = (r, isOwn = false) => ({
        id: r.id ?? r._id?.toString(),
        rating: r.rating,
        comment: r.comment ?? null,
        status: isOwn ? r.status : undefined,
        isOwn: isOwn || undefined,
        createdAt: r.createdAt,
        user: r.user
            ? {
                id: r.user.id,
                firstName: r.user.firstName,
                lastName: r.user.lastName ?? null,
                profileImage: r.user.profileImage ?? null,
            }
            : null,
    });
    let ratings = latestRatings.map((r) => toListItem(r));
    if (myRatingDoc) {
        const myId = myRatingDoc.id ?? myRatingDoc._id?.toString();
        const existingIndex = ratings.findIndex((r) => r.id === myId);
        if (existingIndex >= 0) {
            ratings.splice(existingIndex, 1);
            ratings = [toListItem(myRatingDoc, true), ...ratings].slice(0, limit);
        }
        else {
            ratings = [toListItem(myRatingDoc, true), ...ratings].slice(0, limit);
        }
    }
    else {
        ratings = ratings.slice(0, limit);
    }
    return {
        ratings,
        averageRating,
        totalRatings,
        isAlreadyRated,
        canUpdateRating,
    };
};
exports.getLatestRatingsForCenter = getLatestRatingsForCenter;
//# sourceMappingURL=coachingCenterRating.service.js.map