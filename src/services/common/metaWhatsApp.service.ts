import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { getWhatsAppCloudConfig } from './settings.service';
import { WhatsAppConversationModel } from '../../models/whatsappConversation.model';
import { WhatsAppMessageModel } from '../../models/whatsappMessage.model';
import type { WhatsAppMessageType } from '../../models/whatsappMessage.model';

/** Meta WhatsApp Cloud API base URL – used for all template/text sends */
const WHATSAPP_GRAPH_BASE = 'https://graph.facebook.com';
const DEFAULT_API_VERSION = 'v25.0';

/**
 * Build the common messages API URL for WhatsApp Cloud (used by text and template sends).
 */
function getWhatsAppMessagesUrl(phoneNumberId: string, apiVersion?: string): string {
  const version = apiVersion || DEFAULT_API_VERSION;
  return `${WHATSAPP_GRAPH_BASE}/${version}/${phoneNumberId}/messages`;
}

/**
 * Normalize phone to digits only (E.164 without +)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Verify webhook subscription (GET) - Meta sends hub.mode, hub.verify_token, hub.challenge
 * @param expectedToken - From Settings or env (getWhatsAppCloudConfig().webhookVerifyToken)
 */
export function verifyWhatsAppWebhook(
  mode: string,
  verifyToken: string,
  challenge: string,
  expectedToken: string
): string | null {
  if (!expectedToken || mode !== 'subscribe' || verifyToken !== expectedToken) {
    return null;
  }
  return challenge;
}

/**
 * Verify X-Hub-Signature-256 (HMAC SHA256 of raw body with app secret)
 * @param appSecret - From Settings or env (getWhatsAppCloudConfig().appSecret)
 */
