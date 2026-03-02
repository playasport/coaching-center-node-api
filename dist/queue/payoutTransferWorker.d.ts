import { Worker } from 'bullmq';
import { PayoutTransferJobData } from './payoutTransferQueue';
/**
 * Create worker for processing payout transfer jobs
 * This worker creates transfers in Razorpay for academy payouts
 */
export declare const payoutTransferWorker: Worker<PayoutTransferJobData, any, string>;
/**
 * Close the payout transfer worker gracefully
 */
export declare const closePayoutTransferWorker: () => Promise<void>;
//# sourceMappingURL=payoutTransferWorker.d.ts.map