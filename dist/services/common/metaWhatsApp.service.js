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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWhatsAppWebhook = verifyWhatsAppWebhook;
exports.verifyWhatsAppWebhookSignature = verifyWhatsAppWebhookSignature;
exports.sendWhatsAppCloudText = sendWhatsAppCloudText;
exports.sendWhatsAppCloudImage = sendWhatsAppCloudImage;
exports.sendWhatsAppCloudPaymentRequestTemplate = sendWhatsAppCloudPaymentRequestTemplate;
exports.sendWhatsAppCloudPaymentReminderTemplate = sendWhatsAppCloudPaymentReminderTemplate;
exports.sendWhatsAppCloudBookingCancelledTemplate = sendWhatsAppCloudBookingCancelledTemplate;
exports.sendWhatsAppCloudPaymentVerifiedTemplate = sendWhatsAppCloudPaymentVerifiedTemplate;
exports.sendWhatsAppCloudBookingRejectedTemplate = sendWhatsAppCloudBookingRejectedTemplate;
exports.processWhatsAppWebhookPayload = processWhatsAppWebhookPayload;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const settings_service_1 = require("./settings.service");
const whatsappConversation_model_1 = require("../../models/whatsappConversation.model");
const whatsappMessage_model_1 = require("../../models/whatsappMessage.model");
const whatsappTemplateMessage_model_1 = require("../../models/whatsappTemplateMessage.model");
/** Meta WhatsApp Cloud API base URL – used for all template/text sends */
const WHATSAPP_GRAPH_BASE = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v25.0';
/**
 * Build the common messages API URL for WhatsApp Cloud (used by text and template sends).
 */
function getWhatsAppMessagesUrl(phoneNumberId, apiVersion) {
    const version = apiVersion || DEFAULT_API_VERSION;
    return `${WHATSAPP_GRAPH_BASE}/${version}/${phoneNumberId}/messages`;
}
/**
 * Normalize phone to digits only (E.164 without +)
 */
