import { Schema, model, HydratedDocument } from 'mongoose';

export type WhatsAppTemplateName =
  | 'payment_request'
  | 'payment_reminder'
  | 'booking_cancelled'
  | 'user_payment_verified'
  | 'booking_rejected';

export type WhatsAppTemplateMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppTemplateMessage {
  /** Recipient phone (E.164 digits, no +) */
  phone: string;
  /** Template name sent */
  templateName: WhatsAppTemplateName;
  /** Meta WhatsApp message ID (wamid) for status updates from webhook */
  waMessageId: string;
  /** Delivery status updated by webhook */
  status: WhatsAppTemplateMessageStatus;
  /** Optional: bookingId, userId, etc. for admin reference */
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WhatsAppTemplateMessageDocument = HydratedDocument<WhatsAppTemplateMessage>;

const schema = new Schema<WhatsAppTemplateMessage>(
  {
    phone: { type: String, required: true, trim: true, index: true },
    templateName: {
      type: String,
      required: true,
      enum: ['payment_request', 'payment_reminder', 'booking_cancelled', 'user_payment_verified', 'booking_rejected'],
      index: true,
    },
    waMessageId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ templateName: 1, status: 1 });
schema.index({ phone: 1, createdAt: -1 });

export const WhatsAppTemplateMessageModel = model<WhatsAppTemplateMessage>(
  'WhatsAppTemplateMessage',
  schema
);
