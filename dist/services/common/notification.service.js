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
exports.markAsReadByRoles = exports.getUnreadCountByRoles = exports.getNotificationsByRoles = exports.getUnreadCount = exports.deleteNotification = exports.markAllAsRead = exports.markAsUnread = exports.markAsRead = exports.getNotifications = exports.createAndSendNotification = void 0;
const mongoose_1 = require("mongoose");
const notification_model_1 = require("../../models/notification.model");
const user_model_1 = require("../../models/user.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const userCache_1 = require("../../utils/userCache");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const env_1 = require("../../config/env");
const notificationQueue_service_1 = require("./notificationQueue.service");
/**
 * Get recipient ObjectId based on recipient type and custom ID
 * Supports both MongoDB ObjectId and custom UUID string
 */
const getRecipientObjectId = async (recipientType, recipientId) => {
    try {
        if (recipientType === 'user') {
            // Check if recipientId is a valid MongoDB ObjectId (24 hex characters)
            if (mongoose_1.Types.ObjectId.isValid(recipientId) && recipientId.length === 24) {
                // Try to find user by MongoDB _id first
                const user = await user_model_1.UserModel.findOne({ _id: new mongoose_1.Types.ObjectId(recipientId), isDeleted: false })
                    .select('_id')
                    .lean();
                if (user) {
                    return user._id;
                }
            }
            // If not found by _id or not a valid ObjectId, treat as custom UUID and use getUserObjectId
            return await (0, userCache_1.getUserObjectId)(recipientId);
        }
        else {
            // For academy, we can receive either:
            // 1. A user ID (most common case - when academy user requests their notifications)
            // 2. An academy ID (less common - when sending to specific academy)
            // First, try to find User by custom ID or ObjectId (most common case)
            let userObjectId = null;
            // Check if recipientId is a valid MongoDB ObjectId
            if (mongoose_1.Types.ObjectId.isValid(recipientId) && recipientId.length === 24) {
                // Try to find user by MongoDB _id
                const user = await user_model_1.UserModel.findOne({ _id: new mongoose_1.Types.ObjectId(recipientId), isDeleted: false })
                    .select('_id')
                    .lean();
                if (user) {
                    userObjectId = user._id;
                }
            }
            // If not found by _id, try custom UUID using getUserObjectId (more robust with caching)
            if (!userObjectId) {
                userObjectId = await (0, userCache_1.getUserObjectId)(recipientId);
            }
            // If we found a user, verify they own at least one academy or are associated with one
            if (userObjectId) {
                // Check if user owns an academy
                const userAcademies = await coachingCenter_model_1.CoachingCenterModel.findOne({
                    user: userObjectId,
                    is_deleted: false
                }).select('_id').lean();
                if (userAcademies) {
                    return userObjectId;
                }
                // If user doesn't own an academy, check if they are an employee of an academy
                // This allows academy employees to access notifications
                const EmployeeModel = (await Promise.resolve().then(() => __importStar(require('../../models/employee.model')))).EmployeeModel;
                const employee = await EmployeeModel.findOne({
                    user: userObjectId,
                    is_deleted: false
                }).select('_id center').lean();
                if (employee) {
                    // Verify the center exists and is not deleted
                    const center = await coachingCenter_model_1.CoachingCenterModel.findOne({
                        _id: employee.center,
                        is_deleted: false
                    }).select('_id').lean();
                    if (center) {
                        return userObjectId;
                    }
                }
                // If still not found, check user's role - if they have academy role, allow access
                // This handles cases where academy might not be fully set up yet
                const user = await user_model_1.UserModel.findById(userObjectId)
                    .select('role roles')
                    .populate('roles', 'name')
                    .lean();
                if (user) {
                    // Check if user has academy role in JWT role or in roles array
                    const userRoles = user.roles;
                    const hasAcademyRole = userRoles?.some((r) => r?.name === 'academy') ||
                        user.role === 'academy';
                    if (hasAcademyRole) {
                        logger_1.logger.info('Allowing academy user access to notifications without coaching center', {
                            userId: recipientId,
                            userObjectId: userObjectId.toString(),
                        });
                        return userObjectId;
                    }
                }
            }
            // If not found as User, try to find CoachingCenter by custom ID (UUID)
            // This handles the case where someone passes an academy ID directly
            const center = await coachingCenter_model_1.CoachingCenterModel.findOne({ id: recipientId, is_deleted: false })
                .select('_id user')
                .lean();
            if (center) {
                // Return the user ObjectId who owns the academy
                return center.user;
            }
            return null;
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to get recipient ObjectId:', error);
        return null;
    }
};
/**
 * Get user details for sending notifications
 */
const getUserDetails = async (recipientObjectId) => {
    try {
        const user = await user_model_1.UserModel.findById(recipientObjectId)
            .select('id email mobile')
            .lean();
        if (!user)
            return null;
        return {
            email: user.email,
            mobile: user.mobile || undefined,
            userId: user.id,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get user details:', error);
        return null;
    }
};
/**
 * Create and send notification
 */
const createAndSendNotification = async (input) => {
    try {
        // Validate input based on recipientType
        if (input.recipientType === 'role') {
            if (!input.roles || input.roles.length === 0) {
                throw new ApiError_1.ApiError(400, 'Roles are required when recipientType is "role"');
            }
        }
        else {
            if (!input.recipientId) {
                throw new ApiError_1.ApiError(400, 'RecipientId is required when recipientType is not "role"');
            }
        }
        let recipientObjectId = null;
        let recipientTypeRef = undefined;
        // Get recipient ObjectId only if not role-based
        if (input.recipientType !== 'role') {
            recipientObjectId = await getRecipientObjectId(input.recipientType, input.recipientId);
            if (!recipientObjectId) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.recipientNotFound'));
            }
            // recipientTypeRef is always 'User' since we store the user ObjectId
            // (for academy, we store the academy owner's user ObjectId)
            recipientTypeRef = 'User';
        }
        // Create notification in database
        const notificationData = {
            recipientType: input.recipientType,
            title: input.title,
            body: input.body,
            channels: input.channels || ['push'],
            priority: input.priority || 'medium',
            data: input.data || null,
            imageUrl: input.imageUrl || null,
            metadata: input.metadata || null,
            isRead: false,
            sent: false,
        };
        if (input.recipientType === 'role') {
            notificationData.roles = input.roles;
        }
        else {
            notificationData.recipientId = recipientObjectId;
            notificationData.recipientTypeRef = recipientTypeRef;
        }
        const notification = new notification_model_1.NotificationModel(notificationData);
        await notification.save();
        // For role-based notifications, we don't send immediately to specific users
        // Instead, users will fetch notifications based on their roles
        if (input.recipientType === 'role') {
            // Mark as sent (it's available for users with matching roles to fetch)
            notification.sent = true;
            notification.sentAt = new Date();
            await notification.save();
            return notification.toObject();
        }
        // Get user details for sending (only for user/academy notifications)
        const userDetails = await getUserDetails(recipientObjectId);
        if (!userDetails) {
            notification.error = 'User details not found';
            await notification.save();
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.userDetailsNotFound'));
        }
        // Send notifications through specified channels
        const channels = input.channels || ['push'];
        const channelData = {
            push: {
                userId: userDetails.userId,
                title: input.title,
                body: input.body,
                data: input.data ? Object.fromEntries(Object.entries(input.data).map(([k, v]) => [k, String(v)])) : undefined,
                imageUrl: input.imageUrl,
            },
        };
        // Add SMS if mobile is available
        if (channels.includes('sms') && userDetails.mobile) {
            channelData.sms = {
                to: userDetails.mobile,
                body: input.body,
            };
        }
        // Add Email if email is available
        if (channels.includes('email') && userDetails.email) {
            channelData.email = {
                to: userDetails.email,
                subject: input.title,
                html: `<p>${input.body}</p>`,
                text: input.body,
            };
        }
        // Add WhatsApp if mobile is available
        if (channels.includes('whatsapp') && userDetails.mobile) {
            channelData.whatsapp = {
                to: userDetails.mobile,
                body: input.body,
            };
        }
        // Queue notifications
        try {
            (0, notificationQueue_service_1.queueMultiChannel)(channels, channelData, input.priority || 'medium', {
                notificationId: notification.id,
                recipientType: input.recipientType,
                recipientId: input.recipientId,
                ...input.metadata,
            });
            // Mark as sent (queued successfully)
            notification.sent = true;
            notification.sentAt = new Date();
            await notification.save();
        }
        catch (sendError) {
            logger_1.logger.error('Failed to queue notification:', sendError);
            notification.error = sendError instanceof Error ? sendError.message : 'Failed to queue notification';
            await notification.save();
        }
        return notification.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to create and send notification:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.create.failed'));
    }
};
exports.createAndSendNotification = createAndSendNotification;
/**
 * Get notifications for a recipient
 */
const getNotifications = async (recipientType, recipientId, page = 1, limit = 10, isRead) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Get recipient ObjectId
        const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
        if (!recipientObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.recipientNotFound'));
        }
        // Build query
        const query = {
            recipientType,
            recipientId: recipientObjectId,
        };
        if (isRead !== undefined) {
            query.isRead = isRead;
        }
        // Get total count and unread count
        const [total, unreadCount, notifications] = await Promise.all([
            notification_model_1.NotificationModel.countDocuments(query),
            notification_model_1.NotificationModel.countDocuments({
                ...query,
                isRead: false,
            }),
            notification_model_1.NotificationModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
        ]);
        const totalPages = Math.ceil(total / pageSize);
        return {
            notifications: notifications,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
            },
            unreadCount,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get notifications:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.list.failed'));
    }
};
exports.getNotifications = getNotifications;
/**
 * Build recipient filter for notification lookup.
 * For academy: match both 'academy' and 'user' notifications (same user may receive both).
 * For user/role: match only the given recipientType.
 */
