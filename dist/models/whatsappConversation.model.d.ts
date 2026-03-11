import { HydratedDocument } from 'mongoose';
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
export declare const WhatsAppConversationModel: import("mongoose").Model<WhatsAppConversation, {}, {}, {}, import("mongoose").Document<unknown, {}, WhatsAppConversation, {}, {}> & WhatsAppConversation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=whatsappConversation.model.d.ts.map