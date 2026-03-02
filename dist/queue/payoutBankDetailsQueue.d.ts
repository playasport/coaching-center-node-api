import { Queue } from 'bullmq';
export declare const PAYOUT_BANK_DETAILS_QUEUE_NAME = "payout-bank-details-update";
export interface PayoutBankDetailsJobData {
    accountId: string;
    productConfigId: string;
    bankDetails: {
        account_number: string;
        ifsc: string;
        beneficiary_name: string;
        beneficiary_email: string;
        beneficiary_mobile: string;
    };
    payoutAccountId: string;
    timestamp?: number;
}
/**
 * Create the payout bank details update queue
 * This queue handles updating bank details in Razorpay product configuration
 */
export declare const payoutBankDetailsQueue: Queue<PayoutBankDetailsJobData, any, string, PayoutBankDetailsJobData, any, string>;
/**
 * Add bank details update job to queue (non-blocking)
 * The job will be processed by the payout bank details worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export declare const enqueuePayoutBankDetailsUpdate: (data: PayoutBankDetailsJobData) => Promise<void>;
//# sourceMappingURL=payoutBankDetailsQueue.d.ts.map