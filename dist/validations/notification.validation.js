"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotificationSchema = exports.markAsUnreadSchema = exports.markAsReadSchema = exports.listNotificationsSchema = exports.testNotificationSchema = exports.sendNotificationSchema = void 0;
const zod_1 = require("zod");
// Send notification schema (admin)
exports.sendNotificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        recipientType: zod_1.z.enum(['user', 'academy'], 'Recipient type must be either "user" or "academy"'),
        recipientId: zod_1.z.string().min(1, 'Recipient ID is required'),
        title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
        body: zod_1.z.string().min(1, 'Body is required').max(1000, 'Body must be less than 1000 characters'),
        channels: zod_1.z
            .array(zod_1.z.enum(['sms', 'email', 'whatsapp', 'push']))
            .min(1, 'At least one channel is required')
            .optional()
            .default(['push']),
        priority: zod_1.z.enum(['high', 'medium', 'low']).optional().default('medium'),
        data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        imageUrl: zod_1.z.string().url('Invalid image URL').optional().nullable(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    }),
});
// Test notification schema
exports.testNotificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        recipientType: zod_1.z.enum(['user', 'academy'], 'Recipient type must be either "user" or "academy"'),
        recipientId: zod_1.z.string().min(1, 'Recipient ID is required'),
        channels: zod_1.z
            .array(zod_1.z.enum(['sms', 'email', 'whatsapp', 'push']))
            .min(1, 'At least one channel is required')
            .optional()
            .default(['push']),
    }),
});
// List notifications query schema
exports.listNotificationsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        isRead: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                if (val === 'true')
                    return true;
                if (val === 'false')
                    return false;
            }
            return val;
        }, zod_1.z.boolean().optional())
            .optional(),
    }),
});
// Mark notification as read schema
exports.markAsReadSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Notification ID is required'),
    }),
});
// Mark notification as unread schema
exports.markAsUnreadSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Notification ID is required'),
    }),
});
// Delete notification schema
exports.deleteNotificationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Notification ID is required'),
    }),
});
//# sourceMappingURL=notification.validation.js.map