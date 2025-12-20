import { Router } from 'express';
import * as notificationController from '../../controllers/admin/notification.controller';
import { validate } from '../../middleware/validation.middleware';
import {
  sendNotificationSchema,
  testNotificationSchema,
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

export default router;

