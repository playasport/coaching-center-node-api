"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHighlightView = exports.getHighlightById = exports.getHighlightsList = void 0;
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const streamHighlight_model_2 = require("../../models/streamHighlight.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const mongoose_1 = require("mongoose");
/**
 * Get paginated list of published highlights (minimal data)
 */
const getHighlightsList = async (page = 1, limit = 10) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(100, Math.max(1, Math.floor(limit))); // Max 100 per page
        // Calculate skip
        const skip = (pageNumber - 1) * pageSize;
        // Build query - only get published, non-deleted highlights with video processing done
        const query = {
            status: streamHighlight_model_1.HighlightStatus.PUBLISHED,
            videoProcessingStatus: streamHighlight_model_2.VideoProcessingStatus.COMPLETED,
            deletedAt: null,
        };
        // Get total count
        const total = await streamHighlight_model_1.StreamHighlightModel.countDocuments(query);
        // Get highlights (minimal data)
        const highlights = await streamHighlight_model_1.StreamHighlightModel.find(query)
            .select('id thumbnailUrl title viewsCount createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();
        // Format highlights for response
        const formattedHighlights = highlights.map((highlight) => ({
            id: highlight.id,
            thumbnail: highlight.thumbnailUrl || '',
            title: highlight.title,
            viewers: highlight.viewsCount || 0,
            createdAt: highlight.createdAt,
        }));
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Highlights list fetched', {
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages,
        });
        return {
            highlights: formattedHighlights,
            total,
            current_page: pageNumber,
            total_pages: totalPages,
            limit: pageSize,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch highlights list:', error);
        throw new ApiError_1.ApiError(500, 'Failed to fetch highlights list');
    }
};
exports.getHighlightsList = getHighlightsList;
/**
 * Get highlight details by ID
 */
const getHighlightById = async (highlightId) => {
    try {
        // Handle both custom id field and MongoDB _id
        const query = {
            deletedAt: null,
            status: streamHighlight_model_1.HighlightStatus.PUBLISHED,
        };
        if (mongoose_1.Types.ObjectId.isValid(highlightId) && highlightId.length === 24) {
            // If it's a valid ObjectId, try _id first, then fall back to id
            query.$or = [{ _id: new mongoose_1.Types.ObjectId(highlightId) }, { id: highlightId }];
        }
        else {
            // Otherwise, use the custom id field
            query.id = highlightId;
        }
        // Get highlight with populated references
        const highlight = await streamHighlight_model_1.StreamHighlightModel.findOne(query)
            .populate('userId', 'id firstName lastName profileImage')
            .populate({
            path: 'coachingCenterId',
            select: 'id center_name logo sports',
            populate: {
                path: 'sports',
                select: 'custom_id name logo',
            },
        })
            .lean();
        if (!highlight) {
            throw new ApiError_1.ApiError(404, 'Highlight not found');
        }
        // Format user data
        let userData = null;
        if (highlight.userId) {
            const user = highlight.userId;
            userData = {
                id: user._id?.toString() || user.id || '',
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
                logo: user.profileImage || null,
            };
        }
        // Format sports data from coaching center
        let sportsData = [];
        if (highlight.coachingCenterId) {
            const coachingCenter = highlight.coachingCenterId;
            if (coachingCenter.sports && Array.isArray(coachingCenter.sports)) {
                sportsData = coachingCenter.sports.map((sport) => ({
                    id: sport.custom_id || sport._id?.toString() || '',
                    name: sport.name || '',
                    logo: sport.logo || null,
                }));
            }
        }
        // Format coaching center data
        let coachingCenterData = null;
        if (highlight.coachingCenterId) {
            const coachingCenter = highlight.coachingCenterId;
            coachingCenterData = {
                id: coachingCenter._id?.toString() || coachingCenter.id || '',
                name: coachingCenter.center_name || '',
                logo: coachingCenter.logo || null,
            };
        }
        // Use masterM3u8Url if available, otherwise fall back to videoUrl
        const playLink = highlight.masterM3u8Url || highlight.videoUrl || '';
        const formattedHighlight = {
            id: highlight.id,
            title: highlight.title,
            description: highlight.description || null,
            thumbnail: highlight.thumbnailUrl || null,
            playLink,
            views: highlight.viewsCount || 0,
            createdAt: highlight.createdAt,
            user: userData,
            sports: sportsData,
            coachingCenter: coachingCenterData,
        };
        logger_1.logger.info('Highlight details fetched', {
            highlightId: highlight.id,
        });
        return formattedHighlight;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch highlight details:', error);
        throw new ApiError_1.ApiError(500, 'Failed to fetch highlight details');
    }
};
exports.getHighlightById = getHighlightById;
/**
 * Update highlight view count (increment viewsCount)
 */
const updateHighlightView = async (highlightId) => {
    try {
        // Handle both custom id field and MongoDB _id
        const query = { deletedAt: null };
        if (mongoose_1.Types.ObjectId.isValid(highlightId) && highlightId.length === 24) {
            // If it's a valid ObjectId, try _id first, then fall back to id
            query.$or = [{ _id: new mongoose_1.Types.ObjectId(highlightId) }, { id: highlightId }];
        }
        else {
            // Otherwise, use the custom id field
            query.id = highlightId;
        }
        // Use findOneAndUpdate to get the updated document
        const updatedHighlight = await streamHighlight_model_1.StreamHighlightModel.findOneAndUpdate(query, { $inc: { viewsCount: 1 } }, { new: true, select: 'viewsCount' }).lean();
        if (!updatedHighlight) {
            logger_1.logger.warn(`Highlight not found for view tracking: ${highlightId}`);
            return 0;
        }
        const viewCount = updatedHighlight.viewsCount || 0;
        logger_1.logger.debug(`Highlight view tracked successfully: ${highlightId}, new count: ${viewCount}`);
        return viewCount;
    }
    catch (error) {
        logger_1.logger.error('Failed to track highlight view:', error);
        // Return 0 on error - it's not critical
        return 0;
    }
};
exports.updateHighlightView = updateHighlightView;
//# sourceMappingURL=highlight.service.js.map