function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10)
        return `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0'))
        return `91${digits.slice(1)}`;
    return digits;
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
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
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
 * Send image message via Meta WhatsApp Cloud API (public URL).
 * imageUrl must be a publicly accessible HTTPS URL (e.g. JPG, PNG).
 */
async function sendWhatsAppCloudImage(to, imageUrl, caption) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNormalized,
        type: 'image',
        image: {
            link: imageUrl,
            ...(caption && caption.trim() && { caption: caption.trim().slice(0, 1024) }),
        },
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
        logger_1.logger.error('WhatsApp Cloud API image send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp image');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
/**
 * Send approved-booking payment request via Meta WhatsApp template "payment_request".
 * Template: header (image), body (user_name, academy_name, booking_id, payment_url, number_hours), button (url with dynamic param).
 */
async function sendWhatsAppCloudPaymentRequestTemplate(to, params) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
    const body = {
        messaging_product: 'whatsapp',
        to: toNormalized,
        type: 'template',
        template: {
            name: 'payment_request',
            language: { code: 'en' },
            components: [
                {
                    type: 'header',
                    parameters: [
                        {
                            type: 'image',
                            image: { link: 'https://playasport.in/images/logo-light1.png' },
                        },
                    ],
                },
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', parameter_name: 'user_name', text: params.userName },
                        { type: 'text', parameter_name: 'academy_name', text: params.academyName },
                        { type: 'text', parameter_name: 'booking_id', text: params.bookingId },
                        { type: 'text', parameter_name: 'payement_url', text: params.paymentUrl },
                        { type: 'text', parameter_name: 'number_hours', text: params.numberOfHours },
                    ],
                },
                {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: params.buttonUrlParameter }],
                },
            ],
        },
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
        logger_1.logger.error('WhatsApp Cloud API template send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp template message');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
/**
 * Send payment reminder via Meta WhatsApp template "payment_reminder".
 * Body: batch_name, academy_name, hours_left, booking_id, payment_link. Button: URL with dynamic param.
 */
async function sendWhatsAppCloudPaymentReminderTemplate(to, params) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
    const body = {
        messaging_product: 'whatsapp',
        to: toNormalized,
        type: 'template',
        template: {
            name: 'payment_reminder',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', parameter_name: 'batch_name', text: params.batchName },
                        { type: 'text', parameter_name: 'academy_name', text: params.academyName },
                        { type: 'text', parameter_name: 'hours_left', text: params.hoursLeft },
                        { type: 'text', parameter_name: 'booking_id', text: params.bookingId },
                        { type: 'text', parameter_name: 'payment_link', text: params.paymentLink },
                    ],
                },
                {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: params.buttonUrlParameter }],
                },
            ],
        },
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
        logger_1.logger.error('WhatsApp Cloud API payment_reminder template send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp payment reminder template');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
/**
 * Send booking cancelled notification via Meta WhatsApp template "booking_cancelled".
 * Body only: batch_name, academy_name, booking_id, cancel_reason. No buttons.
 */
async function sendWhatsAppCloudBookingCancelledTemplate(to, params) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
    const body = {
        messaging_product: 'whatsapp',
        to: toNormalized,
        type: 'template',
        template: {
            name: 'booking_cancelled',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', parameter_name: 'batch_name', text: params.batchName },
                        { type: 'text', parameter_name: 'academy_name', text: params.academyName },
                        { type: 'text', parameter_name: 'booking_id', text: params.bookingId },
                        { type: 'text', parameter_name: 'cancel_reason', text: params.cancelReason },
                    ],
                },
            ],
        },
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
        logger_1.logger.error('WhatsApp Cloud API booking_cancelled template send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp booking_cancelled template');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
/**
 * Send payment verified notification via Meta WhatsApp template "user_payment_verified".
 * Body only: user_name, booking_id, batch_name, sport_name, center_name, participants, start_date, start_time, end_time, currency, amount.
 */
async function sendWhatsAppCloudPaymentVerifiedTemplate(to, params) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
    const body = {
        messaging_product: 'whatsapp',
        to: toNormalized,
        type: 'template',
        template: {
            name: 'user_payment_verified',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', parameter_name: 'user_name', text: params.userName },
                        { type: 'text', parameter_name: 'booking_id', text: params.bookingId },
                        { type: 'text', parameter_name: 'batch_name', text: params.batchName },
                        { type: 'text', parameter_name: 'sport_name', text: params.sportName },
                        { type: 'text', parameter_name: 'center_name', text: params.centerName },
                        { type: 'text', parameter_name: 'participants', text: params.participants },
                        { type: 'text', parameter_name: 'start_date', text: params.startDate },
                        { type: 'text', parameter_name: 'start_time', text: params.startTime },
                        { type: 'text', parameter_name: 'end_time', text: params.endTime },
                        { type: 'text', parameter_name: 'currency', text: params.currency },
                        { type: 'text', parameter_name: 'amount', text: params.amount },
                    ],
                },
            ],
        },
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
        logger_1.logger.error('WhatsApp Cloud API user_payment_verified template send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp user_payment_verified template');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
/**
 * Send booking rejected notification via Meta WhatsApp template "booking_rejected".
 * Body only: batch_name, center_name, booking_id, rejection_reason.
 */
async function sendWhatsAppCloudBookingRejectedTemplate(to, params) {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const phoneNumberId = cfg.phoneNumberId;
    const accessToken = cfg.accessToken;
    const version = cfg.apiVersion;
    if (!cfg.enabled || !phoneNumberId || !accessToken) {
        throw new ApiError_1.ApiError(500, 'WhatsApp Cloud API is not configured');
    }
    const toNormalized = normalizePhone(to);
    const url = getWhatsAppMessagesUrl(phoneNumberId, version);
    const body = {
        messaging_product: 'whatsapp',
        to: toNormalized,
        type: 'template',
        template: {
            name: 'booking_rejected',
            language: { code: 'en' },
            components: [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', parameter_name: 'batch_name', text: params.batchName },
                        { type: 'text', parameter_name: 'center_name', text: params.centerName },
                        { type: 'text', parameter_name: 'booking_id', text: params.bookingId },
                        { type: 'text', parameter_name: 'rejection_reason', text: params.rejectionReason },
                    ],
                },
            ],
        },
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
        logger_1.logger.error('WhatsApp Cloud API booking_rejected template send failed', {
            status: res.status,
            to: toNormalized,
            error: data.error || data,
        });
        throw new ApiError_1.ApiError(res.status >= 500 ? 502 : 400, data.error?.message || 'Failed to send WhatsApp booking_rejected template');
    }
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
        throw new ApiError_1.ApiError(502, 'WhatsApp API did not return message id');
    }
    return { messageId };
}
const WHATSAPP_MEDIA_S3_FOLDER = 'whatsapp-media';
/**
 * Fetch media metadata + URL from Meta Graph API.
 * GET https://graph.facebook.com/v25.0/{media_id} with Bearer token.
 * Returns { url, mime_type } or null. Meta URL is temporary and auth-required; do NOT store in DB.
 */
async function getMediaUrlFromMeta(mediaId) {
    try {
        const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
        if (!cfg.accessToken)
            return null;
        const version = cfg.apiVersion || DEFAULT_API_VERSION;
        const apiUrl = `${WHATSAPP_GRAPH_BASE}/${version}/${mediaId}`;
        const res = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${cfg.accessToken}` },
        });
        const data = (await res.json().catch(() => ({})));
        const url = data.url?.trim();
        if (!url)
            return null;
        const mimeType = data.mime_type?.trim() || 'application/octet-stream';
        return { url, mimeType };
    }
    catch (err) {
        logger_1.logger.warn('Failed to fetch WhatsApp media URL from Meta', { mediaId, error: err });
        return null;
    }
}
/**
 * Download media from Meta (using media ID), upload to our S3, and return ONLY the public S3 URL.
 * Flow: GET graph.facebook.com/vX.X/{media_id} -> get url (lookaside.fbsbx.com...) -> GET that url with Bearer -> upload bytes to S3.
 * We never store Meta's URL in DB; only S3 URL or null.
 */
