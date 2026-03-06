import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { getWhatsAppCloudConfig } from './settings.service';
import { WhatsAppConversationModel } from '../../models/whatsappConversation.model';
import { WhatsAppMessageModel } from '../../models/whatsappMessage.model';
import type { WhatsAppMessageType } from '../../models/whatsappMessage.model';

const GRAPH_BASE = 'https://graph.facebook.com';

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
