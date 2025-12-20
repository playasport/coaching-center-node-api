import { z } from 'zod';

// Send notification schema (admin)
export const sendNotificationSchema = z.object({
  body: z.object({
    recipientType: z.enum(['user', 'academy'], 'Recipient type must be either "user" or "academy"'),
    recipientId: z.string().min(1, 'Recipient ID is required'),
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    body: z.string().min(1, 'Body is required').max(1000, 'Body must be less than 1000 characters'),
    channels: z
      .array(z.enum(['sms', 'email', 'whatsapp', 'push']))
      .min(1, 'At least one channel is required')
      .optional()
      .default(['push']),
    priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
    data: z.record(z.string(), z.unknown()).optional(),
    imageUrl: z.string().url('Invalid image URL').optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>['body'];

// Test notification schema
export const testNotificationSchema = z.object({
  body: z.object({
    recipientType: z.enum(['user', 'academy'], 'Recipient type must be either "user" or "academy"'),
    recipientId: z.string().min(1, 'Recipient ID is required'),
    channels: z
      .array(z.enum(['sms', 'email', 'whatsapp', 'push']))
      .min(1, 'At least one channel is required')
      .optional()
      .default(['push']),
  }),
});

export type TestNotificationInput = z.infer<typeof testNotificationSchema>['body'];

// List notifications query schema
export const listNotificationsSchema = z.object({
  query: z.object({
    page: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    isRead: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          if (val === 'true') return true;
          if (val === 'false') return false;
        }
        return val;
      }, z.boolean().optional())
      .optional(),
  }),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>['query'];

// Mark notification as read schema
export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification ID is required'),
  }),
});

// Mark notification as unread schema
export const markAsUnreadSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification ID is required'),
  }),
});

// Delete notification schema
export const deleteNotificationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification ID is required'),
  }),
});

