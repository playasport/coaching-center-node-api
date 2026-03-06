import { WhatsAppConversationModel } from '../../models/whatsappConversation.model';
import { WhatsAppMessageModel } from '../../models/whatsappMessage.model';
import { sendWhatsAppCloudText } from '../common/metaWhatsApp.service';
import { getWhatsAppCloudConfig } from '../common/settings.service';
import { ApiError } from '../../utils/ApiError';

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

  const conversation = await WhatsAppConversationModel.findById(conversationId).lean();
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));

  const [total, list] = await Promise.all([
    WhatsAppMessageModel.countDocuments({ conversation: conversationId }),
    WhatsAppMessageModel.find({ conversation: conversationId })
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
  }));

  const totalPages = Math.ceil(total / limit);

  // Mark unread as read when admin opens conversation
  if ((conversation as any).unreadCount > 0) {
    await WhatsAppConversationModel.updateOne(
      { _id: conversationId },
      { $set: { unreadCount: 0 } }
    );
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

export async function sendMessage(conversationId: string, text: string): Promise<MessageListItem> {
  const cfg = await getWhatsAppCloudConfig();
  if (!cfg.enabled) {
    throw new ApiError(503, 'WhatsApp Cloud chat is not enabled');
  }

  const conversation = await WhatsAppConversationModel.findById(conversationId).lean();
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const phone = (conversation as any).phone;
  const { messageId } = await sendWhatsAppCloudText(phone, text);

  const now = new Date();
  const timestampSec = Math.floor(now.getTime() / 1000);

  const msg = await WhatsAppMessageModel.create({
    conversation: conversationId,
    direction: 'out',
    type: 'text',
    content: text,
    waMessageId: messageId,
    waTimestamp: timestampSec,
    status: 'sent',
    fromAdmin: true,
  });

  await WhatsAppConversationModel.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageAt: now,
        lastMessagePreview: text.slice(0, 100),
        lastMessageFromUs: true,
      },
    }
  );

  return {
    id: msg._id.toString(),
    direction: 'out',
    type: 'text',
    content: text,
    waMessageId: messageId,
    waTimestamp: timestampSec,
    status: 'sent',
    fromAdmin: true,
    createdAt: msg.createdAt,
  };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await WhatsAppConversationModel.updateOne(
    { _id: conversationId },
    { $set: { unreadCount: 0 } }
  );
}
