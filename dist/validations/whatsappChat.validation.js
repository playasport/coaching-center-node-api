"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTemplateMessagesSchema = exports.markReadSchema = exports.sendMessageSchema = exports.getConversationMessagesSchema = exports.listConversationsSchema = void 0;
const zod_1 = require("zod");
exports.listConversationsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), zod_1.z.number().int().min(1).max(50).optional())
            .optional(),
        search: zod_1.z.string().max(100).optional(),
    }),
});
exports.getConversationMessagesSchema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, 'Conversation ID is required'),
    }),
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
    }),
});
exports.sendMessageSchema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, 'Conversation ID is required'),
    }),
    body: zod_1.z
        .object({
        text: zod_1.z.string().max(4096).optional(),
        type: zod_1.z.enum(['text', 'image']).optional(),
        imageUrl: zod_1.z.string().url('imageUrl must be a valid URL').optional(),
        caption: zod_1.z.string().max(1024).optional(),
    })
        .refine((data) => {
        if (data.type === 'image') {
            return !!data.imageUrl?.trim();
        }
        return !!data.text?.trim();
    }, { message: 'Either text (for text message) or type "image" with imageUrl is required' }),
});
exports.markReadSchema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, 'Conversation ID is required'),
    }),
});
exports.listTemplateMessagesSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? parseInt(v, 10) : v), zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        templateName: zod_1.z.enum(['payment_request', 'payment_reminder', 'booking_cancelled', 'user_payment_verified', 'booking_rejected']).optional(),
        status: zod_1.z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
        phone: zod_1.z.string().max(20).optional(),
        dateFrom: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? new Date(v) : v), zod_1.z.coerce.date().optional())
            .optional(),
        dateTo: zod_1.z
            .preprocess((v) => (typeof v === 'string' ? new Date(v) : v), zod_1.z.coerce.date().optional())
            .optional(),
    }),
});
//# sourceMappingURL=whatsappChat.validation.js.map