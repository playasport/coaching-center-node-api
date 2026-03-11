export interface SendWhatsAppOptions {
    to: string;
    body: string;
}
/**
 * Send WhatsApp message via Meta Cloud API only (config from Settings or env).
 * Strips optional "whatsapp:" prefix from recipient.
 */
export declare const sendWhatsApp: (options: SendWhatsAppOptions) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
}>;
//# sourceMappingURL=whatsapp.d.ts.map