const buildRecipientFilter = (recipientType, recipientObjectId) => {
    if (recipientType === 'academy') {
        return {
            $or: [
                { recipientType: 'academy', recipientId: recipientObjectId },
                { recipientType: 'user', recipientId: recipientObjectId },
            ],
        };
    }
    return {
        recipientType,
        recipientId: recipientObjectId,
    };
};
/**
 * Find notification by id or _id, with recipient filter.
 * Used by markAsRead, markAsUnread, deleteNotification.
 */
const findNotificationForRecipient = async (notificationId, recipientType, recipientObjectId) => {
    const recipientFilter = buildRecipientFilter(recipientType, recipientObjectId);
    let notification = await notification_model_1.NotificationModel.findOne({
        id: notificationId,
        ...recipientFilter,
    });
    if (!notification && mongoose_1.Types.ObjectId.isValid(notificationId)) {
        try {
            const byObjectId = await notification_model_1.NotificationModel.findOne({
                _id: new mongoose_1.Types.ObjectId(notificationId),
                ...recipientFilter,
            });
            if (byObjectId)
                notification = byObjectId;
        }
        catch {
            logger_1.logger.debug('Notification ID is not a valid ObjectId', { notificationId });
        }
    }
    return notification;
};
/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, recipientType, recipientId) => {
    try {
        const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
        if (!recipientObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.recipientNotFound'));
        }
        const notification = await findNotificationForRecipient(notificationId, recipientType, recipientObjectId);
        if (!notification) {
            logger_1.logger.warn('Notification not found on mark-as-read', {
                notificationId,
                recipientType,
                recipientObjectId: recipientObjectId.toString(),
            });
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
        }
        if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            await notification.save();
        }
        return notification.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to mark notification as read:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.markRead.failed'));
    }
};
exports.markAsRead = markAsRead;
/**
 * Mark notification as unread
 */
