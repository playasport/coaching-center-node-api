import { z } from 'zod';

export const listConversationsSchema = z.object({
  query: z.object({
    page: z
      .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).max(50).optional())
      .optional(),
    search: z.string().max(100).optional(),
  }),
});

export const getConversationMessagesSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
  }),
  query: z.object({
    page: z
      .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).max(100).optional())
      .optional(),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
  }),
  body: z
    .object({
      text: z.string().max(4096).optional(),
      type: z.enum(['text', 'image']).optional(),
      imageUrl: z.string().url('imageUrl must be a valid URL').optional(),
      caption: z.string().max(1024).optional(),
    })
    .refine(
      (data) => {
        if (data.type === 'image') {
          return !!data.imageUrl?.trim();
        }
        return !!data.text?.trim();
      },
      { message: 'Either text (for text message) or type "image" with imageUrl is required' }
    ),
});

export const markReadSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
  }),
});

export const listTemplateMessagesSchema = z.object({
  query: z.object({
    page: z
      .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), z.number().int().min(1).max(100).optional())
      .optional(),
    templateName: z.enum(['payment_request', 'payment_reminder', 'booking_cancelled']).optional(),
    status: z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
    phone: z.string().max(20).optional(),
    dateFrom: z
      .preprocess((v) => (typeof v === 'string' ? new Date(v) : v), z.coerce.date().optional())
      .optional(),
    dateTo: z
      .preprocess((v) => (typeof v === 'string' ? new Date(v) : v), z.coerce.date().optional())
      .optional(),
  }),
});
