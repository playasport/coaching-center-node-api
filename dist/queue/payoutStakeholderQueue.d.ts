import { Queue } from 'bullmq';
export declare const PAYOUT_STAKEHOLDER_QUEUE_NAME = "payout-stakeholder-create";
export interface PayoutStakeholderJobData {
    accountId: string;
    stakeholderData: {
        name: string;
        email: string;
        phone: string;
        relationship: 'director' | 'proprietor' | 'partner' | 'authorised_signatory';
        kyc: {
            pan: string;
            aadhaar?: string;
        };
        address?: {
            street?: string;
            city?: string;
            state?: string;
            postal_code?: string;
            country?: string;
        };
    };
    payoutAccountId: string;
    autoCreated: boolean;
    timestamp?: number;
}
/**
 * Create the payout stakeholder creation queue
 * This queue handles creating stakeholders in Razorpay Linked Accounts
 */
export declare const payoutStakeholderQueue: Queue<PayoutStakeholderJobData, any, string, PayoutStakeholderJobData, any, string>;
/**
 * Add stakeholder creation job to queue (non-blocking)
 * The job will be processed by the payout stakeholder worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export declare const enqueuePayoutStakeholderCreate: (data: PayoutStakeholderJobData) => Promise<void>;
//# sourceMappingURL=payoutStakeholderQueue.d.ts.map