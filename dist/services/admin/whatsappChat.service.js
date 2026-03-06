"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConversations = listConversations;
exports.getConversationMessages = getConversationMessages;
exports.sendMessage = sendMessage;
exports.markConversationRead = markConversationRead;
const whatsappConversation_model_1 = require("../../models/whatsappConversation.model");
const whatsappMessage_model_1 = require("../../models/whatsappMessage.model");
const metaWhatsApp_service_1 = require("../common/metaWhatsApp.service");
const settings_service_1 = require("../common/settings.service");
const ApiError_1 = require("../../utils/ApiError");
async function listConversations(params = {}) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    if (!cfg.enabled) {
        throw new ApiError_1.ApiError(503, 'WhatsApp Cloud chat is not enabled');
    }
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 20));
    const query = {};
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
        whatsappConversation_model_1.WhatsAppConversationModel.countDocuments(query),
        whatsappConversation_model_1.WhatsAppConversationModel.find(query)
            .sort({ lastMessageAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);
    const data = list.map((c) => ({
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
async function getConversationMessages(conversationId, params = {}) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    if (!cfg.enabled) {
        throw new ApiError_1.ApiError(503, 'WhatsApp Cloud chat is not enabled');
    }
    const conversation = await whatsappConversation_model_1.WhatsAppConversationModel.findById(conversationId).lean();
    if (!conversation) {
        throw new ApiError_1.ApiError(404, 'Conversation not found');
    }
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const [total, list] = await Promise.all([
        whatsappMessage_model_1.WhatsAppMessageModel.countDocuments({ conversation: conversationId }),
        whatsappMessage_model_1.WhatsAppMessageModel.find({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);
    const data = list.map((m) => ({
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
    if (conversation.unreadCount > 0) {
        await whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ _id: conversationId }, { $set: { unreadCount: 0 } });
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
async function sendMessage(conversationId, text) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    if (!cfg.enabled) {
        throw new ApiError_1.ApiError(503, 'WhatsApp Cloud chat is not enabled');
    }
    const conversation = await whatsappConversation_model_1.WhatsAppConversationModel.findById(conversationId).lean();
    if (!conversation) {
        throw new ApiError_1.ApiError(404, 'Conversation not found');
    }
    const phone = conversation.phone;
    const { messageId } = await (0, metaWhatsApp_service_1.sendWhatsAppCloudText)(phone, text);
    const now = new Date();
    const timestampSec = Math.floor(now.getTime() / 1000);
    const msg = await whatsappMessage_model_1.WhatsAppMessageModel.create({
        conversation: conversationId,
        direction: 'out',
        type: 'text',
        content: text,
        waMessageId: messageId,
        waTimestamp: timestampSec,
        status: 'sent',
        fromAdmin: true,
    });
    await whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ _id: conversationId }, {
        $set: {
            lastMessageAt: now,
            lastMessagePreview: text.slice(0, 100),
            lastMessageFromUs: true,
        },
    });
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
async function markConversationRead(conversationId) {
    await whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ _id: conversationId }, { $set: { unreadCount: 0 } });
}
//# sourceMappingURL=whatsappChat.service.js.map