"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWhatsAppWebhook = verifyWhatsAppWebhook;
exports.verifyWhatsAppWebhookSignature = verifyWhatsAppWebhookSignature;
exports.sendWhatsAppCloudText = sendWhatsAppCloudText;
exports.processWhatsAppWebhookPayload = processWhatsAppWebhookPayload;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const settings_service_1 = require("./settings.service");
const whatsappConversation_model_1 = require("../../models/whatsappConversation.model");
const whatsappMessage_model_1 = require("../../models/whatsappMessage.model");
const GRAPH_BASE = 'https://graph.facebook.com';
/**
 * Normalize phone to digits only (E.164 without +)
 */
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
/**
 * Verify webhook subscription (GET) - Meta sends hub.mode, hub.verify_token, hub.challenge
 * @param expectedToken - From Settings or env (getWhatsAppCloudConfig().webhookVerifyToken)
 */
function verifyWhatsAppWebhook(mode, verifyToken, challenge, expectedToken) {
    if (!expectedToken || mode !== 'subscribe' || verifyToken !== expectedToken) {
        return null;
    }
    return challenge;
}
/**
 * Verify X-Hub-Signature-256 (HMAC SHA256 of raw body with app secret)
 * @param appSecret - From Settings or env (getWhatsAppCloudConfig().appSecret)
 */
function verifyWhatsAppWebhookSignature(rawBody, signatureHeader, appSecret) {
    if (!appSecret)
        return false;
    const expected = 'sha256=' + crypto_1.default.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
    }
    catch {
        return false;
    }
}
/**
 * Send text message via Meta WhatsApp Cloud API (uses Settings then env)
 */
async function sendWhatsAppCloudText(to, text) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = `${GRAPH_BASE}/${version || 'v21.0'}/${phoneNumberId}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNormalized,
        type: 'text',
        text: { preview_url: false, body: text },
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        logger_1.logger.error('WhatsApp Cloud API send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp message');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
/**
 * Process webhook payload: extract incoming messages, store in DB, upsert conversation
 */
async function processWhatsAppWebhookPayload(payload) {
    if (payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) {
        return;
    }
    for (const entry of payload.entry) {
        const changes = entry.changes;
        if (!Array.isArray(changes))
            continue;
        for (const change of changes) {
            const value = change.value;
            if (!value || change.field !== 'messages')
                continue;
            const messages = value.messages;
            const contacts = value.contacts || [];
            if (!Array.isArray(messages))
                continue;
            const contactMap = new Map();
            for (const c of contacts) {
                if (c.wa_id && c.profile?.name)
                    contactMap.set(normalizePhone(c.wa_id), c.profile.name);
            }
            for (const msg of messages) {
                const from = normalizePhone(String(msg.from || ''));
                if (!from || !msg.id)
                    continue;
                const existing = await whatsappMessage_model_1.WhatsAppMessageModel.findOne({ waMessageId: msg.id }).lean();
                if (existing)
                    continue;
                let content = '';
                let type = 'unknown';
                if (msg.type === 'text' && msg.text?.body) {
                    content = msg.text.body;
                    type = 'text';
                }
                else if (msg.type === 'image' && msg.image) {
                    content = msg.image.caption || '[Image]';
                    type = 'image';
                }
                else if (msg.type === 'video' && msg.video) {
                    content = msg.video.caption || '[Video]';
                    type = 'video';
                }
                else if (msg.type === 'document' && msg.document) {
                    content = msg.document.caption || '[Document]';
                    type = 'document';
                }
                else if (msg.type === 'audio') {
                    content = '[Audio]';
                    type = 'audio';
                }
                else {
                    content = `[${msg.type || 'unknown'}]`;
                }
                const timestamp = parseInt(String(msg.timestamp), 10) || Math.floor(Date.now() / 1000);
                let conversation = await whatsappConversation_model_1.WhatsAppConversationModel.findOne({ phone: from }).lean();
                if (!conversation) {
                    const created = await whatsappConversation_model_1.WhatsAppConversationModel.create({
                        phone: from,
                        displayName: contactMap.get(from) || null,
                        lastMessageAt: new Date(timestamp * 1000),
                        lastMessagePreview: content.slice(0, 100),
                        lastMessageFromUs: false,
                        unreadCount: 1,
                    });
                    conversation = created.toObject();
                }
                else {
                    await whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ phone: from }, {
                        $set: {
                            lastMessageAt: new Date(timestamp * 1000),
                            lastMessagePreview: content.slice(0, 100),
                            lastMessageFromUs: false,
                            displayName: contactMap.get(from) || undefined,
                        },
                        $inc: { unreadCount: 1 },
                    });
                }
                await whatsappMessage_model_1.WhatsAppMessageModel.create({
                    conversation: conversation._id,
                    direction: 'in',
                    type,
                    content,
                    waMessageId: msg.id,
                    waTimestamp: timestamp,
                    fromAdmin: false,
                });
            }
        }
    }
}
//# sourceMappingURL=metaWhatsApp.service.js.map