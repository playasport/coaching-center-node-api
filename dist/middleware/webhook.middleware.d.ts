import { Request, Response, NextFunction } from 'express';
/**
 * Verify Razorpay webhook signature using the raw request body
 * and the webhook secret (configured in Razorpay Dashboard).
 *
 * Raw body is captured by express.json()'s `verify` callback in app.ts.
 */
export declare const verifyWebhookSignature: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=webhook.middleware.d.ts.map