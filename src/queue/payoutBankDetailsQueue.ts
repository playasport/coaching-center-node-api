import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

// Queue name for payout bank details updates
export const PAYOUT_BANK_DETAILS_QUEUE_NAME = 'payout-bank-details-update';

// Bank details update job data interface
export interface PayoutBankDetailsJobData {
  accountId: string; // Razorpay account ID
  productConfigId: string; // Razorpay product configuration ID
  bankDetails: {
    account_number: string;
    ifsc: string;
    beneficiary_name: string;
    beneficiary_email: string;
    beneficiary_mobile: string;
  };
  payoutAccountId: string; // Our database payout account ID
  timestamp?: number;
}

/**
 * Create the payout bank details update queue
 * This queue handles updating bank details in Razorpay product configuration
 */
export const payoutBankDetailsQueue = new Queue<PayoutBankDetailsJobData>(
  PAYOUT_BANK_DETAILS_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 5, // More attempts for external API calls
      backoff: {
        type: 'exponential',
        delay: 3000, // Start with 3 seconds delay (2s, 4s, 8s, 16s, 32s)
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep maximum 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  }
);

/**
 * Add bank details update job to queue (non-blocking)
 * The job will be processed by the payout bank details worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export const enqueuePayoutBankDetailsUpdate = async (
  data: PayoutBankDetailsJobData
): Promise<void> => {
  // Fire and forget - don't await, process in background
  payoutBankDetailsQueue
    .add('payout-bank-details-update', {
      accountId: data.accountId,
      productConfigId: data.productConfigId,
      bankDetails: data.bankDetails,
      payoutAccountId: data.payoutAccountId,
      timestamp: data.timestamp || Date.now(),
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      // Add delay to allow Razorpay to process product configuration first
      delay: 2000, // Wait 2 seconds before processing
    })
    .then((job) => {
      logger.info('Payout bank details update job added to queue (background)', {
        jobId: job.id,
        accountId: data.accountId,
        payoutAccountId: data.payoutAccountId,
        productConfigId: data.productConfigId,
      });
    })
    .catch((error) => {
      // Log error but don't throw - queue failures shouldn't break the main flow
      logger.error('Failed to enqueue payout bank details update job (non-blocking)', {
        accountId: data.accountId,
        payoutAccountId: data.payoutAccountId,
        productConfigId: data.productConfigId,
        error: error instanceof Error ? error.message : error,
      });
    });
};
