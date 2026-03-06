import { HydratedDocument, Types } from 'mongoose';
export type WhatsAppMessageDirection = 'in' | 'out';
export type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'unknown';
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
    /** Raw payload snippet for debugging (optional) */
    rawPayload?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
export type WhatsAppMessageDocument = HydratedDocument<WhatsAppMessage>;
export declare const WhatsAppMessageModel: import("mongoose").Model<WhatsAppMessage, {}, {}, {}, import("mongoose").Document<unknown, {}, WhatsAppMessage, {}, {}> & WhatsAppMessage & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=whatsappMessage.model.d.ts.map