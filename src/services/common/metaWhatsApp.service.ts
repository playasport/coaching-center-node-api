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
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string };
  audio?: object;
}

/** value.contacts[] item for profile name */
interface Contact {
  wa_id: string;
  profile?: { name?: string };
}

/**
 * Process webhook payload: extract incoming messages, store in DB, upsert conversation
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
        statuses?: Array<{ id: string; status?: string; recipient_id?: string }>;
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

      const messages = value.messages;
      const contacts = value.contacts || [];

      if (!Array.isArray(messages)) continue;

      const contactMap = new Map<string, string>();
      for (const c of contacts) {
        if (c.wa_id && c.profile?.name) contactMap.set(normalizePhone(c.wa_id), c.profile.name);
      }

      for (const msg of messages) {
        const from = normalizePhone(String(msg.from || ''));
        if (!from || !msg.id) continue;

        const existing = await WhatsAppMessageModel.findOne({ waMessageId: msg.id }).lean();
        if (existing) continue;

        let content = '';
        let type: WhatsAppMessageType = 'unknown';
        if (msg.type === 'text' && msg.text?.body) {
          content = msg.text.body;
          type = 'text';
        } else if (msg.type === 'image' && msg.image) {
          content = msg.image.caption || '[Image]';
          type = 'image';
        } else if (msg.type === 'video' && msg.video) {
          content = msg.video.caption || '[Video]';
          type = 'video';
        } else if (msg.type === 'document' && msg.document) {
          content = msg.document.caption || '[Document]';
          type = 'document';
        } else if (msg.type === 'audio') {
          content = '[Audio]';
          type = 'audio';
        } else {
          content = `[${msg.type || 'unknown'}]`;
        }

        const timestamp = parseInt(String(msg.timestamp), 10) || Math.floor(Date.now() / 1000);

        let conversation = await WhatsAppConversationModel.findOne({ phone: from }).lean();
        if (!conversation) {
          const created = await WhatsAppConversationModel.create({
            phone: from,
            displayName: contactMap.get(from) || null,
            lastMessageAt: new Date(timestamp * 1000),
            lastMessagePreview: content.slice(0, 100),
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
                lastMessagePreview: content.slice(0, 100),
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
        });
      }
    }
  }
}
