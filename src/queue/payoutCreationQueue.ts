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

// Queue name for payout creation
export const PAYOUT_CREATION_QUEUE_NAME = 'payout-creation';

export interface PayoutCreationJobData {
  bookingId: string;
  transactionId: string;
  academyUserId: string;
  amount: number;
  batchAmount: number;
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
  currency: string;
  timestamp?: number;
}

/**
 * Create the payout creation queue
 * This queue handles creating payout records when payment is verified
 */
export const payoutCreationQueue = new Queue<PayoutCreationJobData>(
  PAYOUT_CREATION_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  }
);

/**
 * Add payout creation job to queue (non-blocking)
 * The job will be processed by the payout creation worker in the background
 */
export const enqueuePayoutCreation = async (data: PayoutCreationJobData): Promise<void> => {
  try {
    await payoutCreationQueue.add(
      'payout-creation',
      {
        ...data,
        timestamp: Date.now(),
      },
      {
        jobId: `payout-${data.bookingId}`, // Unique job ID to prevent duplicates
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      }
    );

    logger.info('Payout creation job added to queue (background)', {
      bookingId: data.bookingId,
      transactionId: data.transactionId,
      payoutAmount: data.payoutAmount,
    });
  } catch (error: any) {
    // Log error but don't throw - queue failures shouldn't break the main flow
    logger.error('Failed to enqueue payout creation job (non-blocking)', {
      error: error.message || error,
      bookingId: data.bookingId,
    });
  }
};