const markAsUnread = async (notificationId, recipientType, recipientId) => {
    try {
        const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
        if (!recipientObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.recipientNotFound'));
        }
        const notification = await findNotificationForRecipient(notificationId, recipientType, recipientObjectId);
        if (!notification) {
            logger_1.logger.warn('Notification not found on mark-as-unread', {
                notificationId,
                recipientType,
                recipientObjectId: recipientObjectId.toString(),
            });
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
        }
        if (notification.isRead) {
            notification.isRead = false;
            notification.readAt = null;
            await notification.save();
        }
        return notification.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to mark notification as unread:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.markUnread.failed'));
    }
};
exports.markAsUnread = markAsUnread;
/**
 * Mark all notifications as read
 */
const markAllAsRead = async (recipientType, recipientId) => {
    try {
        const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
        if (!recipientObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.recipientNotFound'));
        }
        const result = await notification_model_1.NotificationModel.updateMany({
            recipientType,
            recipientId: recipientObjectId,
            isRead: false,
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        });
        return { count: result.modifiedCount };
    }
    catch (error) {
        logger_1.logger.error('Failed to mark all notifications as read:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.markAllRead.failed'));
    }
};
exports.markAllAsRead = markAllAsRead;
/**
 * Delete notification
 */
const deleteNotification = async (notificationId, recipientType, recipientId) => {
    try {
        const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
        if (!recipientObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.recipientNotFound'));
        }
        const notification = await findNotificationForRecipient(notificationId, recipientType, recipientObjectId);
        if (!notification) {
            logger_1.logger.warn('Notification not found on delete', {
                notificationId,
                recipientType,
                recipientObjectId: recipientObjectId.toString(),
            });
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
        }
        await notification_model_1.NotificationModel.deleteOne({ _id: notification._id });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete notification:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.delete.failed'));
    }
};
exports.deleteNotification = deleteNotification;
/**
 * Get unread count
 */
