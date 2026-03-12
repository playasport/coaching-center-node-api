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
exports.getRandomBanner = exports.updateCoachingCenter = exports.removeMediaFromCoachingCenter = exports.toggleCoachingCenterStatus = exports.deleteCoachingCenter = exports.getCoachingCenterById = exports.getCoachingCentersByUser = exports.createCoachingCenter = void 0;
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const coachingCenterStatus_enum_1 = require("../../enums/coachingCenterStatus.enum");
const sport_model_1 = require("../../models/sport.model");
const user_model_1 = require("../../models/user.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const env_1 = require("../../config/env");
const userCache_1 = require("../../utils/userCache");
const sportCache_1 = require("../../utils/sportCache");
const commonService = __importStar(require("../common/coachingCenterCommon.service"));
const role_model_1 = require("../../models/role.model");
const adminApprove_enum_1 = require("../../enums/adminApprove.enum");
/**
 * Create coaching center for an academy user
 */
const createCoachingCenter = async (data, userId) => {
    const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
    if (!userObjectId)
        throw new ApiError_1.ApiError(404, 'User not found');
    // Validate sports and resolve facilities in parallel
    // Support both ObjectId and UUID for sport IDs
    const sportIds = data.sports ? await (0, sportCache_1.getSportObjectIds)(data.sports) : [];
    const [sportsCount, facilityIds] = await Promise.all([
        sportIds.length > 0 ? sport_model_1.SportModel.countDocuments({ _id: { $in: sportIds } }) : Promise.resolve(0),
        data.facility ? commonService.resolveFacilities(data.facility) : Promise.resolve([]),
    ]);
    if (data.sports && data.sports.length > 0 && sportsCount !== data.sports.length) {
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.sports.invalid'));
    }
    // Prepare data - set approval_status to pending_approval by default for academy-created centers
    const coachingCenterData = {
        ...data,
        user: userObjectId,
        sports: sportIds,
        facility: facilityIds,
        approval_status: adminApprove_enum_1.AdminApproveStatus.PENDING_APPROVAL, // Academy-created centers need approval
        sport_details: data.sport_details ? await Promise.all(data.sport_details.map(async (sd) => {
            const sportObjectId = await (0, sportCache_1.getSportObjectId)(sd.sport_id);
            if (!sportObjectId) {
                throw new ApiError_1.ApiError(400, `Invalid sport ID: ${sd.sport_id}`);
            }
            return {
                ...sd,
                sport_id: sportObjectId
            };
        })) : undefined
    };
    delete coachingCenterData.description;
    // Save
    const coachingCenter = new coachingCenter_model_1.CoachingCenterModel(coachingCenterData);
    await coachingCenter.save();
    // Move files if published (async - non-blocking)
    if (data.status === 'published') {
        try {
            const coachingCenterObj = coachingCenter.toObject();
            const fileUrls = commonService.extractFileUrlsFromCoachingCenter(coachingCenterObj);
            // Enqueue media move as background job (non-blocking)
            if (fileUrls.length > 0) {
                const { enqueueMediaMove } = await Promise.resolve().then(() => __importStar(require('../../queue/mediaMoveQueue')));
                enqueueMediaMove({
                    coachingCenterId: coachingCenter._id.toString(),
                    fileUrls,
                    timestamp: Date.now(),
                }).catch((error) => {
                    logger_1.logger.error('Failed to enqueue media move job (non-blocking)', {
                        coachingCenterId: coachingCenter._id.toString(),
                        fileCount: fileUrls.length,
                        error: error instanceof Error ? error.message : error,
                    });
                });
            }
            // Enqueue thumbnail generation (already async)
            commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj).catch((error) => {
                logger_1.logger.error('Failed to enqueue thumbnail generation (non-blocking)', {
                    coachingCenterId: coachingCenter._id.toString(),
                    error: error instanceof Error ? error.message : error,
                });
            });
        }
        catch (mediaError) {
            logger_1.logger.error('Failed to prepare media move job:', {
                error: mediaError instanceof Error ? mediaError.message : mediaError,
                stack: mediaError instanceof Error ? mediaError.stack : undefined,
                coachingCenterId: coachingCenter._id.toString()
            });
            // Don't fail the entire creation if media move preparation fails
        }
    }
    // Send notifications to admin and super_admin when coaching center is published (async - non-blocking)
    if (data.status === 'published') {
        // Fire and forget - don't await, process in background
        (async () => {
            try {
                const { createAndSendNotification } = await Promise.resolve().then(() => __importStar(require('../common/notification.service')));
                const centerName = coachingCenter.center_name || 'Unnamed Academy';
                const creationDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                // Get user info for notifications
                const user = await user_model_1.UserModel.findOne({ _id: userObjectId })
                    .select('firstName lastName email')
                    .lean();
                const ownerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown';
                // Send notification when coaching center is published
                const notificationInput = {
                    recipientType: 'role',
                    roles: [role_model_1.DefaultRoles.ADMIN, role_model_1.DefaultRoles.SUPER_ADMIN],
                    title: 'New Academy Published',
                    body: `A new academy "${centerName}" has been published by ${ownerName} and requires approval.`,
                    channels: ['push'],
                    priority: 'medium',
                    data: {
                        type: 'coaching_center_published',
                        coachingCenterId: coachingCenter.id,
                        centerName: centerName,
                        ownerId: userId,
                        ownerName: ownerName,
                        approvalStatus: adminApprove_enum_1.AdminApproveStatus.PENDING_APPROVAL,
                        creationDate,
                    },
                    metadata: {
                        source: 'academy_coaching_center_published',
                        requiresApproval: true,
                    },
                };
                createAndSendNotification(notificationInput).catch((error) => {
                    logger_1.logger.error('Failed to create notification for published coaching center (non-blocking)', {
                        error: error instanceof Error ? error.message : error,
                        coachingCenterId: coachingCenter._id.toString()
                    });
                });
            }
            catch (notificationError) {
                logger_1.logger.error('Failed to send admin notification for published coaching center (non-blocking)', {
                    notificationError: notificationError instanceof Error ? notificationError.message : notificationError,
                    coachingCenterId: coachingCenter._id.toString()
                });
                // Don't throw error - notification failure shouldn't break creation
            }
        })().catch((error) => {
            logger_1.logger.error('Unexpected error in notification background task', {
                error: error instanceof Error ? error.message : error,
                coachingCenterId: coachingCenter._id.toString()
            });
        });
    }
    return await commonService.getCoachingCenterById(coachingCenter._id.toString());
};
exports.createCoachingCenter = createCoachingCenter;
/**
 * Get coaching centers by user
 */
