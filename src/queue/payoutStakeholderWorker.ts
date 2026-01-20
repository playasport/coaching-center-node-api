import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  PAYOUT_STAKEHOLDER_QUEUE_NAME,
  PayoutStakeholderJobData,
} from './payoutStakeholderQueue';
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
const PAYOUT_STAKEHOLDER_CONCURRENCY = Number(
  process.env.PAYOUT_STAKEHOLDER_CONCURRENCY || 2
);

/**
 * Create worker for processing payout stakeholder creation jobs
 * This worker creates stakeholders in Razorpay Linked Accounts
 */
export const payoutStakeholderWorker = new Worker<PayoutStakeholderJobData>(
  PAYOUT_STAKEHOLDER_QUEUE_NAME,
  async (job) => {
    try {
      logger.info('Received payout stakeholder creation job', {
        jobId: job.id,
        accountId: job.data.accountId,
        payoutAccountId: job.data.payoutAccountId,
        autoCreated: job.data.autoCreated,
      });

      const { accountId, stakeholderData, payoutAccountId } = job.data;

      // Validate required fields
      if (!accountId || !stakeholderData || !payoutAccountId) {
        const error = new Error('Missing required fields in job data');
        logger.error('Job data validation failed', {
          accountId,
          payoutAccountId,
          hasStakeholderData: !!stakeholderData,
          rawData: job.data,
        });
        throw error;
      }

      // Validate stakeholder data
      if (
        !stakeholderData.name ||
        !stakeholderData.email ||
        !stakeholderData.phone ||
        !stakeholderData.relationship ||
        !stakeholderData.kyc?.pan
      ) {
        const error = new Error('Missing required stakeholder details');
        logger.error('Stakeholder data validation failed', {
          accountId,
          payoutAccountId,
          stakeholderData: {
            hasName: !!stakeholderData.name,
            hasEmail: !!stakeholderData.email,
            hasPhone: !!stakeholderData.phone,
            hasRelationship: !!stakeholderData.relationship,
            hasPan: !!stakeholderData.kyc?.pan,
          },
        });
        throw error;
      }

      logger.info('Starting payout stakeholder creation job', {
        accountId,
        payoutAccountId,
        relationship: stakeholderData.relationship,
        autoCreated: job.data.autoCreated,
      });

      // Create stakeholder in Razorpay
      const stakeholder = await razorpayRouteService.createStakeholder(
        accountId,
        stakeholderData
      );

      // Update database to store stakeholder ID
      const updatedAccount = await AcademyPayoutAccountModel.findOneAndUpdate(
        { id: payoutAccountId },
        {
          $set: {
            stakeholder_id: stakeholder.id,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!updatedAccount) {
        logger.error('Payout account not found after stakeholder creation - stakeholder ID not saved', {
          payoutAccountId,
          accountId,
          stakeholderId: stakeholder.id,
        });
        throw new Error(`Payout account with ID ${payoutAccountId} not found. Stakeholder ID ${stakeholder.id} was created but not saved to database.`);
      }

      // Verify that stakeholder_id was actually updated
      if (updatedAccount.stakeholder_id !== stakeholder.id) {
        logger.error('Stakeholder ID mismatch after database update', {
          payoutAccountId,
          accountId,
          expectedStakeholderId: stakeholder.id,
          actualStakeholderId: updatedAccount.stakeholder_id,
        });
        throw new Error(`Stakeholder ID mismatch. Expected ${stakeholder.id} but got ${updatedAccount.stakeholder_id}`);
      }

      logger.info('Payout stakeholder creation job completed successfully - stakeholder ID updated in database', {
        jobId: job.id,
        accountId,
        payoutAccountId,
        stakeholderId: stakeholder.id,
        relationship: stakeholderData.relationship,
        autoCreated: job.data.autoCreated,
        databaseUpdated: true,
      });

      return {
        success: true,
        accountId,
        payoutAccountId,
        stakeholderId: stakeholder.id,
      };
    } catch (error) {
      logger.error('Payout stakeholder creation job failed', {
        jobId: job.id,
        accountId: job.data.accountId,
        payoutAccountId: job.data.payoutAccountId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    concurrency: PAYOUT_STAKEHOLDER_CONCURRENCY,
    connection,
  }
);

// Worker event handlers
payoutStakeholderWorker.on('error', (error) => {
  logger.error('Payout stakeholder worker error', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });
});

payoutStakeholderWorker.on('failed', async (job, error) => {
  logger.error('Payout stakeholder job failed permanently', {
    jobId: job?.id,
    accountId: job?.data?.accountId,
    payoutAccountId: job?.data?.payoutAccountId,
    attempts: job?.attemptsMade,
    error: error instanceof Error ? error.message : error,
  });

  // Note: We don't update the database on failure because stakeholder_id should remain null
  // The account can still function without a stakeholder, though activation might be delayed
});

payoutStakeholderWorker.on('completed', (job) => {
  logger.info('Payout stakeholder job completed', {
    jobId: job.id,
    accountId: job.data.accountId,
    payoutAccountId: job.data.payoutAccountId,
  });
});

payoutStakeholderWorker.on('stalled', (jobId) => {
  logger.warn('Payout stakeholder job stalled', { jobId });
});

payoutStakeholderWorker.on('ready', () => {
  logger.info('Payout stakeholder worker ready', {
    concurrency: PAYOUT_STAKEHOLDER_CONCURRENCY,
    queueName: PAYOUT_STAKEHOLDER_QUEUE_NAME,
  });
});

payoutStakeholderWorker.on('closed', () => {
  logger.info('Payout stakeholder worker closed');
});

/**
 * Close the payout stakeholder worker gracefully
 */
export const closePayoutStakeholderWorker = async (): Promise<void> => {
  try {
    await payoutStakeholderWorker.close();
    logger.info('Payout stakeholder worker closed successfully');
  } catch (error) {
    logger.error('Error closing payout stakeholder worker', {
      error: error instanceof Error ? error.message : error,
    });
  }
};
