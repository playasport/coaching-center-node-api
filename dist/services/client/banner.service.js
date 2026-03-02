"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackBannerClick = exports.trackBannerView = exports.getActiveBannersByPosition = void 0;
const banner_model_1 = require("../../models/banner.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const mongoose_1 = require("mongoose");
/**
 * Get active banners by position (for public/user API)
 * Returns only active banners that are currently scheduled and match the position
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
        else if (!options?.academyOnly) {
            // If centerId is NOT provided and this is NOT an academy route,
            // exclude banners that are marked as academy-only
            // Only show banners that are NOT academy-only
            andConditions.push({
                isOnlyForAcademy: false,
            });
        }
        // Filter by target audience if provided
        if (options?.targetAudience) {
            andConditions.push({
                $or: [
                    { targetAudience: 'all' },
                    { targetAudience: options.targetAudience },
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
/**
 * Track banner view (increment viewCount)
 */
const trackBannerView = async (bannerId) => {
    try {
        // Handle both custom id field and MongoDB _id
        const query = { deletedAt: null };
        if (mongoose_1.Types.ObjectId.isValid(bannerId) && bannerId.length === 24) {
            // If it's a valid ObjectId, try _id first, then fall back to id
            query.$or = [{ _id: new mongoose_1.Types.ObjectId(bannerId) }, { id: bannerId }];
        }
        else {
            // Otherwise, use the custom id field
            query.id = bannerId;
        }
        const result = await banner_model_1.BannerModel.updateOne(query, { $inc: { viewCount: 1 } });
        if (result.matchedCount === 0) {
            logger_1.logger.warn(`Banner not found for view tracking: ${bannerId}`);
        }
        else if (result.modifiedCount === 0) {
            logger_1.logger.warn(`Banner view count not updated (already at limit?): ${bannerId}`);
        }
        else {
            logger_1.logger.debug(`Banner view tracked successfully: ${bannerId}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to track banner view:', error);
        // Don't throw error for tracking - it's not critical
    }
};
exports.trackBannerView = trackBannerView;
/**
 * Track banner click (increment clickCount)
 */
const trackBannerClick = async (bannerId) => {
    try {
        // Handle both custom id field and MongoDB _id
        const query = { deletedAt: null };
        if (mongoose_1.Types.ObjectId.isValid(bannerId) && bannerId.length === 24) {
            // If it's a valid ObjectId, try _id first, then fall back to id
            query.$or = [{ _id: new mongoose_1.Types.ObjectId(bannerId) }, { id: bannerId }];
        }
        else {
            // Otherwise, use the custom id field
            query.id = bannerId;
        }
        const result = await banner_model_1.BannerModel.updateOne(query, { $inc: { clickCount: 1 } });
        if (result.matchedCount === 0) {
            logger_1.logger.warn(`Banner not found for click tracking: ${bannerId}`);
        }
        else if (result.modifiedCount === 0) {
            logger_1.logger.warn(`Banner click count not updated (already at limit?): ${bannerId}`);
        }
        else {
            logger_1.logger.debug(`Banner click tracked successfully: ${bannerId}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to track banner click:', error);
        // Don't throw error for tracking - it's not critical
    }
};
exports.trackBannerClick = trackBannerClick;
//# sourceMappingURL=banner.service.js.map