const getCoachingCentersByUser = async (userId, page = 1, limit = env_1.config.pagination.defaultLimit) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId)
            throw new ApiError_1.ApiError(404, 'User not found');
        const query = { user: userObjectId, is_deleted: false };
        // Execute count and find queries in parallel
        const [total, coachingCenters] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.countDocuments(query),
            coachingCenter_model_1.CoachingCenterModel.find(query)
                .populate('sports', 'custom_id name logo is_popular')
                .populate('sport_details.sport_id', 'custom_id name logo is_popular')
                .populate('facility', 'custom_id name description icon')
                .populate({
                path: 'user',
                select: 'id firstName lastName email',
                match: { isDeleted: false },
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
        ]);
        const totalPages = Math.ceil(total / pageSize);
        // Filter and remove unwanted fields from each coaching center
        const filteredCenters = coachingCenters.map((center) => {
            // Remove specified fields from response
            const { addedBy, rules_regulation, sport_details, age, facility, operational_timing, call_timing, training_timing, bank_information, is_deleted, deletedAt, documents, createdAt, updatedAt, user, experience, ...filteredCenter } = center;
            return filteredCenter;
        });
        return {
            data: filteredCenters,
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
        logger_1.logger.error('Failed to fetch user coaching centers:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.list.failed'));
    }
};
exports.getCoachingCentersByUser = getCoachingCentersByUser;
/**
 * Re-export common functions for backward compatibility or easier access
 */
exports.getCoachingCenterById = commonService.getCoachingCenterById;
exports.deleteCoachingCenter = commonService.deleteCoachingCenter;
exports.toggleCoachingCenterStatus = commonService.toggleCoachingCenterStatus;
/**
 * Remove media from coaching center (soft delete)
 * Supports: logo, documents, and sport_details media (images, videos)
 */
