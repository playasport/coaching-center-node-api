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
  body: z.object({
    text: z.string().min(1, 'Message text is required').max(4096, 'Message too long'),
  }),
});

export const markReadSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1, 'Conversation ID is required'),
  }),
});
