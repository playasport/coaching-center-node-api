import { WhatsAppConversationModel } from '../../models/whatsappConversation.model';
import { WhatsAppMessageModel } from '../../models/whatsappMessage.model';
import { WhatsAppTemplateMessageModel } from '../../models/whatsappTemplateMessage.model';
import { sendWhatsAppCloudText, sendWhatsAppCloudImage } from '../common/metaWhatsApp.service';
import { getWhatsAppCloudConfig } from '../common/settings.service';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

export interface ListConversationsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ConversationListItem {
  id: string;
  phone: string;
  displayName: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastMessageFromUs: boolean | null;
  unreadCount: number;
  createdAt: Date;
}

export interface ListMessagesParams {
  page?: number;
  limit?: number;
}

export interface MessageListItem {
  id: string;
  direction: 'in' | 'out';
  type: string;
  content: string;
  waMessageId: string;
  waTimestamp: number;
  status: string | null;
  fromAdmin: boolean;
  createdAt: Date;
  /** Media URL for image/video/document/audio (may expire ~5 min from Meta) */
  mediaUrl?: string | null;
  /** For reactions: the message ID this reaction refers to */
  repliedToWaMessageId?: string | null;
}

export async function listConversations(
  params: ListConversationsParams = {}
): Promise<{
  data: ConversationListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
}> {
  const cfg = await getWhatsAppCloudConfig();
  if (!cfg.enabled) {
    throw new ApiError(503, 'WhatsApp Cloud chat is not enabled');
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));

  const query: any = {};
  if (params.search && params.search.trim()) {
    const s = params.search.trim().replace(/\D/g, '');
    if (s) {
      query.$or = [
        { phone: { $regex: s, $options: 'i' } },
        { displayName: { $regex: params.search.trim(), $options: 'i' } },
      ];
    }
  }

  const [total, list] = await Promise.all([
    WhatsAppConversationModel.countDocuments(query),
    WhatsAppConversationModel.find(query)
      .select('phone displayName lastMessageAt lastMessagePreview lastMessageFromUs unreadCount createdAt')
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const data: ConversationListItem[] = list.map((c: any) => ({
    id: c._id.toString(),
    phone: c.phone,
    displayName: c.displayName ?? null,
    lastMessageAt: c.lastMessageAt,
    lastMessagePreview: c.lastMessagePreview ?? null,
    lastMessageFromUs: c.lastMessageFromUs ?? null,
    unreadCount: c.unreadCount ?? 0,
    createdAt: c.createdAt,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}

export async function getConversationMessages(
  conversationId: string,
  params: ListMessagesParams = {}
): Promise<{
  data: MessageListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
}> {
  const cfg = await getWhatsAppCloudConfig();
  if (!cfg.enabled) {
    throw new ApiError(503, 'WhatsApp Cloud chat is not enabled');
  }

  const conversation = await WhatsAppConversationModel.findById(conversationId)
    .select('phone unreadCount')
    .lean();
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));

  const [total, list] = await Promise.all([
    WhatsAppMessageModel.countDocuments({ conversation: conversationId }),
    WhatsAppMessageModel.find({ conversation: conversationId })
      .select('direction type content waMessageId waTimestamp status fromAdmin createdAt mediaUrl repliedToWaMessageId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const data: MessageListItem[] = list.map((m: any) => ({
    id: m._id.toString(),
    direction: m.direction,
    type: m.type,
    content: m.content,
    waMessageId: m.waMessageId,
    waTimestamp: m.waTimestamp,
    status: m.status ?? null,
    fromAdmin: m.fromAdmin ?? false,
    createdAt: m.createdAt,
    mediaUrl: m.mediaUrl ?? null,
    repliedToWaMessageId: m.repliedToWaMessageId ?? null,
  }));

  const totalPages = Math.ceil(total / limit);

  // Mark unread as read when admin opens conversation (fire-and-forget to avoid blocking response)
  if ((conversation as any).unreadCount > 0) {
    WhatsAppConversationModel.updateOne(
      { _id: conversationId },
      { $set: { unreadCount: 0 } }
    ).catch((err) => {
      logger.warn('WhatsApp chat: failed to mark conversation read', { conversationId, err });
    });
  }

  return {
    data: data.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}

export type SendMessagePayload =
  | { type?: 'text'; text: string }
  | { type: 'image'; imageUrl: string; caption?: string };

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload
): Promise<MessageListItem> {
  const cfg = await getWhatsAppCloudConfig();
  if (!cfg.enabled) {
    throw new ApiError(503, 'WhatsApp Cloud chat is not enabled');
  }

  const conversation = await WhatsAppConversationModel.findById(conversationId).lean();
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const phone = (conversation as any).phone;
  const isImage = payload.type === 'image' && payload.imageUrl;
  let messageId: string;
  let contentType: string;
  let content: string;
  let mediaUrl: string | null = null;

  if (isImage) {
    const res = await sendWhatsAppCloudImage(phone, payload.imageUrl, payload.caption);
    messageId = res.messageId;
    contentType = 'image';
    content = payload.caption?.trim() || '[Image]';
    mediaUrl = payload.imageUrl;
  } else {
    const text = payload.type === 'text' ? payload.text : (payload as any).text;
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new ApiError(400, 'Message text is required for text messages');
    }
    const res = await sendWhatsAppCloudText(phone, text);
    messageId = res.messageId;
    contentType = 'text';
    content = text;
  }

  const now = new Date();
  const timestampSec = Math.floor(now.getTime() / 1000);
  const preview = content.slice(0, 100);

  const [msg] = await Promise.all([
    WhatsAppMessageModel.create({
      conversation: conversationId,
      direction: 'out',
      type: contentType,
      content,
      waMessageId: messageId,
      waTimestamp: timestampSec,
      status: 'sent',
      fromAdmin: true,
      mediaUrl: mediaUrl ?? null,
    }),
    WhatsAppConversationModel.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessageAt: now,
          lastMessagePreview: preview,
          lastMessageFromUs: true,
        },
      }
    ),
  ]);

  return {
    id: msg._id.toString(),
    direction: 'out',
    type: contentType,
    content,
    waMessageId: messageId,
    waTimestamp: timestampSec,
    status: 'sent',
    fromAdmin: true,
    createdAt: msg.createdAt,
    mediaUrl: mediaUrl ?? null,
    repliedToWaMessageId: null,
  };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await WhatsAppConversationModel.updateOne(
    { _id: conversationId },
    { $set: { unreadCount: 0 } }
  );
}