const removeMediaFromCoachingCenter = async (coachingCenterId, mediaType, uniqueId, sportId // Required for image/video (sport-specific media)
) => {
    try {
        const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findById(coachingCenterId);
        if (!coachingCenter) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        }
        const now = new Date();
        if (mediaType === 'logo') {
            // Soft delete logo
            coachingCenter.logo = null;
            await coachingCenter.save({ validateBeforeSave: false });
            logger_1.logger.info('Logo soft deleted from coaching center', { coachingCenterId });
            return;
        }
        if (mediaType === 'document') {
            // Soft delete document from general documents array
            const documentIndex = coachingCenter.documents?.findIndex((doc) => doc.unique_id === uniqueId && !doc.is_deleted);
            if (documentIndex === -1 || documentIndex === undefined) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
            }
            if (coachingCenter.documents && coachingCenter.documents[documentIndex]) {
                coachingCenter.documents[documentIndex].is_deleted = true;
                coachingCenter.documents[documentIndex].deletedAt = now;
                coachingCenter.markModified('documents');
                await coachingCenter.save({ validateBeforeSave: false });
                logger_1.logger.info('Document soft deleted from coaching center', {
                    coachingCenterId,
                    uniqueId,
                });
            }
            return;
        }
        // For image/video, sportId is required
        if ((mediaType === 'image' || mediaType === 'video') && !sportId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.sportIdRequired'));
        }
        // Find sport detail by sport_id
        const sportDetailIndex = coachingCenter.sport_details?.findIndex((detail) => detail.sport_id.toString() === sportId);
        if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.sportDetailNotFound'));
        }
        const sportDetail = coachingCenter.sport_details[sportDetailIndex];
        if (mediaType === 'image') {
            // Soft delete image from sport_details
            const imageIndex = sportDetail.images?.findIndex((img) => img.unique_id === uniqueId && !img.is_deleted);
            if (imageIndex === -1 || imageIndex === undefined) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
            }
            if (sportDetail.images && sportDetail.images[imageIndex]) {
                sportDetail.images[imageIndex].is_deleted = true;
                sportDetail.images[imageIndex].deletedAt = now;
                coachingCenter.markModified(`sport_details.${sportDetailIndex}.images`);
                await coachingCenter.save({ validateBeforeSave: false });
                logger_1.logger.info('Image soft deleted from coaching center', {
                    coachingCenterId,
                    sportId,
                    uniqueId,
                });
            }
            return;
        }
        if (mediaType === 'video') {
            // Soft delete video from sport_details
            const videoIndex = sportDetail.videos?.findIndex((video) => video.unique_id === uniqueId && !video.is_deleted);
            if (videoIndex === -1 || videoIndex === undefined) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.media.notFound'));
            }
            if (sportDetail.videos && sportDetail.videos[videoIndex]) {
                sportDetail.videos[videoIndex].is_deleted = true;
                sportDetail.videos[videoIndex].deletedAt = now;
                coachingCenter.markModified(`sport_details.${sportDetailIndex}.videos`);
                await coachingCenter.save({ validateBeforeSave: false });
                logger_1.logger.info('Video soft deleted from coaching center', {
                    coachingCenterId,
                    sportId,
                    uniqueId,
                });
            }
            return;
        }
        throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.media.invalidType'));
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to remove media from coaching center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.media.removeFailed'));
    }
};
exports.removeMediaFromCoachingCenter = removeMediaFromCoachingCenter;
/**
 * Update coaching center
 */
