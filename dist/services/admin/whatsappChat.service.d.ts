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
export declare function sendMessage(conversationId: string, text: string): Promise<MessageListItem>;
export declare function markConversationRead(conversationId: string): Promise<void>;
//# sourceMappingURL=whatsappChat.service.d.ts.map