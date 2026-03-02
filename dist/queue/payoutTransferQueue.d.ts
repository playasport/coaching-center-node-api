import { Queue } from 'bullmq';
export declare const PAYOUT_TRANSFER_QUEUE_NAME = "payout-transfer";
export interface PayoutTransferJobData {
    payoutId: string;
    accountId: string;
    amount: number;
    currency: string;
    notes?: Record<string, any>;
    adminUserId?: string;
    timestamp?: number;
}
/**
 * Create the payout transfer queue
 * This queue handles processing transfers to academy Razorpay accounts
 */
export declare const payoutTransferQueue: Queue<PayoutTransferJobData, any, string, PayoutTransferJobData, any, string>;
/**
 * Add payout transfer job to queue (non-blocking)
 * The job will be processed by the payout transfer worker in the background
 */
export declare const enqueuePayoutTransfer: (data: PayoutTransferJobData) => Promise<void>;
//# sourceMappingURL=payoutTransferQueue.d.ts.map