const updateCoachingCenter = async (id, data) => {
    try {
        const existingCenter = await coachingCenter_model_1.CoachingCenterModel.findById(id);
        if (!existingCenter || existingCenter.is_deleted)
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('coachingCenter.notFound'));
        const updates = {};
        // Validate sports and resolve facilities in parallel if both are being updated
        if (data.sports !== undefined || data.facility !== undefined) {
            // Support both ObjectId and UUID for sport IDs
            const sportIds = data.sports ? await (0, sportCache_1.getSportObjectIds)(data.sports) : null;
            const [sportsCount, facilityIds] = await Promise.all([
                sportIds && sportIds.length > 0
                    ? sport_model_1.SportModel.countDocuments({ _id: { $in: sportIds } })
                    : Promise.resolve(0),
                data.facility !== undefined
                    ? (data.facility ? commonService.resolveFacilities(data.facility) : Promise.resolve([]))
                    : Promise.resolve(null),
            ]);
            if (data.sports !== undefined) {
                if (sportsCount !== data.sports.length) {
                    throw new ApiError_1.ApiError(400, (0, i18n_1.t)('coachingCenter.sports.invalid'));
                }
                updates.sports = sportIds;
            }
            if (data.facility !== undefined && facilityIds !== null) {
                updates.facility = facilityIds;
            }
        }
        if (data.status === 'published' && existingCenter.status !== 'published') {
            commonService.validatePublishStatus({ ...existingCenter.toObject(), ...data }, false);
        }
        // Handle other fields (include status so draft -> published update is applied)
        const fields = [
            'email', 'mobile_number', 'center_name', 'rules_regulation', 'logo', 'age',
            'location', 'operational_timing', 'documents',
            'allowed_genders', 'allowed_disabled', 'is_only_for_disabled', 'experience', 'user',
            'status',
        ];
        fields.forEach(f => { if (data[f] !== undefined)
            updates[f] = data[f]; });
        // Note: sport_details merge logic would go here if needed, keeping it simple for now or using common logic
        // For now using basic update
        // Support both ObjectId and UUID for sport IDs in sport_details
        if (data.sport_details) {
            updates.sport_details = await Promise.all(data.sport_details.map(async (sd) => {
                const sportObjectId = await (0, sportCache_1.getSportObjectId)(sd.sport_id);
                if (!sportObjectId) {
                    throw new ApiError_1.ApiError(400, `Invalid sport ID: ${sd.sport_id}`);
                }
                return {
                    ...sd,
                    sport_id: sportObjectId
                };
            }));
        }
        const updatedCenter = await coachingCenter_model_1.CoachingCenterModel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
        // Handle media file movement and thumbnail generation
        // If status changed to published OR center is already published (checking for new temp files)
        const isNowPublished = data.status === 'published' && existingCenter.status !== 'published';
        const wasAlreadyPublished = existingCenter.status === 'published';
        if (isNowPublished || wasAlreadyPublished) {
            // Move temp files to permanent (async - non-blocking)
            // Handles both new status and new media in existing published center
            try {
                const coachingCenterObj = updatedCenter;
                const fileUrls = commonService.extractFileUrlsFromCoachingCenter(coachingCenterObj);
                // Enqueue media move as background job (non-blocking)
                if (fileUrls.length > 0) {
                    const { enqueueMediaMove } = await Promise.resolve().then(() => __importStar(require('../../queue/mediaMoveQueue')));
                    enqueueMediaMove({
                        coachingCenterId: id,
                        fileUrls,
                        timestamp: Date.now(),
                    }).catch((error) => {
                        logger_1.logger.error('Failed to enqueue media move job during update (non-blocking)', {
                            coachingCenterId: id,
                            fileCount: fileUrls.length,
                            error: error instanceof Error ? error.message : error,
                        });
                    });
                }
                // Enqueue thumbnail generation (already async)
                commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj).catch((error) => {
                    logger_1.logger.error('Failed to enqueue thumbnail generation during update (non-blocking)', {
                        coachingCenterId: id,
                        error: error instanceof Error ? error.message : error,
                    });
                });
            }
            catch (mediaError) {
                logger_1.logger.error('Failed to prepare media move job during update:', {
                    error: mediaError instanceof Error ? mediaError.message : mediaError,
                    stack: mediaError instanceof Error ? mediaError.stack : undefined,
                    coachingCenterId: id
                });
                // Do not re-throw, allow update to succeed even if media movement preparation fails
            }
        }
        return await commonService.getCoachingCenterById(id);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Update failed:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('coachingCenter.update.failed'));
    }
};
exports.updateCoachingCenter = updateCoachingCenter;
const DEFAULT_BANNER_URL = 'https://media-playsport.s3.ap-south-1.amazonaws.com/partner/banner.jpg';
/**
 * Get a random image URL from any active CoachingCenter (logo or sport_details images).
 * Returns default banner URL if no images found.
 */
const getRandomBanner = async () => {
    const centers = await coachingCenter_model_1.CoachingCenterModel.find({
        status: coachingCenterStatus_enum_1.CoachingCenterStatus.PUBLISHED,
        is_active: true,
        is_deleted: false,
        approval_status: adminApprove_enum_1.AdminApproveStatus.APPROVE,
    })
        .select('logo sport_details')
        .lean();
    const imageUrls = [];
    for (const center of centers) {
        if (center.logo && center.logo.trim()) {
            imageUrls.push(center.logo.trim());
        }
        if (center.sport_details && Array.isArray(center.sport_details)) {
            for (const sd of center.sport_details) {
                if (sd.images && Array.isArray(sd.images)) {
                    for (const img of sd.images) {
                        if (img.url && img.is_active && !img.is_deleted) {
                            imageUrls.push(img.url.trim());
                        }
                    }
                }
            }
        }
    }
    const imageUrl = imageUrls.length > 0 ? imageUrls[Math.floor(Math.random() * imageUrls.length)] : DEFAULT_BANNER_URL;
    return { imageUrl };
};
exports.getRandomBanner = getRandomBanner;
//# sourceMappingURL=coachingCenter.service.js.map