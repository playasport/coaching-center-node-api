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
exports.markAsRead = exports.getUnreadCount = exports.getMyNotifications = exports.getAllNotifications = exports.testNotification = exports.sendNotification = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const notificationService = __importStar(require("../../services/common/notification.service"));
const adminNotificationService = __importStar(require("../../services/admin/notification.service"));
const i18n_1 = require("../../utils/i18n");
const adminUser_model_1 = require("../../models/adminUser.model");
/**
 * Send notification from admin panel
 */
const sendNotification = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const input = req.body;
        // Auto-populate metadata with admin information
        const metadata = {
            source: 'admin_panel',
            adminId: req.user.id,
            ...(input.metadata || {}), // Merge with any metadata provided in request
        };
        const notification = await notificationService.createAndSendNotification({
            ...input,
            imageUrl: input.imageUrl ?? undefined, // Convert null to undefined
            metadata,
        });
        const response = new ApiResponse_1.ApiResponse(201, notification, (0, i18n_1.t)('notification.send.success'));
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.sendNotification = sendNotification;
/**
 * Test notification (sends a test notification)
 */
const testNotification = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const input = req.body;
        // Auto-populate metadata with admin information
        const metadata = {
            source: 'admin_panel',
            adminId: req.user.id,
        };
        const testNotificationData = {
            recipientType: input.recipientType,
            recipientId: input.recipientId,
            title: 'Test Notification',
            body: 'This is a test notification sent from the admin panel.',
            channels: input.channels || ['push'],
            priority: 'medium',
            data: {
                type: 'test',
                timestamp: new Date().toISOString(),
            },
            metadata,
        };
        const notification = await notificationService.createAndSendNotification(testNotificationData);
        const response = new ApiResponse_1.ApiResponse(201, notification, 'Test notification sent successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.testNotification = testNotification;
/**
 * Get all notifications for admin
 */
const getAllNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { recipientType, recipientId, channels, priority, sent, isRead, search, sortBy, sortOrder, } = req.query;
        const params = {
            page,
            limit,
            recipientType: recipientType,
            recipientId: recipientId,
            channels: channels ? (Array.isArray(channels) ? channels : [channels]) : undefined,
            priority: priority,
            sent: sent === 'true' ? true : sent === 'false' ? false : undefined,
            isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminNotificationService.getAllNotifications(params);
        // Remove roles, priority, and channels from notifications
        const filteredNotifications = result.notifications.map((notification) => {
            const { roles, priority, channels, ...rest } = notification;
            return rest;
        });
        const filteredResult = {
            ...result,
            notifications: filteredNotifications,
        };
        const response = new ApiResponse_1.ApiResponse(200, filteredResult, 'Notifications retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllNotifications = getAllNotifications;
/**
 * Get admin's own notifications (by roles)
 */
const getMyNotifications = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get user's roles from database
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: req.user.id })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound'));
        }
        // Extract role names from populated roles
        const userRoles = (user.roles || []);
        const roleNames = userRoles
            .map((r) => r?.name)
            .filter((name) => !!name);
        if (roleNames.length === 0) {
            // If user has no roles, return empty result
            const response = new ApiResponse_1.ApiResponse(200, {
                notifications: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
                unreadCount: 0,
            }, (0, i18n_1.t)('notification.list.success'));
            res.json(response);
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
        // Get notifications by user's roles (and user-based notifications)
        const result = await notificationService.getNotificationsByRoles(roleNames, page, limit, isRead, req.user.id);
        // Remove roles, priority, and channels from notifications
        const filteredNotifications = result.notifications.map((notification) => {
            const { roles, priority, channels, ...rest } = notification;
            return rest;
        });
        const filteredResult = {
            ...result,
            notifications: filteredNotifications,
        };
        const response = new ApiResponse_1.ApiResponse(200, filteredResult, (0, i18n_1.t)('notification.list.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMyNotifications = getMyNotifications;
/**
 * Get unread count for admin (by roles)
 */
const getUnreadCount = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get user's roles from database
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: req.user.id })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound'));
        }
        // Extract role names from populated roles
        const userRoles = (user.roles || []);
        const roleNames = userRoles
            .map((r) => r?.name)
            .filter((name) => !!name);
        if (roleNames.length === 0) {
            const response = new ApiResponse_1.ApiResponse(200, { count: 0 }, (0, i18n_1.t)('notification.unreadCount.success'));
            res.json(response);
            return;
        }
        const count = await notificationService.getUnreadCountByRoles(roleNames, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { count }, (0, i18n_1.t)('notification.unreadCount.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUnreadCount = getUnreadCount;
/**
 * Mark notification as read (admin - by roles)
 */
const markAsRead = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        // Get user's roles from database
        const user = await adminUser_model_1.AdminUserModel.findOne({ id: req.user.id })
            .select('roles')
            .populate('roles', 'name')
            .lean();
        if (!user) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound'));
        }
        // Extract role names from populated roles
        const userRoles = (user.roles || []);
        const roleNames = userRoles
            .map((r) => r?.name)
            .filter((name) => !!name);
        if (roleNames.length === 0) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('notification.notFound'));
        }
        const { id } = req.params;
        const notification = await notificationService.markAsReadByRoles(id, roleNames, req.user.id);
        // Remove roles, priority, and channels from notification
        const { roles, priority, channels, ...filteredNotification } = notification;
        const response = new ApiResponse_1.ApiResponse(200, filteredNotification, (0, i18n_1.t)('notification.markRead.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
//# sourceMappingURL=notification.controller.js.map