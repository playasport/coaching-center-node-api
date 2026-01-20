import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  PAYOUT_BANK_DETAILS_QUEUE_NAME,
  PayoutBankDetailsJobData,
} from './payoutBankDetailsQueue';
import { razorpayRouteService } from '../services/common/payment/razorpayRoute.service';
import { AcademyPayoutAccountModel } from '../models/academyPayoutAccount.model';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  ...config.redis.connection,
});

// Get concurrency from environment variable (default: 2)
const PAYOUT_BANK_DETAILS_CONCURRENCY = Number(
  process.env.PAYOUT_BANK_DETAILS_CONCURRENCY || 2
);

/**
 * Create worker for processing payout bank details update jobs
 * This worker updates bank details in Razorpay product configuration
 */
export const payoutBankDetailsWorker = new Worker<PayoutBankDetailsJobData>(
  PAYOUT_BANK_DETAILS_QUEUE_NAME,
  async (job) => {
    try {
      logger.info('Received payout bank details update job', {
        jobId: job.id,
        accountId: job.data.accountId,
        payoutAccountId: job.data.payoutAccountId,
        productConfigId: job.data.productConfigId,
      });

      const { accountId, productConfigId, bankDetails, payoutAccountId } = job.data;

      // Validate required fields
      if (!accountId || !productConfigId || !bankDetails || !payoutAccountId) {
        const error = new Error('Missing required fields in job data');
        logger.error('Job data validation failed', {
          accountId,
          productConfigId,
          payoutAccountId,
          hasBankDetails: !!bankDetails,
          rawData: job.data,
        });
        throw error;
      }

      // Validate bank details
      if (
        !bankDetails.account_number ||
        !bankDetails.ifsc ||
        !bankDetails.beneficiary_name
      ) {
        const error = new Error('Missing required bank details');
        logger.error('Bank details validation failed', {
          accountId,
          payoutAccountId,
          bankDetails,
        });
        throw error;
      }

      logger.info('Starting payout bank details update job', {
        accountId,
        payoutAccountId,
        productConfigId,
      });

      // Update bank details in Razorpay product configuration
      // This will automatically submit the activation form
      await razorpayRouteService.updateBankDetails(accountId, productConfigId, bankDetails);

      // Update database to reflect that bank details have been submitted
      const updatedAccount = await AcademyPayoutAccountModel.findOneAndUpdate(
        { id: payoutAccountId },
        {
          $set: {
            bank_details_status: 'submitted' as const,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedAccount) {
        logger.warn('Payout account not found after bank details update', {
          payoutAccountId,
          accountId,
        });
      }

      logger.info('Payout bank details update job completed successfully', {
        jobId: job.id,
        accountId,
        payoutAccountId,
        productConfigId,
      });

      return {
        success: true,
        accountId,
        payoutAccountId,
        productConfigId,
      };
    } catch (error) {
      logger.error('Payout bank details update job failed', {
        jobId: job.id,
        accountId: job.data.accountId,
        payoutAccountId: job.data.payoutAccountId,
        productConfigId: job.data.productConfigId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    concurrency: PAYOUT_BANK_DETAILS_CONCURRENCY,
    connection,
  }
);

// Worker event handlers
payoutBankDetailsWorker.on('error', (error) => {
  logger.error('Payout bank details worker error', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });
});

payoutBankDetailsWorker.on('failed', async (job, error) => {
  logger.error('Payout bank details job failed permanently', {
    jobId: job?.id,
    accountId: job?.data?.accountId,
    payoutAccountId: job?.data?.payoutAccountId,
    attempts: job?.attemptsMade,
    error: error instanceof Error ? error.message : error,
  });

  // Update database to reflect failure (optional - you might want to keep it as pending)
  if (job?.data?.payoutAccountId) {
    try {
      await AcademyPayoutAccountModel.findOneAndUpdate(
        { id: job.data.payoutAccountId },
        {
          $set: {
            bank_details_status: 'pending' as const,
            updatedAt: new Date(),
          },
        }
      );
      logger.info('Updated payout account bank details status to pending after job failure', {
        payoutAccountId: job.data.payoutAccountId,
      });
    } catch (updateError) {
      logger.error('Failed to update payout account status after job failure', {
        payoutAccountId: job.data.payoutAccountId,
        error: updateError instanceof Error ? updateError.message : updateError,
      });
    }
  }
});

payoutBankDetailsWorker.on('completed', (job) => {
  logger.info('Payout bank details job completed', {
    jobId: job.id,
    accountId: job.data.accountId,
    payoutAccountId: job.data.payoutAccountId,
  });
});

payoutBankDetailsWorker.on('stalled', (jobId) => {
  logger.warn('Payout bank details job stalled', { jobId });
});

payoutBankDetailsWorker.on('ready', () => {
  logger.info('Payout bank details worker ready', {
    concurrency: PAYOUT_BANK_DETAILS_CONCURRENCY,
    queueName: PAYOUT_BANK_DETAILS_QUEUE_NAME,
  });
});

payoutBankDetailsWorker.on('closed', () => {
  logger.info('Payout bank details worker closed');
});

/**
 * Close the payout bank details worker gracefully
 */
export const closePayoutBankDetailsWorker = async (): Promise<void> => {
  try {
    await payoutBankDetailsWorker.close();
    logger.info('Payout bank details worker closed successfully');
  } catch (error) {
    logger.error('Error closing payout bank details worker', {
      error: error instanceof Error ? error.message : error,
    });
  }
};
