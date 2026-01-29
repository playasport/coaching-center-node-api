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

// Queue name for payout stakeholder creation
export const PAYOUT_STAKEHOLDER_QUEUE_NAME = 'payout-stakeholder-create';

// Stakeholder creation job data interface
export interface PayoutStakeholderJobData {
  accountId: string; // Razorpay account ID
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
  payoutAccountId: string; // Our database payout account ID
  autoCreated: boolean; // Whether stakeholder is auto-created or explicitly provided
  timestamp?: number;
}

/**
 * Create the payout stakeholder creation queue
 * This queue handles creating stakeholders in Razorpay Linked Accounts
 */
export const payoutStakeholderQueue = new Queue<PayoutStakeholderJobData>(
  PAYOUT_STAKEHOLDER_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 5, // More attempts for external API calls
      backoff: {
        type: 'exponential',
        delay: 3000, // Start with 3 seconds delay (3s, 6s, 12s, 24s, 48s)
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
 * Add stakeholder creation job to queue (non-blocking)
 * The job will be processed by the payout stakeholder worker in the background
 * This function is fire-and-forget - it doesn't block the main request
 */
export const enqueuePayoutStakeholderCreate = async (
  data: PayoutStakeholderJobData
): Promise<void> => {
  // Fire and forget - don't await, process in background
  payoutStakeholderQueue
    .add('payout-stakeholder-create', {
      accountId: data.accountId,
      stakeholderData: data.stakeholderData,
      payoutAccountId: data.payoutAccountId,
      autoCreated: data.autoCreated,
      timestamp: data.timestamp || Date.now(),
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      // Add delay to allow Razorpay to process account creation first
      delay: 1000, // Wait 1 second before processing
    })
    .then((job) => {
      logger.info('Payout stakeholder creation job added to queue (background)', {
        jobId: job.id,
        accountId: data.accountId,
        payoutAccountId: data.payoutAccountId,
        autoCreated: data.autoCreated,
      });
    })
    .catch((error) => {
      // Log error but don't throw - queue failures shouldn't break the main flow
      logger.error('Failed to enqueue payout stakeholder creation job (non-blocking)', {
        accountId: data.accountId,
        payoutAccountId: data.payoutAccountId,
        error: error instanceof Error ? error.message : error,
      });
    });
};