export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  appSecret: string
): boolean {
  if (!appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Send text message via Meta WhatsApp Cloud API (uses Settings then env)
 */
export async function sendWhatsAppCloudText(
  to: string,
  text: string
): Promise<{ messageId: string }> {
  const cfg = await getWhatsAppCloudConfig();
  const phoneNumberId = cfg.phoneNumberId;
  const accessToken = cfg.accessToken;
  const version = cfg.apiVersion;

  if (!cfg.enabled || !phoneNumberId || !accessToken) {
    throw new ApiError(500, 'WhatsApp Cloud API is not configured');
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

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    logger.error('WhatsApp Cloud API send failed', {
      status: res.status,
      to: toNormalized,
      error: data.error || data,
    });
    throw new ApiError(
      res.status >= 500 ? 502 : 400,
      data.error?.message || 'Failed to send WhatsApp message'
    );
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new ApiError(502, 'WhatsApp API did not return message id');
  }

  return { messageId };
}

/** Parameters for the approved-booking payment_request WhatsApp template */
export interface PaymentRequestTemplateParams {
  userName: string;
  academyName: string;
  bookingId: string;
  paymentUrl: string;
  /** Hours until payment link expires (e.g. "24") */
  numberOfHours: string;
  /** Dynamic part for the CTA button URL (e.g. payment token if URL is pay?token={{1}}) */
  buttonUrlParameter: string;
}

/**
 * Send approved-booking payment request via Meta WhatsApp template "payment_request".
 * Template: header (image), body (user_name, academy_name, booking_id, payment_url, number_hours), button (url with dynamic param).
 */
export async function sendWhatsAppCloudPaymentRequestTemplate(
  to: string,
  params: PaymentRequestTemplateParams
): Promise<{ messageId: string }> {
  const cfg = await getWhatsAppCloudConfig();
  const phoneNumberId = cfg.phoneNumberId;
  const accessToken = cfg.accessToken;
  const version = cfg.apiVersion;

  if (!cfg.enabled || !phoneNumberId || !accessToken) {
    throw new ApiError(500, 'WhatsApp Cloud API is not configured');
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
            { type: 'text', text: params.userName },
            { type: 'text', text: params.academyName },
            { type: 'text', text: params.bookingId },
            { type: 'text', text: params.paymentUrl },
            { type: 'text', text: params.numberOfHours },
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

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    logger.error('WhatsApp Cloud API template send failed', {
      status: res.status,
      to: toNormalized,
      error: data.error || data,
    });
    throw new ApiError(
      res.status >= 500 ? 502 : 400,
      data.error?.message || 'Failed to send WhatsApp template message'
    );
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new ApiError(502, 'WhatsApp API did not return message id');
  }

  return { messageId };
}

/** Parameters for the payment_reminder WhatsApp template (Meta approved) */
export interface PaymentReminderTemplateParams {
  batchName: string;
  academyName: string;
  hoursLeft: string;
  bookingId: string;
  paymentLink: string;
  /** Dynamic part for the CTA button URL (e.g. payment token if URL is pay?token={{1}}) */
  buttonUrlParameter: string;
}

/**
 * Send payment reminder via Meta WhatsApp template "payment_reminder".
 * Body: batch_name, academy_name, hours_left, booking_id, payment_link. Button: URL with dynamic param.
 */
export async function sendWhatsAppCloudPaymentReminderTemplate(
  to: string,
  params: PaymentReminderTemplateParams
): Promise<{ messageId: string }> {
  const cfg = await getWhatsAppCloudConfig();
  const phoneNumberId = cfg.phoneNumberId;
  const accessToken = cfg.accessToken;
  const version = cfg.apiVersion;

  if (!cfg.enabled || !phoneNumberId || !accessToken) {
    throw new ApiError(500, 'WhatsApp Cloud API is not configured');
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
            { type: 'text', text: params.batchName },
            { type: 'text', text: params.academyName },
            { type: 'text', text: params.hoursLeft },
            { type: 'text', text: params.bookingId },
            { type: 'text', text: params.paymentLink },
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

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    logger.error('WhatsApp Cloud API payment_reminder template send failed', {
      status: res.status,
      to: toNormalized,
      error: data.error || data,
    });
    throw new ApiError(
      res.status >= 500 ? 502 : 400,
      data.error?.message || 'Failed to send WhatsApp payment reminder template'
    );
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new ApiError(502, 'WhatsApp API did not return message id');
  }

  return { messageId };
}

/** Parameters for the booking_cancelled WhatsApp template (user; body only, no button) */
export interface BookingCancelledTemplateParams {
  batchName: string;
  academyName: string;
  bookingId: string;
  cancelReason: string;
}

/**
 * Send booking cancelled notification via Meta WhatsApp template "booking_cancelled".
 * Body only: batch_name, academy_name, booking_id, cancel_reason. No buttons.
 */
export async function sendWhatsAppCloudBookingCancelledTemplate(
  to: string,
  params: BookingCancelledTemplateParams
): Promise<{ messageId: string }> {
  const cfg = await getWhatsAppCloudConfig();
  const phoneNumberId = cfg.phoneNumberId;
  const accessToken = cfg.accessToken;
  const version = cfg.apiVersion;

  if (!cfg.enabled || !phoneNumberId || !accessToken) {
    throw new ApiError(500, 'WhatsApp Cloud API is not configured');
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
            { type: 'text', text: params.batchName },
            { type: 'text', text: params.academyName },
            { type: 'text', text: params.bookingId },
            { type: 'text', text: params.cancelReason },
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

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    messages?: Array<{ id?: string }>;
  };

  if (!res.ok) {
    logger.error('WhatsApp Cloud API booking_cancelled template send failed', {
      status: res.status,
      to: toNormalized,
      error: data.error || data,
    });
    throw new ApiError(
      res.status >= 500 ? 502 : 400,
      data.error?.message || 'Failed to send WhatsApp booking_cancelled template'
    );
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    throw new ApiError(502, 'WhatsApp API did not return message id');
  }

  return { messageId };
}

/** Incoming message from webhook value.messages[] item */
interface IncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id?: string; caption?: string };
  video?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string; filename?: string };
  audio?: { id?: string };
  reaction?: { message_id: string; emoji: string };
  button?: { text: string; payload: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

/** value.contacts[] item for profile name */
interface Contact {
  wa_id: string;
  profile?: { name?: string };
}

/** value.statuses[] item for message/template delivery status */
interface MessageStatus {
  id: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  recipient_id?: string;
  timestamp?: string;
}

/**
 * Fetch media URL from Meta Graph API (URL may expire in ~5 min).
 * Returns null on failure; caller can store media_id in rawPayload for later retry.
 */
async function getMediaUrlFromMeta(mediaId: string): Promise<string | null> {
  try {
    const cfg = await getWhatsAppCloudConfig();
    if (!cfg.accessToken) return null;
    const version = cfg.apiVersion || DEFAULT_API_VERSION;
    const url = `${WHATSAPP_GRAPH_BASE}/${version}/${mediaId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    return data.url || null;
  } catch (err) {
    logger.warn('Failed to fetch WhatsApp media URL', { mediaId, error: err });
    return null;
  }
}

/**
 * Process webhook payload: message status updates, incoming messages (text, media with URLs, reactions, button clicks), template tracking via statuses.
 */
export async function processWhatsAppWebhookPayload(payload: {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Contact[];
        messages?: IncomingMessage[];
        statuses?: MessageStatus[];
      };
    }>;
  }>;
}): Promise<void> {
  if (payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) {
    return;
  }

  for (const entry of payload.entry) {
    const changes = entry.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = change.value;
      if (!value || change.field !== 'messages') continue;

      const contacts = value.contacts || [];
      const contactMap = new Map<string, string>();
      for (const c of contacts) {
        if (c.wa_id && c.profile?.name) contactMap.set(normalizePhone(c.wa_id), c.profile.name);
      }

      // ----- Message status (incl. template tracking: sent, delivered, read, failed) -----
      const statuses = value.statuses;
      if (Array.isArray(statuses)) {
        for (const st of statuses) {
          if (!st.id || !st.status) continue;
          await WhatsAppMessageModel.updateOne(
            { waMessageId: st.id },
            { $set: { status: st.status } }
          ).exec();
        }
      }

      // ----- Incoming messages -----
      const messages = value.messages;
      if (!Array.isArray(messages)) continue;

      for (const msg of messages) {
        const from = normalizePhone(String(msg.from || ''));
        if (!from || !msg.id) continue;

        const existing = await WhatsAppMessageModel.findOne({ waMessageId: msg.id }).lean();
        if (existing) continue;

        let content = '';
        let type: WhatsAppMessageType = 'unknown';
        let mediaUrl: string | null = null;
        let repliedToWaMessageId: string | null = null;
        const rawPayload: Record<string, unknown> = {};

        if (msg.type === 'text' && msg.text?.body) {
          content = msg.text.body;
          type = 'text';
        } else if (msg.type === 'reaction' && msg.reaction) {
          content = msg.reaction.emoji || '';
          type = 'reaction';
          repliedToWaMessageId = msg.reaction.message_id || null;
          rawPayload.reaction_message_id = msg.reaction.message_id;
        } else if (msg.type === 'button' && msg.button) {
          content = msg.button.text || msg.button.payload || '[Button]';
          type = 'interactive';
          rawPayload.button_payload = msg.button.payload;
        } else if (msg.type === 'interactive' && msg.interactive) {
          const ir = msg.interactive;
          if (ir.button_reply) {
            content = ir.button_reply.title || ir.button_reply.id || '[Button]';
            rawPayload.button_reply_id = ir.button_reply.id;
          } else if (ir.list_reply) {
            content = ir.list_reply.title || ir.list_reply.id || '[List]';
            rawPayload.list_reply_id = ir.list_reply.id;
          } else {
            content = '[Interactive]';
          }
          type = 'interactive';
        } else if (msg.type === 'image' && msg.image) {
          content = msg.image.caption || '[Image]';
          type = 'image';
          if (msg.image.id) {
            rawPayload.media_id = msg.image.id;
            mediaUrl = await getMediaUrlFromMeta(msg.image.id);
          }
        } else if (msg.type === 'video' && msg.video) {
          content = msg.video.caption || '[Video]';
          type = 'video';
          if (msg.video.id) {
            rawPayload.media_id = msg.video.id;
            mediaUrl = await getMediaUrlFromMeta(msg.video.id);
          }
        } else if (msg.type === 'document' && msg.document) {
          content = msg.document.caption || msg.document.filename || '[Document]';
          type = 'document';
          if (msg.document.id) {
            rawPayload.media_id = msg.document.id;
            mediaUrl = await getMediaUrlFromMeta(msg.document.id);
          }
        } else if (msg.type === 'audio' && msg.audio) {
          content = '[Audio]';
          type = 'audio';
          if (msg.audio.id) {
            rawPayload.media_id = msg.audio.id;
            mediaUrl = await getMediaUrlFromMeta(msg.audio.id);
          }
        } else {
          content = `[${msg.type || 'unknown'}]`;
        }

        const timestamp = parseInt(String(msg.timestamp), 10) || Math.floor(Date.now() / 1000);
        const preview = content.slice(0, 100);

        let conversation = await WhatsAppConversationModel.findOne({ phone: from }).lean();
        if (!conversation) {
          const created = await WhatsAppConversationModel.create({
            phone: from,
            displayName: contactMap.get(from) || null,
            lastMessageAt: new Date(timestamp * 1000),
            lastMessagePreview: preview,
            lastMessageFromUs: false,
            unreadCount: 1,
          });
          conversation = created.toObject();
        } else {
          await WhatsAppConversationModel.updateOne(
            { phone: from },
            {
              $set: {
                lastMessageAt: new Date(timestamp * 1000),
                lastMessagePreview: preview,
                lastMessageFromUs: false,
                displayName: contactMap.get(from) || undefined,
              },
              $inc: { unreadCount: 1 },
            }
          );
        }

        await WhatsAppMessageModel.create({
          conversation: (conversation as any)._id,
          direction: 'in',
          type,
          content,
          waMessageId: msg.id,
          waTimestamp: timestamp,
          fromAdmin: false,
          ...(mediaUrl && { mediaUrl }),
          ...(repliedToWaMessageId && { repliedToWaMessageId }),
          ...(Object.keys(rawPayload).length > 0 && { rawPayload }),
        });
      }
    }
  }
}
