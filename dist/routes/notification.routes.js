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
const express_1 = require("express");
const notificationController = __importStar(require("../controllers/notification.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const notification_validation_1 = require("../validations/notification.validation");
const auth_middleware_1 = require("../middleware/auth.middleware");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
const router = (0, express_1.Router)();
// All routes here require authentication
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)(defaultRoles_enum_1.DefaultRoles.USER));
/**
 * @swagger
 * /user/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get paginated list of notifications for the authenticated user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status (true/false)
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', (0, validation_middleware_1.validate)(notification_validation_1.listNotificationsSchema), notificationController.getNotifications);
/**
 * @swagger
 * /user/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get count of unread notifications for the authenticated user
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', notificationController.getUnreadCount);
/**
 * @swagger
 * /user/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Mark a specific notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', (0, validation_middleware_1.validate)(notification_validation_1.markAsReadSchema), notificationController.markAsRead);
/**
 * @swagger
 * /user/notifications/{id}/unread:
 *   patch:
 *     summary: Mark notification as unread
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Mark a specific notification as unread
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as unread
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/unread', (0, validation_middleware_1.validate)(notification_validation_1.markAsUnreadSchema), notificationController.markAsUnread);
/**
 * @swagger
 * /user/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Mark all notifications as read for the authenticated user
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/read-all', notificationController.markAllAsRead);
/**
 * @swagger
 * /user/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a specific notification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', (0, validation_middleware_1.validate)(notification_validation_1.deleteNotificationSchema), notificationController.deleteNotification);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map