async function downloadWhatsAppMediaAndUploadToS3(mediaId, mediaType) {
    try {
        const meta = await getMediaUrlFromMeta(mediaId);
        if (!meta)
            return null;
        const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
        if (!cfg.accessToken)
            return null;
        const downloadRes = await fetch(meta.url, {
            headers: { Authorization: `Bearer ${cfg.accessToken}` },
        });
        if (!downloadRes.ok) {
            logger_1.logger.warn('WhatsApp media download failed', { mediaId, status: downloadRes.status });
            return null;
        }
        const contentType = downloadRes.headers.get('content-type')?.split(';')[0]?.trim() ||
            meta.mimeType ||
            (mediaType === 'image'
                ? 'image/jpeg'
                : mediaType === 'video'
                    ? 'video/mp4'
                    : mediaType === 'audio'
                        ? 'audio/ogg'
                        : 'application/octet-stream');
        const buffer = Buffer.from(await downloadRes.arrayBuffer());
        const { uploadBufferToS3, getS3Client } = await Promise.resolve().then(() => __importStar(require('./s3.service')));
        if (!getS3Client()) {
            logger_1.logger.warn('S3 not configured; WhatsApp media not uploaded');
            return null;
        }
        const s3Url = await uploadBufferToS3({
            buffer,
            folder: WHATSAPP_MEDIA_S3_FOLDER,
            contentType,
        });
        logger_1.logger.info('WhatsApp media uploaded to S3 (storing S3 URL only)', {
            mediaId,
            mediaType,
            s3UrlPrefix: s3Url.slice(0, 50),
        });
        return s3Url;
    }
    catch (err) {
        logger_1.logger.warn('WhatsApp media download/upload to S3 failed', { mediaId, mediaType, error: err });
        return null;
    }
}
/**
 * Process webhook payload: message status updates, incoming messages (text, media with URLs, reactions, button clicks), template tracking via statuses.
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
            const contacts = value.contacts || [];
            const contactMap = new Map();
            for (const c of contacts) {
                if (c.wa_id && c.profile?.name)
                    contactMap.set(normalizePhone(c.wa_id), c.profile.name);
            }
            // ----- Message status (incl. template tracking: sent, delivered, read, failed) -----
            const statuses = value.statuses;
            if (Array.isArray(statuses)) {
                for (const st of statuses) {
                    if (!st.id || !st.status)
                        continue;
                    await Promise.all([
                        whatsappMessage_model_1.WhatsAppMessageModel.updateOne({ waMessageId: st.id }, { $set: { status: st.status } }).exec(),
                        whatsappTemplateMessage_model_1.WhatsAppTemplateMessageModel.updateOne({ waMessageId: st.id }, { $set: { status: st.status } }).exec(),
                    ]);
                }
            }
            // ----- Incoming messages -----
            const messages = value.messages;
            if (!Array.isArray(messages))
                continue;
            for (const msg of messages) {
                const from = normalizePhone(String(msg.from || ''));
                if (!from || !msg.id)
                    continue;
                const existing = await whatsappMessage_model_1.WhatsAppMessageModel.findOne({ waMessageId: msg.id }).lean();
                if (existing)
                    continue;
                let content = '';
                let type = 'unknown';
                let mediaUrl = null;
                let repliedToWaMessageId = null;
                const rawPayload = {};
                if (msg.type === 'text' && msg.text?.body) {
                    content = msg.text.body;
                    type = 'text';
                }
                else if (msg.type === 'reaction' && msg.reaction) {
                    content = msg.reaction.emoji || '';
                    type = 'reaction';
                    repliedToWaMessageId = msg.reaction.message_id || null;
                    rawPayload.reaction_message_id = msg.reaction.message_id;
                }
                else if (msg.type === 'button' && msg.button) {
                    content = msg.button.text || msg.button.payload || '[Button]';
                    type = 'interactive';
                    rawPayload.button_payload = msg.button.payload;
                }
                else if (msg.type === 'interactive' && msg.interactive) {
                    const ir = msg.interactive;
                    if (ir.button_reply) {
                        content = ir.button_reply.title || ir.button_reply.id || '[Button]';
                        rawPayload.button_reply_id = ir.button_reply.id;
                    }
                    else if (ir.list_reply) {
                        content = ir.list_reply.title || ir.list_reply.id || '[List]';
                        rawPayload.list_reply_id = ir.list_reply.id;
                    }
                    else {
                        content = '[Interactive]';
                    }
                    type = 'interactive';
                }
                else if (msg.type === 'image' && msg.image) {
                    content = msg.image.caption || '[Image]';
                    type = 'image';
                    if (msg.image.id) {
                        rawPayload.media_id = msg.image.id;
                        mediaUrl = await downloadWhatsAppMediaAndUploadToS3(msg.image.id, 'image');
                    }
                }
                else if (msg.type === 'video' && msg.video) {
                    content = msg.video.caption || '[Video]';
                    type = 'video';
                    if (msg.video.id) {
                        rawPayload.media_id = msg.video.id;
                        mediaUrl = await downloadWhatsAppMediaAndUploadToS3(msg.video.id, 'video');
                    }
                }
                else if (msg.type === 'document' && msg.document) {
                    content = msg.document.caption || msg.document.filename || '[Document]';
                    type = 'document';
                    if (msg.document.id) {
                        rawPayload.media_id = msg.document.id;
                        mediaUrl = await downloadWhatsAppMediaAndUploadToS3(msg.document.id, 'document');
                    }
                }
                else if (msg.type === 'audio' && msg.audio) {
                    content = '[Audio]';
                    type = 'audio';
                    if (msg.audio.id) {
                        rawPayload.media_id = msg.audio.id;
                        mediaUrl = await downloadWhatsAppMediaAndUploadToS3(msg.audio.id, 'audio');
                    }
                }
                else {
                    content = `[${msg.type || 'unknown'}]`;
                }
                const timestamp = parseInt(String(msg.timestamp), 10) || Math.floor(Date.now() / 1000);
                const preview = content.slice(0, 100);
                let conversation = await whatsappConversation_model_1.WhatsAppConversationModel.findOne({ phone: from }).lean();
                if (!conversation) {
                    const created = await whatsappConversation_model_1.WhatsAppConversationModel.create({
                        phone: from,
                        displayName: contactMap.get(from) || null,
                        lastMessageAt: new Date(timestamp * 1000),
                        lastMessagePreview: preview,
                        lastMessageFromUs: false,
                        unreadCount: 1,
                    });
                    conversation = created.toObject();
                }
                else {
                    await whatsappConversation_model_1.WhatsAppConversationModel.updateOne({ phone: from }, {
                        $set: {
                            lastMessageAt: new Date(timestamp * 1000),
                            lastMessagePreview: preview,
                            lastMessageFromUs: false,
                            displayName: contactMap.get(from) || undefined,
                        },
                        $inc: { unreadCount: 1 },
                    });
                }
                // Only store our S3 (or own server) URL in DB; never store Meta's temporary URL (lookaside.fbsbx.com)
                const isOurStorageUrl = mediaUrl && !mediaUrl.includes('lookaside.fbsbx.com');
                await whatsappMessage_model_1.WhatsAppMessageModel.create({
                    conversation: conversation._id,
                    direction: 'in',
                    type,
                    content,
                    waMessageId: msg.id,
                    waTimestamp: timestamp,
                    fromAdmin: false,
                    ...(isOurStorageUrl && { mediaUrl: mediaUrl }),
                    ...(repliedToWaMessageId && { repliedToWaMessageId }),
                    ...(Object.keys(rawPayload).length > 0 && { rawPayload }),
                });
            }
        }
    }
}
//# sourceMappingURL=metaWhatsApp.service.js.map