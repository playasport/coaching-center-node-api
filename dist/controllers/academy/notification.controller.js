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
exports.deleteNotification = exports.markAllAsRead = exports.markAsUnread = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const notificationService = __importStar(require("../../services/common/notification.service"));
const i18n_1 = require("../../utils/i18n");
/**
 * Get notifications for academy
 */
const getNotifications = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
        const result = await notificationService.getNotifications('academy', req.user.id, page, limit, isRead);
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
exports.getNotifications = getNotifications;
/**
 * Get unread count for academy
 */
const getUnreadCount = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const count = await notificationService.getUnreadCount('academy', req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { count }, (0, i18n_1.t)('notification.unreadCount.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUnreadCount = getUnreadCount;
/**
 * Mark notification as read
 */
const markAsRead = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const notification = await notificationService.markAsRead(id, 'academy', req.user.id);
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
/**
 * Mark notification as unread
 */
const markAsUnread = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const notification = await notificationService.markAsUnread(id, 'academy', req.user.id);
        // Remove roles, priority, and channels from notification
        const { roles, priority, channels, ...filteredNotification } = notification;
        const response = new ApiResponse_1.ApiResponse(200, filteredNotification, (0, i18n_1.t)('notification.markUnread.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.markAsUnread = markAsUnread;
/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const result = await notificationService.markAllAsRead('academy', req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, result, (0, i18n_1.t)('notification.markAllRead.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.markAllAsRead = markAllAsRead;
/**
 * Delete notification
 */
const deleteNotification = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        await notificationService.deleteNotification(id, 'academy', req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, null, (0, i18n_1.t)('notification.delete.success'));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteNotification = deleteNotification;
//# sourceMappingURL=notification.controller.js.map