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
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
  ...config.redis.connection,
});

// Queue name for payout transfer processing
export const PAYOUT_TRANSFER_QUEUE_NAME = 'payout-transfer';

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
export const payoutTransferQueue = new Queue<PayoutTransferJobData>(
  PAYOUT_TRANSFER_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  }
);

/**
 * Add payout transfer job to queue (non-blocking)
 * The job will be processed by the payout transfer worker in the background
 */
export const enqueuePayoutTransfer = async (data: PayoutTransferJobData): Promise<void> => {
  try {
    await payoutTransferQueue.add(
      'payout-transfer',
      {
        ...data,
        timestamp: Date.now(),
      },
      {
        jobId: `transfer-${data.payoutId}`, // Unique job ID to prevent duplicates
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      }
    );

    logger.info('Payout transfer job added to queue (background)', {
      payoutId: data.payoutId,
      accountId: data.accountId,
      amount: data.amount,
    });
  } catch (error: any) {
    // Log error but don't throw - queue failures shouldn't break the main flow
    logger.error('Failed to enqueue payout transfer job (non-blocking)', {
      error: error.message || error,
      payoutId: data.payoutId,
    });
  }
};
