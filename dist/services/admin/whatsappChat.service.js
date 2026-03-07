"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConversations = listConversations;
exports.getConversationMessages = getConversationMessages;
exports.sendMessage = sendMessage;
exports.markConversationRead = markConversationRead;
exports.listTemplateMessages = listTemplateMessages;
const whatsappConversation_model_1 = require("../../models/whatsappConversation.model");
const whatsappMessage_model_1 = require("../../models/whatsappMessage.model");
const whatsappTemplateMessage_model_1 = require("../../models/whatsappTemplateMessage.model");
const metaWhatsApp_service_1 = require("../common/metaWhatsApp.service");
const settings_service_1 = require("../common/settings.service");
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
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
            .select('phone displayName lastMessageAt lastMessagePreview lastMessageFromUs unreadCount createdAt')
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
    const conversation = await whatsappConversation_model_1.WhatsAppConversationModel.findById(conversationId)
        .select('phone unreadCount')
        .lean();
    if (!conversation) {
        throw new ApiError_1.ApiError(404, 'Conversation not found');
    }
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const [total, list] = await Promise.all([
        whatsappMessage_model_1.WhatsAppMessageModel.countDocuments({ conversation: conversationId }),
        whatsappMessage_model_1.WhatsAppMessageModel.find({ conversation: conversationId })
            .select('direction type content waMessageId waTimestamp status fromAdmin createdAt mediaUrl repliedToWaMessageId')
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
        mediaUrl: m.mediaUrl ?? null,
        repliedToWaMessageId: m.repliedToWaMessageId ?? null,
    }));
    const totalPages = Math.ceil(total / limit);
    // Mark unread as read when admin opens conversation (fire-and-forget to avoid blocking response)
    if (conversation.unreadCount > 0) {
        whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ _id: conversationId }, { $set: { unreadCount: 0 } }).catch((err) => {
            logger_1.logger.warn('WhatsApp chat: failed to mark conversation read', { conversationId, err });
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
async function sendMessage(conversationId, payload) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    if (!cfg.enabled) {
        throw new ApiError_1.ApiError(503, 'WhatsApp Cloud chat is not enabled');
    }
    const conversation = await whatsappConversation_model_1.WhatsAppConversationModel.findById(conversationId).lean();
    if (!conversation) {
        throw new ApiError_1.ApiError(404, 'Conversation not found');
    }
    const phone = conversation.phone;
    const isImage = payload.type === 'image' && payload.imageUrl;
    let messageId;
    let contentType;
    let content;
    let mediaUrl = null;
    if (isImage) {
        const res = await (0, metaWhatsApp_service_1.sendWhatsAppCloudImage)(phone, payload.imageUrl, payload.caption);
        messageId = res.messageId;
        contentType = 'image';
        content = payload.caption?.trim() || '[Image]';
        mediaUrl = payload.imageUrl;
    }
    else {
        const text = payload.type === 'text' ? payload.text : payload.text;
        if (!text || typeof text !== 'string' || !text.trim()) {
            throw new ApiError_1.ApiError(400, 'Message text is required for text messages');
        }
        const res = await (0, metaWhatsApp_service_1.sendWhatsAppCloudText)(phone, text);
        messageId = res.messageId;
        contentType = 'text';
        content = text;
    }
    const now = new Date();
    const timestampSec = Math.floor(now.getTime() / 1000);
    const preview = content.slice(0, 100);
    const [msg] = await Promise.all([
        whatsappMessage_model_1.WhatsAppMessageModel.create({
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
        whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ _id: conversationId }, {
            $set: {
                lastMessageAt: now,
                lastMessagePreview: preview,
                lastMessageFromUs: true,
            },
        }),
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
async function markConversationRead(conversationId) {
    await whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ _id: conversationId }, { $set: { unreadCount: 0 } });
}
async function listTemplateMessages(params = {}) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    if (!cfg.enabled) {
        throw new ApiError_1.ApiError(503, 'WhatsApp Cloud chat is not enabled');
    }
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const query = {};
    if (params.templateName)
        query.templateName = params.templateName;
    if (params.status)
        query.status = params.status;
    if (params.phone?.trim()) {
        const s = params.phone.trim().replace(/\D/g, '');
        if (s)
            query.phone = new RegExp(s, 'i');
    }
    if (params.dateFrom || params.dateTo) {
        query.createdAt = {};
        if (params.dateFrom)
            query.createdAt.$gte = params.dateFrom;
        if (params.dateTo)
            query.createdAt.$lte = params.dateTo;
    }
    const [total, list] = await Promise.all([
        whatsappTemplateMessage_model_1.WhatsAppTemplateMessageModel.countDocuments(query),
        whatsappTemplateMessage_model_1.WhatsAppTemplateMessageModel.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
    ]);
    const data = list.map((m) => ({
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
//# sourceMappingURL=whatsappChat.service.js.map