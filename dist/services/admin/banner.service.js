"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveBannersByPosition = exports.reorderBanners = exports.updateBannerStatus = exports.deleteBanner = exports.updateBanner = exports.createBanner = exports.getBannerById = exports.getAllBanners = void 0;
const mongoose_1 = require("mongoose");
const banner_model_1 = require("../../models/banner.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
/**
 * Get all banners for admin with filters and pagination
 */
const getAllBanners = async (params = {}) => {
    try {
        const query = { deletedAt: null };
        // Filter by position if provided
        if (params.position) {
            query.position = params.position;
        }
        // Filter by status if provided
        if (params.status) {
            query.status = params.status;
        }
        // Filter by target audience if provided
        if (params.targetAudience) {
            query.targetAudience = params.targetAudience;
        }
        // Filter by active status if provided
        if (params.isActive !== undefined) {
            query.isActive = params.isActive;
        }
        // Search by title or description
        if (params.search) {
            const searchRegex = new RegExp(params.search, 'i');
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
            ];
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Sorting
        const sortField = params.sortBy || 'createdAt';
        const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await banner_model_1.BannerModel.countDocuments(query);
        // Get banners
        const banners = await banner_model_1.BannerModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const transformedBanners = banners.map((banner) => {
            return {
                id: banner.id,
                title: banner.title,
                description: banner.description || null,
                imageUrl: banner.imageUrl,
                mobileImageUrl: banner.mobileImageUrl || null,
                linkUrl: banner.linkUrl || null,
                position: banner.position,
                priority: banner.priority,
                status: banner.status,
                targetAudience: banner.targetAudience,
                isActive: banner.isActive,
                isOnlyForAcademy: banner.isOnlyForAcademy,
                clickCount: banner.clickCount,
                viewCount: banner.viewCount,
                createdAt: banner.createdAt,
            };
        });
        return {
            banners: transformedBanners,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get banners:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllBanners = getAllBanners;
/**
 * Get banner by ID for admin
 */
const getBannerById = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const banner = await banner_model_1.BannerModel.findOne({ ...query, deletedAt: null }).lean();
        return banner;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to get banner by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getBannerById = getBannerById;
/**
 * Create new banner
 */
const createBanner = async (data, adminId) => {
    try {
        const bannerData = {
            title: data.title,
            description: data.description || null,
            imageUrl: data.imageUrl,
            mobileImageUrl: data.mobileImageUrl || null,
            linkUrl: data.linkUrl || null,
            linkType: data.linkType || null,
            position: data.position,
            priority: data.priority || 0,
            status: data.status || banner_model_1.BannerStatus.DRAFT,
            targetAudience: data.targetAudience || banner_model_1.BannerTargetAudience.ALL,
            isActive: data.isActive !== undefined ? data.isActive : true,
            isOnlyForAcademy: data.isOnlyForAcademy !== undefined ? data.isOnlyForAcademy : false,
            sportIds: data.sportIds || null,
            centerIds: data.centerIds || null,
            metadata: data.metadata || null,
            createdBy: adminId || null,
            clickCount: 0,
            viewCount: 0,
        };
        const banner = new banner_model_1.BannerModel(bannerData);
        await banner.save();
        logger_1.logger.info(`Banner created: ${banner.id} by admin ${adminId}`);
        return banner.toObject();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
            throw new ApiError_1.ApiError(400, 'Banner with this ID already exists');
        }
        logger_1.logger.error('Admin failed to create banner:', error);
        throw new ApiError_1.ApiError(500, 'Failed to create banner');
    }
};
exports.createBanner = createBanner;
/**
 * Update banner by admin
 */
const updateBanner = async (id, data, adminId) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const banner = await banner_model_1.BannerModel.findOne({ ...query, deletedAt: null });
        if (!banner) {
            throw new ApiError_1.ApiError(404, 'Banner not found');
        }
        // Update fields
        if (data.title !== undefined)
            banner.title = data.title;
        if (data.description !== undefined)
            banner.description = data.description;
        if (data.imageUrl !== undefined)
            banner.imageUrl = data.imageUrl;
        if (data.mobileImageUrl !== undefined)
            banner.mobileImageUrl = data.mobileImageUrl;
        if (data.linkUrl !== undefined)
            banner.linkUrl = data.linkUrl;
        if (data.linkType !== undefined)
            banner.linkType = data.linkType;
        if (data.position !== undefined)
            banner.position = data.position;
        if (data.priority !== undefined)
            banner.priority = data.priority;
        if (data.status !== undefined)
            banner.status = data.status;
        if (data.targetAudience !== undefined)
            banner.targetAudience = data.targetAudience;
        if (data.isActive !== undefined)
            banner.isActive = data.isActive;
        if (data.isOnlyForAcademy !== undefined)
            banner.isOnlyForAcademy = data.isOnlyForAcademy;
        if (data.sportIds !== undefined)
            banner.sportIds = data.sportIds;
        if (data.centerIds !== undefined)
            banner.centerIds = data.centerIds;
        if (data.metadata !== undefined)
            banner.metadata = data.metadata;
        if (adminId)
            banner.updatedBy = adminId;
        await banner.save();
        logger_1.logger.info(`Banner updated: ${id} by admin ${adminId}`);
        return banner.toObject();
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to update banner:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update banner');
    }
};
exports.updateBanner = updateBanner;
/**
 * Delete banner (soft delete)
 */
const deleteBanner = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const banner = await banner_model_1.BannerModel.findOne({ ...query, deletedAt: null });
        if (!banner) {
            throw new ApiError_1.ApiError(404, 'Banner not found');
        }
        banner.deletedAt = new Date();
        await banner.save();
        logger_1.logger.info(`Banner soft deleted: ${id}`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to delete banner:', error);
        throw new ApiError_1.ApiError(500, 'Failed to delete banner');
    }
};
exports.deleteBanner = deleteBanner;
/**
 * Update banner status
 */
