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
/** Parameters for the approved-booking payment_request WhatsApp template */
export interface PaymentRequestTemplateParams {
    userName: string;
    academyName: string;
    bookingId: string;
    paymentUrl: string;
    /** Hours until payment link expires (e.g. "24") */
    numberOfHours: string;
    /** Dynamic part for the CTA button URL (e.g. payment token if URL is pay?token={{1}}) */
    buttonUrlParameter: string;
}
/**
 * Send approved-booking payment request via Meta WhatsApp template "payment_request".
 * Template: header (image), body (user_name, academy_name, booking_id, payment_url, number_hours), button (url with dynamic param).
 */
export declare function sendWhatsAppCloudPaymentRequestTemplate(to: string, params: PaymentRequestTemplateParams): Promise<{
    messageId: string;
}>;
/** Parameters for the payment_reminder WhatsApp template (Meta approved) */
export interface PaymentReminderTemplateParams {
    batchName: string;
    academyName: string;
    hoursLeft: string;
    bookingId: string;
    paymentLink: string;
    /** Dynamic part for the CTA button URL (e.g. payment token if URL is pay?token={{1}}) */
    buttonUrlParameter: string;
}
/**
 * Send payment reminder via Meta WhatsApp template "payment_reminder".
 * Body: batch_name, academy_name, hours_left, booking_id, payment_link. Button: URL with dynamic param.
 */
export declare function sendWhatsAppCloudPaymentReminderTemplate(to: string, params: PaymentReminderTemplateParams): Promise<{
    messageId: string;
}>;
/** Parameters for the booking_cancelled WhatsApp template (user; body only, no button) */
export interface BookingCancelledTemplateParams {
    batchName: string;
    academyName: string;
    bookingId: string;
    cancelReason: string;
}
/**
 * Send booking cancelled notification via Meta WhatsApp template "booking_cancelled".
 * Body only: batch_name, academy_name, booking_id, cancel_reason. No buttons.
 */
export declare function sendWhatsAppCloudBookingCancelledTemplate(to: string, params: BookingCancelledTemplateParams): Promise<{
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
        id?: string;
        caption?: string;
    };
    video?: {
        id?: string;
        caption?: string;
    };
    document?: {
        id?: string;
        caption?: string;
        filename?: string;
    };
    audio?: {
        id?: string;
    };
    reaction?: {
        message_id: string;
        emoji: string;
    };
    button?: {
        text: string;
        payload: string;
    };
    interactive?: {
        type: 'button_reply' | 'list_reply';
        button_reply?: {
            id: string;
            title: string;
        };
        list_reply?: {
            id: string;
            title: string;
            description?: string;
        };
    };
}
/** value.contacts[] item for profile name */
interface Contact {
    wa_id: string;
    profile?: {
        name?: string;
    };
}
/** value.statuses[] item for message/template delivery status */
interface MessageStatus {
    id: string;
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    recipient_id?: string;
    timestamp?: string;
}
/**
 * Process webhook payload: message status updates, incoming messages (text, media with URLs, reactions, button clicks), template tracking via statuses.
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
                statuses?: MessageStatus[];
            };
        }>;
    }>;
}): Promise<void>;
export {};
//# sourceMappingURL=metaWhatsApp.service.d.ts.map