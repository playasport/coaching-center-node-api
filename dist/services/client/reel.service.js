"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReelView = exports.getReelsListWithIdFirst = exports.getReelsList = void 0;
const reel_model_1 = require("../../models/reel.model");
const streamHighlight_model_1 = require("../../models/streamHighlight.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const mongoose_1 = require("mongoose");
/**
 * Format reel data for API response
 * Note: All URLs are already stored in the database, so we use them directly
 */
const formatReelListItem = (reel, user) => {
    // Build user name
    // Handle case where user might be null (populate didn't find a match)
    const userName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
        : 'Unknown User';
    // User avatar URL (already full URL in database)
    const userAvatar = user?.profileImage || null;
    return {
        id: reel.id,
        videoUrl: reel.masterM3u8Url || '', // Use master playlist URL directly from database
        thumbnailUrl: reel.thumbnailPath || '', // Use thumbnail URL directly from database
        previewUrl: reel.previewUrl || null, // Preview URL from database
        title: reel.title,
        description: reel.description || null,
        share_url: `https://playasport.in/reels/${reel.id}`,
        user: {
            name: userName,
            avatar: userAvatar,
        },
        likes: reel.likesCount || 0,
        views: reel.viewsCount || 0,
        comments: reel.commentsCount || 0,
    };
};
/**
 * Get paginated list of approved reels
 */
const getReelsList = async (page = 1, limit = 3) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.max(1, Math.floor(limit)) || 3; // Default 3, accept limit from frontend
        // Calculate skip
        const skip = (pageNumber - 1) * pageSize;
        // Build query - only get approved, non-deleted reels with video processing done
        const query = {
            status: reel_model_1.ReelStatus.APPROVED,
            videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
            deletedAt: null,
        };
        // Use aggregation to properly filter reels with active, non-deleted users
        // Step 1: Match reels
        // Step 2: Convert userId to ObjectId if it's a string (for proper lookup)
        // Step 3: Lookup users
        // Step 4: Unwind user array (removes reels without matching users)
        // Step 5: Filter for active, non-deleted users
        // Step 6: Sort and paginate
        const aggregationPipeline = [
            { $match: query },
            // Convert userId to ObjectId if it's stored as string (handles JSON imports)
            {
                $addFields: {
                    userIdObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: '$userId' }, 'string'] },
                            then: { $toObjectId: '$userId' },
                            else: '$userId',
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIdObjectId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'user.isDeleted': { $ne: true },
                    'user.isActive': true,
                    $or: [
                        { 'user.userRoleDeletedAt': null },
                        { 'user.userRoleDeletedAt': { $exists: false } },
                    ],
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    data: [{ $skip: skip }, { $limit: pageSize }],
                },
            },
            {
                $project: {
                    total: {
                        $cond: {
                            if: { $gt: [{ $size: '$total' }, 0] },
                            then: {
                                $let: {
                                    vars: { totalDoc: { $arrayElemAt: ['$total', 0] } },
                                    in: '$$totalDoc.count',
                                },
                            },
                            else: 0,
                        },
                    },
                    reels: '$data',
                },
            },
        ];
        const result = await reel_model_1.ReelModel.aggregate(aggregationPipeline);
        const aggregationResult = result[0] || { total: 0, reels: [] };
        const total = aggregationResult.total || 0;
        const reels = aggregationResult.reels || [];
        // Format reels for response (user is already unwound from array)
        const formattedReels = reels.map((reel) => {
            const user = reel.user || null;
            // Convert to format expected by formatReelListItem (with userId field)
            const reelWithUser = {
                ...reel,
                userId: user,
            };
            return formatReelListItem(reelWithUser, user);
        });
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Reels list fetched', {
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages,
        });
        return {
            reels: formattedReels,
            total,
            current_page: pageNumber,
            total_pages: totalPages,
            limit: pageSize,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch reels list:', error);
        throw new ApiError_1.ApiError(500, 'Failed to fetch reels list');
    }
};
exports.getReelsList = getReelsList;
/**
 * Get reels list with a specific reel first (by ID)
 * Page 1: returns the target reel first, then 2 more reels (3 total)
 * Page 2+: returns 3 reels excluding the target reel
 */