const getUnreadCount = async (recipientType, recipientId) => {
    try {
        const recipientObjectId = await getRecipientObjectId(recipientType, recipientId);
        if (!recipientObjectId) {
            return 0;
        }
        return await notification_model_1.NotificationModel.countDocuments({
            recipientType,
            recipientId: recipientObjectId,
            isRead: false,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get unread count:', error);
        return 0;
    }
};
exports.getUnreadCount = getUnreadCount;
/**
 * Get notifications by user roles (for role-based notifications) and optionally user-based notifications
 */
const getNotificationsByRoles = async (userRoles, // Array of role names
page = 1, limit = 10, isRead, userId // Optional user ID to also include user-based notifications
) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Build query for role-based notifications
        const roleQuery = {
            recipientType: 'role',
            roles: { $in: userRoles || [] }, // Match if any of the user's roles are in the notification's roles array
        };
        // Build query for user-based notifications (if userId provided)
        let userQuery = null;
        if (userId) {
            const recipientObjectId = await getRecipientObjectId('user', userId);
            if (recipientObjectId) {
                userQuery = {
                    recipientType: 'user',
                    recipientId: recipientObjectId,
                };
            }
        }
        // Combine queries using $or if both exist, otherwise use the single query
        const baseQuery = userQuery
            ? { $or: [roleQuery, userQuery] }
            : roleQuery;
        if (isRead !== undefined) {
            if (baseQuery.$or) {
                // Apply isRead filter to both parts of the $or query
                baseQuery.$or = baseQuery.$or.map((q) => ({ ...q, isRead }));
            }
            else {
                baseQuery.isRead = isRead;
            }
        }
        // Build unread query (always filter for unread notifications)
        let unreadQuery;
        if (baseQuery.$or) {
            unreadQuery = {
                $or: baseQuery.$or.map((q) => ({ ...q, isRead: false })),
            };
        }
        else {
            unreadQuery = { ...baseQuery, isRead: false };
        }
        // Get total count and unread count
        const [total, unreadCount, notifications] = await Promise.all([
            notification_model_1.NotificationModel.countDocuments(baseQuery),
            notification_model_1.NotificationModel.countDocuments(unreadQuery),
            notification_model_1.NotificationModel.find(baseQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),
        ]);
        const totalPages = Math.ceil(total / pageSize);
        return {
            notifications: notifications,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
            },
            unreadCount,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get notifications by roles:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.list.failed'));
    }
};
exports.getNotificationsByRoles = getNotificationsByRoles;
/**
 * Get unread count by user roles and optionally user-based notifications
 */