export interface ListTemplateMessagesParams {
  page?: number;
  limit?: number;
  templateName?: 'payment_request' | 'payment_reminder' | 'booking_cancelled' | 'user_payment_verified' | 'booking_rejected';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  phone?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TemplateMessageListItem {
  id: string;
  phone: string;
  templateName: string;
  waMessageId: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export async function listTemplateMessages(
  params: ListTemplateMessagesParams = {}
): Promise<{
  data: TemplateMessageListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
}> {
  const cfg = await getWhatsAppCloudConfig();
  if (!cfg.enabled) {
    throw new ApiError(503, 'WhatsApp Cloud chat is not enabled');
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  const query: Record<string, unknown> = {};
  if (params.templateName) query.templateName = params.templateName;
  if (params.status) query.status = params.status;
  if (params.phone?.trim()) {
    const s = params.phone.trim().replace(/\D/g, '');
    if (s) query.phone = new RegExp(s, 'i');
  }
  if (params.dateFrom || params.dateTo) {
    query.createdAt = {};
    if (params.dateFrom) (query.createdAt as Record<string, Date>).$gte = params.dateFrom;
    if (params.dateTo) (query.createdAt as Record<string, Date>).$lte = params.dateTo;
  }

  const [total, list] = await Promise.all([
    WhatsAppTemplateMessageModel.countDocuments(query),
    WhatsAppTemplateMessageModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const data: TemplateMessageListItem[] = (list as any[]).map((m) => ({
    id: m._id.toString(),
    phone: m.phone,
    templateName: m.templateName,
    waMessageId: m.waMessageId,
    status: m.status,
    metadata: m.metadata ?? null,
    createdAt: m.createdAt,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}
