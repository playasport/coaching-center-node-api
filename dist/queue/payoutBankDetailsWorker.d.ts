import { Worker } from 'bullmq';
import { PayoutBankDetailsJobData } from './payoutBankDetailsQueue';
/**
 * Create worker for processing payout bank details update jobs
 * This worker updates bank details in Razorpay product configuration
 */
export declare const payoutBankDetailsWorker: Worker<PayoutBankDetailsJobData, any, string>;
/**
 * Close the payout bank details worker gracefully
 */
export declare const closePayoutBankDetailsWorker: () => Promise<void>;
//# sourceMappingURL=payoutBankDetailsWorker.d.ts.map