const getUnreadCountByRoles = async (userRoles, userId // Optional user ID to also include user-based notifications
) => {
    try {
        // Build query for role-based notifications
        const roleQuery = {
            recipientType: 'role',
            roles: { $in: userRoles || [] },
            isRead: false,
        };
        // Build query for user-based notifications (if userId provided)
        let userQuery = null;
        if (userId) {
            const recipientObjectId = await getRecipientObjectId('user', userId);
            if (recipientObjectId) {
                userQuery = {
                    recipientType: 'user',
                    recipientId: recipientObjectId,
                    isRead: false,
                };
            }
        }
        // Combine queries using $or if both exist, otherwise use the single query
        const query = userQuery
            ? { $or: [roleQuery, userQuery] }
            : roleQuery;
        return await notification_model_1.NotificationModel.countDocuments(query);
    }
    catch (error) {
        logger_1.logger.error('Failed to get unread count by roles:', error);
        return 0;
    }
};
exports.getUnreadCountByRoles = getUnreadCountByRoles;
/**
 * Mark notification as read by notification ID and user roles (or user ID for user-based notifications)
 */
const markAsReadByRoles = async (notificationId, userRoles, userId) => {
    try {
        // First, find the notification by ID (try both id field and _id)
        let notification = await notification_model_1.NotificationModel.findOne({
            id: notificationId,
        });
        // If not found by id field, try by _id (MongoDB ObjectId)
        if (!notification && mongoose_1.Types.ObjectId.isValid(notificationId)) {
            try {
                notification = await notification_model_1.NotificationModel.findById(new mongoose_1.Types.ObjectId(notificationId));
            }
            catch (error) {
                // Invalid ObjectId format, continue
                logger_1.logger.debug('Notification ID is not a valid ObjectId', { notificationId });
            }
        }
        if (!notification) {
            logger_1.logger.warn('Notification not found', {
                notificationId,
                userRoles,
                userId,
                triedById: true,
                triedByObjectId: mongoose_1.Types.ObjectId.isValid(notificationId),
            });
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
        }
        // Check if it's a role-based notification
        if (notification.recipientType === 'role') {
            if (!userRoles || userRoles.length === 0) {
                logger_1.logger.warn('User has no roles to match notification', {
                    notificationId,
                    notificationRoles: notification.roles,
                });
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
            }
            // Verify the notification is for one of the user's roles
            const hasMatchingRole = notification.roles?.some(role => userRoles.includes(role));
            if (!hasMatchingRole) {
                logger_1.logger.warn('User roles do not match notification roles', {
                    notificationId,
                    userRoles,
                    notificationRoles: notification.roles,
                });
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
            }
        }
        else if (notification.recipientType === 'user') {
            // For user-based notifications, verify it's for this user
            if (!userId) {
                logger_1.logger.warn('User ID not provided for user-based notification', {
                    notificationId,
                    recipientId: notification.recipientId,
                });
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
            }
            const recipientObjectId = await getRecipientObjectId('user', userId);
            if (!recipientObjectId || !notification.recipientId?.equals(recipientObjectId)) {
                logger_1.logger.warn('User ID does not match notification recipient', {
                    notificationId,
                    userId,
                    recipientObjectId,
                    notificationRecipientId: notification.recipientId,
                });
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
            }
        }
        else {
            // Academy or other recipient types not supported for admin
            logger_1.logger.warn('Notification recipient type not supported for admin', {
                notificationId,
                recipientType: notification.recipientType,
            });
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
        }
        // Mark as read if not already read
        if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date();
            await notification.save();
        }
        return notification.toObject();
    }
    catch (error) {
        logger_1.logger.error('Failed to mark notification as read by roles:', error);
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('notification.markRead.failed'));
    }
};
exports.markAsReadByRoles = markAsReadByRoles;
//# sourceMappingURL=notification.service.js.map