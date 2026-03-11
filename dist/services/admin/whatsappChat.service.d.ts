export interface ListConversationsParams {
    page?: number;
    limit?: number;
    search?: string;
}
export interface ConversationListItem {
    id: string;
    phone: string;
    displayName: string | null;
    lastMessageAt: Date;
    lastMessagePreview: string | null;
    lastMessageFromUs: boolean | null;
    unreadCount: number;
    createdAt: Date;
}
export interface ListMessagesParams {
    page?: number;
    limit?: number;
}
export interface MessageListItem {
    id: string;
    direction: 'in' | 'out';
    type: string;
    content: string;
    waMessageId: string;
    waTimestamp: number;
    status: string | null;
    fromAdmin: boolean;
    createdAt: Date;
    /** Media URL for image/video/document/audio (may expire ~5 min from Meta) */
    mediaUrl?: string | null;
    /** For reactions: the message ID this reaction refers to */
    repliedToWaMessageId?: string | null;
}
export declare function listConversations(params?: ListConversationsParams): Promise<{
    data: ConversationListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
    };
}>;
export declare function getConversationMessages(conversationId: string, params?: ListMessagesParams): Promise<{
    data: MessageListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
    };
}>;
export type SendMessagePayload = {
    type?: 'text';
    text: string;
} | {
    type: 'image';
    imageUrl: string;
    caption?: string;
};
export declare function sendMessage(conversationId: string, payload: SendMessagePayload): Promise<MessageListItem>;
export declare function markConversationRead(conversationId: string): Promise<void>;
export interface ListTemplateMessagesParams {
    page?: number;
    limit?: number;
    templateName?: 'payment_request' | 'payment_reminder' | 'booking_cancelled';
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    phone?: string;
    dateFrom?: Date;
    dateTo?: Date;
}
export interface TemplateMessageListItem {
    id: string;
    phone: string;
    templateName: string;
    waMessageId: string;
    status: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}
export declare function listTemplateMessages(params?: ListTemplateMessagesParams): Promise<{
    data: TemplateMessageListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
    };
}>;
//# sourceMappingURL=whatsappChat.service.d.ts.map