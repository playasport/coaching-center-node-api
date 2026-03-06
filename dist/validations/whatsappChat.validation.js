"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markReadSchema = exports.sendMessageSchema = exports.getConversationMessagesSchema = exports.listConversationsSchema = void 0;
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
    body: zod_1.z.object({
        text: zod_1.z.string().min(1, 'Message text is required').max(4096, 'Message too long'),
    }),
});
exports.markReadSchema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, 'Conversation ID is required'),
    }),
});
//# sourceMappingURL=whatsappChat.validation.js.map