const getReelsListWithIdFirst = async (reelId, page = 1, limit = 3) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.max(1, Math.floor(limit)) || 3; // Default 3, accept limit from frontend
        // For page 1, we need to verify the target reel exists and get it
        let targetReel = null;
        if (pageNumber === 1) {
            const targetReelResult = await reel_model_1.ReelModel.aggregate([
                {
                    $match: {
                        id: reelId,
                        status: reel_model_1.ReelStatus.APPROVED,
                        videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
                        deletedAt: null,
                    },
                },
                // Convert userId to ObjectId if it's stored as string
                {
                    $addFields: {
                        userIdObjectId: {
                            $cond: {
                                if: { $eq: [{ $type: '$userId' }, 'string'] },
                                then: { $toObjectId: '$userId' },
                                else: '$userId',
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userIdObjectId',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
                {
                    $match: {
                        'user.isDeleted': false,
                        'user.isActive': true,
                    },
                },
                { $limit: 1 },
            ]);
            if (!targetReelResult || targetReelResult.length === 0) {
                throw new ApiError_1.ApiError(404, 'Reel not found');
            }
            const targetReelRaw = targetReelResult[0];
            // Format to match expected structure (user is already unwound from array)
            targetReel = {
                ...targetReelRaw,
                userId: targetReelRaw.user || null,
            };
        }
        // Build query for other reels (always exclude the target reel)
        const query = {
            id: { $ne: reelId },
            status: reel_model_1.ReelStatus.APPROVED,
            videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
            deletedAt: null,
        };
        // Get total count (including the target reel) - count only reels with active users
        const totalResult = await reel_model_1.ReelModel.aggregate([
            {
                $match: {
                    status: reel_model_1.ReelStatus.APPROVED,
                    videoProcessingStatus: streamHighlight_model_1.VideoProcessingStatus.COMPLETED,
                    deletedAt: null,
                },
            },
            // Convert userId to ObjectId if it's stored as string
            {
                $addFields: {
                    userIdObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: '$userId' }, 'string'] },
                            then: { $toObjectId: '$userId' },
                            else: '$userId',
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIdObjectId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'user.isDeleted': false,
                    'user.isActive': true,
                },
            },
            { $count: 'total' },
        ]);
        const total = totalResult[0]?.total || 0;
        // Calculate skip for pagination
        // Page 1: skip 0 additional reels (we show target + 2 more = 3 total)
        // Page 2: skip 2 additional reels (we already showed target + 2 = 3, now show next 3)
        // Page 3: skip 5 additional reels (we showed 6 total, now show next 3)
        // Formula: skip = (pageNumber - 1) * pageSize - (pageNumber === 1 ? 0 : 1)
        // Actually simpler: for page 1, we need 2 more (skip 0), for page 2+, skip = (pageNumber - 1) * pageSize - 1
        let skip = 0;
        let limitForQuery = pageSize;
        if (pageNumber === 1) {
            // Page 1: target reel + (pageSize - 1) more
            skip = 0;
            limitForQuery = pageSize - 1;
        }
        else {
            // Page 2+: exclude target reel, skip = (pageNumber - 1) * pageSize - 1
            // We already showed 1 target + 2 others = 3 on page 1
            // So for page 2, skip = 3 - 1 = 2 (skip target + first 2 others)
            // For page 3, skip = 6 - 1 = 5, etc.
            skip = (pageNumber - 1) * pageSize - 1;
            limitForQuery = pageSize;
        }
        // Get additional reels using aggregation to filter active users
        const additionalReelsResult = await reel_model_1.ReelModel.aggregate([
            { $match: query },
            // Convert userId to ObjectId if it's stored as string
            {
                $addFields: {
                    userIdObjectId: {
                        $cond: {
                            if: { $eq: [{ $type: '$userId' }, 'string'] },
                            then: { $toObjectId: '$userId' },
                            else: '$userId',
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIdObjectId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'user.isDeleted': false,
                    'user.isActive': true,
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitForQuery },
        ]);
        // Format additional reels to match targetReel structure (user is already unwound from array)
        const additionalReels = additionalReelsResult.map((reel) => ({
            ...reel,
            userId: reel.user || null,
        }));
        // Combine: target reel first (only on page 1), then additional reels
        const allReels = pageNumber === 1 && targetReel
            ? [targetReel, ...additionalReels]
            : additionalReels;
        // Format reels for response
        const formattedReels = allReels.map((reel) => {
            return formatReelListItem(reel, reel.userId);
        });
        // Calculate total pages (3 per page)
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Reels list with ID first fetched', {
            reelId,
            page: pageNumber,
            total,
            totalPages,
            returnedCount: formattedReels.length,
        });
        return {
            reels: formattedReels,
            total,
            current_page: pageNumber,
            total_pages: totalPages,
            limit: pageSize,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch reels list with ID first:', error);
        throw new ApiError_1.ApiError(500, 'Failed to fetch reels list');
    }
};
exports.getReelsListWithIdFirst = getReelsListWithIdFirst;
/**
 * Update reel view count (increment viewsCount)
 */
const updateReelView = async (reelId) => {
    try {
        // Handle both custom id field and MongoDB _id
        const query = { deletedAt: null };
        if (mongoose_1.Types.ObjectId.isValid(reelId) && reelId.length === 24) {
            // If it's a valid ObjectId, try _id first, then fall back to id
            query.$or = [{ _id: new mongoose_1.Types.ObjectId(reelId) }, { id: reelId }];
        }
        else {
            // Otherwise, use the custom id field
            query.id = reelId;
        }
        // Use findOneAndUpdate to get the updated document
        const updatedReel = await reel_model_1.ReelModel.findOneAndUpdate(query, { $inc: { viewsCount: 1 } }, { new: true, select: 'viewsCount' }).lean();
        if (!updatedReel) {
            logger_1.logger.warn(`Reel not found for view tracking: ${reelId}`);
            return 0;
        }
        const viewCount = updatedReel.viewsCount || 0;
        logger_1.logger.debug(`Reel view tracked successfully: ${reelId}, new count: ${viewCount}`);
        return viewCount;
    }
    catch (error) {
        logger_1.logger.error('Failed to track reel view:', error);
        // Return 0 on error - it's not critical
        return 0;
    }
};
exports.updateReelView = updateReelView;
//# sourceMappingURL=reel.service.js.map