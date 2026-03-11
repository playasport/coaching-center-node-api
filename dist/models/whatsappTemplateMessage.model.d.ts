import { HydratedDocument } from 'mongoose';
export type WhatsAppTemplateName = 'payment_request' | 'payment_reminder' | 'booking_cancelled';
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
export declare const WhatsAppTemplateMessageModel: import("mongoose").Model<WhatsAppTemplateMessage, {}, {}, {}, import("mongoose").Document<unknown, {}, WhatsAppTemplateMessage, {}, {}> & WhatsAppTemplateMessage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=whatsappTemplateMessage.model.d.ts.map