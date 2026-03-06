import { Request, Response } from 'express';
/**
 * WhatsApp Cloud API webhook verification (GET)
 * Meta sends hub.mode=subscribe, hub.verify_token=YOUR_TOKEN, hub.challenge=RANDOM
 */
export declare const handleWhatsAppWebhookVerify: (req: Request, res: Response) => Promise<void>;
/**
 * WhatsApp Cloud API webhook (POST) - incoming messages
 */
export declare const handleWhatsAppWebhook: (req: Request, res: Response) => Promise<void>;
/**
 * Handle Razorpay webhook
 */
export declare const handleRazorpayWebhook: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=webhook.controller.d.ts.map