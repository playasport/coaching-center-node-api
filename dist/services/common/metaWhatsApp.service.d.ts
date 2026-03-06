/**
 * Verify webhook subscription (GET) - Meta sends hub.mode, hub.verify_token, hub.challenge
 * @param expectedToken - From Settings or env (getWhatsAppCloudConfig().webhookVerifyToken)
 */
export declare function verifyWhatsAppWebhook(mode: string, verifyToken: string, challenge: string, expectedToken: string): string | null;
/**
 * Verify X-Hub-Signature-256 (HMAC SHA256 of raw body with app secret)
 * @param appSecret - From Settings or env (getWhatsAppCloudConfig().appSecret)
 */
export declare function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader: string, appSecret: string): boolean;
/**
 * Send text message via Meta WhatsApp Cloud API (uses Settings then env)
 */
export declare function sendWhatsAppCloudText(to: string, text: string): Promise<{
    messageId: string;
}>;
/** Incoming message from webhook value.messages[] item */
interface IncomingMessage {
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: {
        body: string;
    };
    image?: {
        caption?: string;
    };
    video?: {
        caption?: string;
    };
    document?: {
        caption?: string;
    };
    audio?: object;
}
/** value.contacts[] item for profile name */
interface Contact {
    wa_id: string;
    profile?: {
        name?: string;
    };
}
/**
 * Process webhook payload: extract incoming messages, store in DB, upsert conversation
 */
export declare function processWhatsAppWebhookPayload(payload: {
    object?: string;
    entry?: Array<{
        id?: string;
        changes?: Array<{
            field?: string;
            value?: {
                messaging_product?: string;
                metadata?: {
                    phone_number_id?: string;
                    display_phone_number?: string;
                };
                contacts?: Contact[];
                messages?: IncomingMessage[];
                statuses?: Array<{
                    id: string;
                    status?: string;
                    recipient_id?: string;
                }>;
            };
        }>;
    }>;
}): Promise<void>;
export {};
//# sourceMappingURL=metaWhatsApp.service.d.ts.map