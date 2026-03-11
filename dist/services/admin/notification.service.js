"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllNotifications = void 0;
const notification_model_1 = require("../../models/notification.model");
const userCache_1 = require("../../utils/userCache");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const env_1 = require("../../config/env");
const user_model_1 = require("../../models/user.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
/**
 * Get all notifications for admin with filters and pagination
 */
const getAllNotifications = async (params = {}) => {
    try {
        const query = {};
        // Filter by recipient type if provided
        if (params.recipientType) {
            query.recipientType = params.recipientType;
        }
        // Filter by recipient ID if provided
        if (params.recipientId) {
            const recipientObjectId = await (0, userCache_1.getUserObjectId)(params.recipientId);
            if (recipientObjectId) {
                query.recipientId = recipientObjectId;
            }
            else {
                // If not found as user, return empty result
                return {
                    notifications: [],
                    pagination: {
                        page: params.page || 1,
                        limit: params.limit || 10,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                    },
                };
            }
        }
        // Filter by channels if provided
        if (params.channels && params.channels.length > 0) {
            query.channels = { $in: params.channels };
        }
        // Filter by priority if provided
        if (params.priority) {
            query.priority = params.priority;
        }
        // Filter by sent status if provided
        if (params.sent !== undefined) {
            query.sent = params.sent;
        }
        // Filter by read status if provided
        if (params.isRead !== undefined) {
            query.isRead = params.isRead;
        }
        // Search by title or body
        if (params.search) {
            const searchRegex = new RegExp(params.search, 'i');
            query.$or = [
                { title: searchRegex },
                { body: searchRegex },
            ];
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(env_1.config.pagination.maxLimit, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Sorting
        const sortField = params.sortBy || 'createdAt';
        const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        // Execute query
        const [notifications, total] = await Promise.all([
            notification_model_1.NotificationModel.find(query)
                .populate({
                path: 'recipientId',
                select: 'id firstName lastName email mobile',
                model: 'User',
            })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            notification_model_1.NotificationModel.countDocuments(query),
        ]);
        // Transform notifications to include recipient info
        const transformedNotifications = await Promise.all(notifications.map(async (notification) => {
            let recipient;
            if (notification.recipientId) {
                if (notification.recipientType === 'user') {
                    // User recipient
                    const user = await user_model_1.UserModel.findById(notification.recipientId)
                        .select('id firstName lastName email mobile')
                        .lean();
                    if (user) {
                        recipient = {
                            id: user.id,
                            firstName: user.firstName || undefined,
                            lastName: user.lastName || undefined,
                            email: user.email || undefined,
                            mobile: user.mobile ?? null,
                        };
                    }
                }
                else if (notification.recipientType === 'academy') {
                    // Academy recipient - find the academy by the user ObjectId
                    const center = await coachingCenter_model_1.CoachingCenterModel.findOne({ user: notification.recipientId, is_deleted: false })
                        .select('id center_name')
                        .lean();
                    if (center) {
                        recipient = {
                            id: center.id,
                            center_name: center.center_name,
                        };
                    }
                }
            }
            return {
                id: notification.id,
                recipientType: notification.recipientType,
                recipientId: notification.recipientId,
                recipient,
                title: notification.title,
                body: notification.body,
                channels: notification.channels,
                priority: notification.priority,
                data: notification.data || undefined,
                imageUrl: notification.imageUrl || undefined,
                isRead: notification.isRead,
                readAt: notification.readAt || undefined,
                sent: notification.sent,
                sentAt: notification.sentAt || undefined,
                error: notification.error || undefined,
                metadata: notification.metadata || undefined,
                createdAt: notification.createdAt,
                updatedAt: notification.updatedAt,
            };
        }));
        const totalPages = Math.ceil(total / limit);
        return {
            notifications: transformedNotifications,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get notifications for admin', { params, error });
        throw new ApiError_1.ApiError(500, 'Failed to get notifications');
    }
};
exports.getAllNotifications = getAllNotifications;
//# sourceMappingURL=notification.service.js.map