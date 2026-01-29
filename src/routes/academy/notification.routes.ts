import { Router } from 'express';
import * as notificationController from '../../controllers/academy/notification.controller';
import { validate } from '../../middleware/validation.middleware';
import {
  listNotificationsSchema,
  markAsReadSchema,
  markAsUnreadSchema,
  deleteNotificationSchema,
} from '../../validations/notification.validation';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { DefaultRoles } from '../../enums/defaultRoles.enum';

const router = Router();

// All routes here require authentication and academy role
router.use(authenticate);
router.use(authorize(DefaultRoles.ACADEMY));

/**
 * @swagger
 * /academy/notifications:
 *   get:
 *     summary: Get academy notifications
 *     tags: [Academy Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get paginated list of notifications for the authenticated academy
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
router.get('/', validate(listNotificationsSchema), notificationController.getNotifications);

/**
 * @swagger
 * /academy/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Academy Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get count of unread notifications for the authenticated academy
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /academy/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Academy Notifications]
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
router.patch('/:id/read', validate(markAsReadSchema), notificationController.markAsRead);

/**
 * @swagger
 * /academy/notifications/{id}/unread:
 *   patch:
 *     summary: Mark notification as unread
 *     tags: [Academy Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Mark a specific notification as unread
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as unread
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/unread', validate(markAsUnreadSchema), notificationController.markAsUnread);

/**
 * @swagger
 * /academy/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Academy Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Mark all notifications as read for the authenticated academy
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /academy/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Academy Notifications]
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
router.delete('/:id', validate(deleteNotificationSchema), notificationController.deleteNotification);

export default router;

