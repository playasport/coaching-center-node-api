import { Schema, model, HydratedDocument } from 'mongoose';

export interface WhatsAppConversation {
  /** E.164 phone number (e.g. 919876543210) - no + prefix in DB for consistency */
  phone: string;
  /** Display name from WhatsApp profile (optional) */
  displayName?: string | null;
  /** Last activity timestamp for sorting */
  lastMessageAt: Date;
  /** Preview of last message (plain text) */
  lastMessagePreview?: string | null;
  /** Whether last message was from us (admin) */
  lastMessageFromUs?: boolean | null;
  /** Unread count (incoming messages not seen by admin) */
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WhatsAppConversationDocument = HydratedDocument<WhatsAppConversation>;

const schema = new Schema<WhatsAppConversation>(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    displayName: { type: String, default: null, trim: true },
    lastMessageAt: { type: Date, required: true, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: null, trim: true },
    lastMessageFromUs: { type: Boolean, default: null },
    unreadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

schema.index({ lastMessageAt: -1 });

export const WhatsAppConversationModel = model<WhatsAppConversation>('WhatsAppConversation', schema);