const updateBannerStatus = async (id, status, adminId) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
        const banner = await banner_model_1.BannerModel.findOneAndUpdate({ ...query, deletedAt: null }, {
            $set: {
                status,
                updatedBy: adminId || null,
            },
        }, { new: true }).lean();
        if (!banner) {
            throw new ApiError_1.ApiError(404, 'Banner not found');
        }
        logger_1.logger.info(`Banner status updated to ${status} for banner ${id} by admin ${adminId}`);
        return banner;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Admin failed to update banner status:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update banner status');
    }
};
exports.updateBannerStatus = updateBannerStatus;
/**
 * Reorder banners (update priorities)
 */
const reorderBanners = async (bannerOrders, adminId) => {
    try {
        const updatePromises = bannerOrders.map(({ id, priority }) => {
            const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
            return banner_model_1.BannerModel.findOneAndUpdate({ ...query, deletedAt: null }, {
                $set: {
                    priority,
                    updatedBy: adminId || null,
                },
            });
        });
        await Promise.all(updatePromises);
        logger_1.logger.info(`Banners reordered by admin ${adminId}`);
    }
    catch (error) {
        logger_1.logger.error('Admin failed to reorder banners:', error);
        throw new ApiError_1.ApiError(500, 'Failed to reorder banners');
    }
};
exports.reorderBanners = reorderBanners;
/**
 * Get active banners by position (for public API)
 */
const getActiveBannersByPosition = async (position, options) => {
    try {
        const andConditions = [];
        // Filter by sport if provided
        if (options?.sportId) {
            andConditions.push({
                $or: [
                    { sportIds: null },
                    { sportIds: { $in: [options.sportId] } },
                ],
            });
        }
        // Filter by center if provided
        if (options?.centerId) {
            andConditions.push({
                $or: [
                    { centerIds: null },
                    { centerIds: { $in: [options.centerId] } },
                ],
            });
        }
        const query = {
            position,
            isActive: true,
            status: banner_model_1.BannerStatus.ACTIVE,
            deletedAt: null,
            $and: andConditions,
        };
        const limit = options?.limit || 10;
        const banners = await banner_model_1.BannerModel.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .limit(limit)
            .lean();
        return banners;
    }
    catch (error) {
        logger_1.logger.error('Failed to get active banners by position:', error);
        throw new ApiError_1.ApiError(500, 'Failed to get active banners');
    }
};
exports.getActiveBannersByPosition = getActiveBannersByPosition;
//# sourceMappingURL=banner.service.js.map