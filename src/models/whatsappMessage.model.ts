import { Schema, model, HydratedDocument, Types } from 'mongoose';

export type WhatsAppMessageDirection = 'in' | 'out';

export type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'reaction' | 'interactive' | 'unknown';

export interface WhatsAppMessage {
  conversation: Types.ObjectId;
  direction: WhatsAppMessageDirection;
  type: WhatsAppMessageType;
  /** Text body (for text messages; or caption for media) */
  content: string;
  /** WhatsApp message ID (wamid) for dedup and status updates */
  waMessageId: string;
  /** WhatsApp timestamp (Unix seconds) */
  waTimestamp: number;
  /** Status for outbound: sent, delivered, read, failed */
  status?: string | null;
  /** Media URL if type is image/audio/video/document (we may store URL from Meta) */
  mediaUrl?: string | null;
  /** True if sent from admin panel (our app) */
  fromAdmin: boolean;
  /** For reactions: the waMessageId this reaction refers to */
  repliedToWaMessageId?: string | null;
  /** Raw payload snippet for debugging (optional) */
  rawPayload?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WhatsAppMessageDocument = HydratedDocument<WhatsAppMessage>;

const schema = new Schema<WhatsAppMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppConversation',
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['in', 'out'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video', 'document', 'reaction', 'interactive', 'unknown'],
      default: 'text',
    },
    content: { type: String, default: '', trim: true },
    waMessageId: { type: String, required: true, index: true },
    waTimestamp: { type: Number, required: true },
    status: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    repliedToWaMessageId: { type: String, default: null },
    fromAdmin: { type: Boolean, default: false },
    rawPayload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

schema.index({ conversation: 1, createdAt: -1 });
schema.index({ conversation: 1, waMessageId: 1 }, { unique: true });

export const WhatsAppMessageModel = model<WhatsAppMessage>('WhatsAppMessage', schema);
