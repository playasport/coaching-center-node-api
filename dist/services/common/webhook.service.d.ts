export interface RazorpayWebhookPayload {
    entity: string;
    account_id: string;
    event: string;
    contains: string[];
    payload: {
        payment?: {
            entity: {
                id: string;
                entity: string;
                amount: number;
                currency: string;
                status: string;
                order_id: string;
                invoice_id: string | null;
                international: boolean;
                method: string;
                amount_refunded: number;
                refund_status: string | null;
                captured: boolean;
                description: string | null;
                card_id: string | null;
                bank: string | null;
                wallet: string | null;
                vpa: string | null;
                email: string;
                contact: string;
                notes: Record<string, any>;
                fee: number | null;
                tax: number | null;
                error_code: string | null;
                error_description: string | null;
                error_source: string | null;
                error_step: string | null;
                error_reason: string | null;
                acquirer_data: Record<string, any>;
                created_at: number;
            };
        };
        order?: {
            entity: {
                id: string;
                entity: string;
                amount: number;
                amount_paid: number;
                amount_due: number;
                currency: string;
                receipt: string;
                offer_id: string | null;
                status: string;
                attempts: number;
                notes: Record<string, any>;
                created_at: number;
            };
        };
        transfer?: {
            entity: {
                id: string;
                entity: string;
                amount: number;
                currency: string;
                status: string;
                account: string;
                notes: Record<string, any>;
                failure_reason?: string | null;
                created_at: number;
            };
        };
        refund?: {
            entity: {
                id: string;
                entity: string;
                amount: number;
                currency: string;
                payment_id: string;
                status: string;
                notes: Record<string, any>;
                failure_reason?: string | null;
                created_at: number;
            };
        };
    };
    created_at: number;
}
/**
 * Handle Razorpay webhook events
 */
export declare const handleWebhook: (payload: RazorpayWebhookPayload) => Promise<void>;
//# sourceMappingURL=webhook.service.d.ts.map