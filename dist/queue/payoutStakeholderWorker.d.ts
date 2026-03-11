import { Worker } from 'bullmq';
import { PayoutStakeholderJobData } from './payoutStakeholderQueue';
/**
 * Create worker for processing payout stakeholder creation jobs
 * This worker creates stakeholders in Razorpay Linked Accounts
 */
export declare const payoutStakeholderWorker: Worker<PayoutStakeholderJobData, any, string>;
/**
 * Close the payout stakeholder worker gracefully
 */
export declare const closePayoutStakeholderWorker: () => Promise<void>;
//# sourceMappingURL=payoutStakeholderWorker.d.ts.map