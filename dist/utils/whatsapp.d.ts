export interface SendWhatsAppOptions {
    to: string;
    body: string;
}
export declare const sendWhatsApp: (options: SendWhatsAppOptions) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
}>;
//# sourceMappingURL=whatsapp.d.ts.map