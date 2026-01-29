import { Router } from 'express';
import * as notificationController from '../../controllers/admin/notification.controller';
import { validate } from '../../middleware/validation.middleware';
import {
  sendNotificationSchema,
  testNotificationSchema,
  listNotificationsSchema,
  markAsReadSchema,
} from '../../validations/notification.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

// All routes here require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/notifications/send:
 *   post:
 *     summary: Send notification from admin panel
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Send a notification to a user or academy through multiple channels (SMS, Email, WhatsApp, Push). Requires notification:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendNotificationRequest'
 *           examples:
 *             fullExample:
 *               summary: Full example with all fields
 *               value:
 *                 recipientType: user
 *                 recipientId: user-uuid-here
 *                 title: New Booking Confirmed
 *                 body: Your booking for Cricket Batch has been confirmed.
 *                 channels:
 *                   - push
 *                   - email
 *                 priority: medium
 *                 data:
 *                   bookingId: BK-2024-0001
 *                   type: booking
 *                   batchId: batch-uuid-123
 *                   amount: 5000
 *                 imageUrl: https://bucket.s3.region.amazonaws.com/notifications/image.png
 *                 metadata:
 *                   customField: custom-value
 *             minimalExample:
 *               summary: Minimal example (using defaults)
 *               value:
 *                 recipientType: user
 *                 recipientId: user-uuid-here
 *                 title: New Booking Confirmed
 *                 body: Your booking for Cricket Batch has been confirmed.
 *     responses:
 *       201:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification sent successfully
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or missing notification:create permission)
 *       404:
 *         description: Recipient not found
 */
router.post(
  '/send',
  requirePermission(Section.NOTIFICATION, Action.CREATE),
  validate(sendNotificationSchema),
  notificationController.sendNotification
);

/**
 * @swagger
 * /admin/notifications/test:
 *   post:
 *     summary: Test notification
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Send a test notification to verify notification channels are working. Requires notification:create permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestNotificationRequest'
 *           examples:
 *             fullExample:
 *               summary: Test all channels
 *               value:
 *                 recipientType: user
 *                 recipientId: user-uuid-here
 *                 channels:
 *                   - push
 *                   - email
 *                   - sms
 *                   - whatsapp
 *             minimalExample:
 *               summary: Minimal test (uses default channel)
 *               value:
 *                 recipientType: user
 *                 recipientId: user-uuid-here
 *     responses:
 *       201:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Test notification sent successfully
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or missing notification:create permission)
 *       404:
 *         description: Recipient not found
 */
router.post(
  '/test',
  requirePermission(Section.NOTIFICATION, Action.CREATE),
  validate(testNotificationSchema),
  notificationController.testNotification
);

/**
 * @swagger
 * /admin/notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get a paginated list of all sent notifications with filters. Requires notification:view permission.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: recipientType
 *         schema:
 *           type: string
 *           enum: [user, academy]
 *         description: Filter by recipient type
 *       - in: query
 *         name: recipientId
 *         schema:
 *           type: string
 *         description: Filter by recipient ID
 *       - in: query
 *         name: channels
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [sms, email, whatsapp, push]
 *         description: Filter by notification channels
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *         description: Filter by priority
 *       - in: query
 *         name: sent
 *         schema:
 *           type: boolean
 *         description: Filter by sent status
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or body
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notifications retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin or missing notification:view permission)
 */
router.get(
  '/',
  requirePermission(Section.NOTIFICATION, Action.VIEW),
  notificationController.getAllNotifications
);

/**
 * @swagger
 * /admin/notifications/my:
 *   get:
 *     summary: Get admin's own notifications
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get paginated list of notifications for the authenticated admin user. Requires admin authentication.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notifications retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     unreadCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my',
  validate(listNotificationsSchema),
  notificationController.getMyNotifications
);

/**
 * @swagger
 * /admin/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for admin
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Get count of unread notifications for the authenticated admin user. Requires admin authentication.
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Unread count retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /admin/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read (admin)
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     description: Mark a specific notification as read for the authenticated admin user. Requires admin authentication.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification marked as read successfully
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.patch(
  '/:id/read',
  validate(markAsReadSchema),
  notificationController.markAsRead
);

export default router;

