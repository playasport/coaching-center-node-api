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
const whatsappChatController = __importStar(require("../../controllers/admin/whatsappChat.controller"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const whatsappChat_validation_1 = require("../../validations/whatsappChat.validation");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_middleware_1 = require("../../middleware/admin.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const section_enum_1 = require("../../enums/section.enum");
const section_enum_2 = require("../../enums/section.enum");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(admin_middleware_1.requireAdmin);
/**
 * GET /admin/whatsapp-chat/template-messages
 * List WhatsApp template messages (payment_request, payment_reminder, booking_cancelled) with delivery status
 */
router.get('/template-messages', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.NOTIFICATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(whatsappChat_validation_1.listTemplateMessagesSchema), whatsappChatController.listTemplateMessages);
/**
 * GET /admin/whatsapp-chat/conversations
 * List WhatsApp conversations (Meta Cloud API stored chats)
 */
router.get('/conversations', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.NOTIFICATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(whatsappChat_validation_1.listConversationsSchema), whatsappChatController.listConversations);
/**
 * GET /admin/whatsapp-chat/conversations/:conversationId/messages
 * Get messages in a conversation (paginated). Marks unread as read.
 */
router.get('/conversations/:conversationId/messages', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.NOTIFICATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(whatsappChat_validation_1.getConversationMessagesSchema), whatsappChatController.getConversationMessages);
/**
 * POST /admin/whatsapp-chat/conversations/:conversationId/send
 * Send a text message to the conversation (recipient phone)
 */
router.post('/conversations/:conversationId/send', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.NOTIFICATION, section_enum_2.Action.CREATE), (0, validation_middleware_1.validate)(whatsappChat_validation_1.sendMessageSchema), whatsappChatController.sendMessage);
/**
 * POST /admin/whatsapp-chat/conversations/:conversationId/read
 * Mark conversation as read (clear unread count)
 */
router.post('/conversations/:conversationId/read', (0, permission_middleware_1.requirePermission)(section_enum_1.Section.NOTIFICATION, section_enum_2.Action.VIEW), (0, validation_middleware_1.validate)(whatsappChat_validation_1.markReadSchema), whatsappChatController.markConversationRead);
exports.default = router;
//# sourceMappingURL=whatsappChat.routes.js.map