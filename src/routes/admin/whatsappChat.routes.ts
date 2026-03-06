import { Router } from 'express';
import * as whatsappChatController from '../../controllers/admin/whatsappChat.controller';
import { validate } from '../../middleware/validation.middleware';
import {
  listConversationsSchema,
  getConversationMessagesSchema,
  sendMessageSchema,
  markReadSchema,
} from '../../validations/whatsappChat.validation';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { Section } from '../../enums/section.enum';
import { Action } from '../../enums/section.enum';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/whatsapp-chat/conversations
 * List WhatsApp conversations (Meta Cloud API stored chats)
 */
router.get(
  '/conversations',
  requirePermission(Section.NOTIFICATION, Action.VIEW),
  validate(listConversationsSchema),
  whatsappChatController.listConversations
);

/**
 * GET /admin/whatsapp-chat/conversations/:conversationId/messages
 * Get messages in a conversation (paginated). Marks unread as read.
 */
router.get(
  '/conversations/:conversationId/messages',
  requirePermission(Section.NOTIFICATION, Action.VIEW),
  validate(getConversationMessagesSchema),
  whatsappChatController.getConversationMessages
);

/**
 * POST /admin/whatsapp-chat/conversations/:conversationId/send
 * Send a text message to the conversation (recipient phone)
 */
router.post(
  '/conversations/:conversationId/send',
  requirePermission(Section.NOTIFICATION, Action.CREATE),
  validate(sendMessageSchema),
  whatsappChatController.sendMessage
);

/**
 * POST /admin/whatsapp-chat/conversations/:conversationId/read
 * Mark conversation as read (clear unread count)
 */
router.post(
  '/conversations/:conversationId/read',
  requirePermission(Section.NOTIFICATION, Action.VIEW),
  validate(markReadSchema),
  whatsappChatController.markConversationRead
);

export default router;
