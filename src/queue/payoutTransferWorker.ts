import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { PAYOUT_TRANSFER_QUEUE_NAME, PayoutTransferJobData } from './payoutTransferQueue';
import { PayoutModel, PayoutStatus } from '../models/payout.model';
import { razorpayRouteService } from '../services/common/payment/razorpayRoute.service';
import { createAuditTrail } from '../services/common/auditTrail.service';
import { ActionType, ActionScale } from '../models/auditTrail.model';
import { createAndSendNotification } from '../services/common/notification.service';
import { UserModel } from '../models/user.model';
import {
  getPayoutTransferInitiatedAcademySms,
  getPayoutTransferInitiatedAcademyWhatsApp,
  getPayoutTransferInitiatedAcademyPush,
} from '../services/common/notificationMessages';
import { queueSms, queueWhatsApp } from '../services/common/notificationQueue.service';

// Redis connection for BullMQ
const connection = new Redis({
  ...config.redis.connection,
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db.bullmq,
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations - must be after spread
});

const PAYOUT_TRANSFER_CONCURRENCY = Number(process.env.PAYOUT_TRANSFER_CONCURRENCY || 2);

/**
 * Create worker for processing payout transfer jobs
 * This worker creates transfers in Razorpay for academy payouts
 */
export const payoutTransferWorker = new Worker<PayoutTransferJobData>(
  PAYOUT_TRANSFER_QUEUE_NAME,
  async (job) => {
    const { payoutId, accountId, amount, currency, notes, adminUserId } = job.data;

    logger.info('Received payout transfer job', {
      jobId: job.id,
      payoutId,
      accountId,
      amount,
    });

    try {
      // Validate data
      if (!payoutId || !accountId || !amount || amount <= 0) {
        throw new Error('Invalid transfer data: payoutId, accountId, and amount are required');
      }

      // Find payout
      const payout = await PayoutModel.findOne({ id: payoutId });
      if (!payout) {
        throw new Error(`Payout not found: ${payoutId}`);
      }

      // Check if payout is already processed
      if (payout.status === PayoutStatus.COMPLETED) {
        logger.warn('Payout already completed', {
          payoutId,
          transferId: payout.razorpay_transfer_id,
        });
        return {
          skipped: true,
          reason: 'Payout already completed',
          transferId: payout.razorpay_transfer_id,
        };
      }

      // Check if payout is in valid state for transfer
      if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.FAILED) {
        throw new Error(`Payout is in ${payout.status} status, cannot initiate transfer`);
      }

      // Update payout status to processing
      payout.status = PayoutStatus.PROCESSING;
      await payout.save();

      // Create transfer in Razorpay
      const transfer = await razorpayRouteService.createTransfer(
        accountId,
        amount,
        currency,
        notes || {
          payout_id: payoutId,
          booking_id: payout.booking.toString(),
          transaction_id: payout.transaction.toString(),
        }
      );

      // Update payout with transfer ID
      payout.razorpay_transfer_id = transfer.id;
      payout.status = PayoutStatus.PROCESSING; // Will be updated to completed by webhook
      await payout.save();

      // Create audit trail
      const adminUserObjectId = adminUserId
        ? await UserModel.findOne({ id: adminUserId }).select('_id').lean()
        : null;

      await createAuditTrail(
        ActionType.PAYOUT_TRANSFER_INITIATED,
        ActionScale.CRITICAL,
        `Transfer initiated for payout ${payoutId}`,
        'Payout',
        payout._id,
        {
          userId: adminUserObjectId?._id || null,
          metadata: {
            payout_id: payoutId,
            transfer_id: transfer.id,
            amount,
            account_id: accountId,
          },
        }
      ).catch((error) => {
        logger.error('Failed to create audit trail for transfer initiation', {
          error,
          payoutId,
        });
      });

      // Get academy user for notification
      const academyUser = await UserModel.findById(payout.academy_user).lean();
      if (academyUser) {
        // Push notification
        const pushNotification = getPayoutTransferInitiatedAcademyPush({
          amount: amount.toFixed(2),
          transferId: transfer.id,
        });
        createAndSendNotification({
          recipientType: 'academy',
          recipientId: academyUser.id,
          title: pushNotification.title,
          body: pushNotification.body,
          channels: ['push'],
          priority: 'high',
          data: {
            type: 'payout_transfer_initiated',
            payoutId: payout.id,
            transferId: transfer.id,
            amount,
          },
        }).catch((error) => {
          logger.error('Failed to send push notification for transfer initiation', {
            error,
            payoutId,
          });
        });

        // SMS notification
        if (academyUser.mobile) {
          try {
            const smsMessage = getPayoutTransferInitiatedAcademySms({
              amount: amount.toFixed(2),
              transferId: transfer.id,
            });
            queueSms(academyUser.mobile, smsMessage, 'high', {
              type: 'payout_transfer_initiated',
              payoutId: payout.id,
              recipient: 'academy',
            });
          } catch (error: unknown) {
            logger.error('Failed to queue SMS for transfer initiation', { error, payoutId });
          }
        }

        // WhatsApp notification
        if (academyUser.mobile) {
          try {
            const whatsappMessage = getPayoutTransferInitiatedAcademyWhatsApp({
              amount: amount.toFixed(2),
              transferId: transfer.id,
            });
            queueWhatsApp(academyUser.mobile, whatsappMessage, 'high', {
              type: 'payout_transfer_initiated',
              payoutId: payout.id,
              recipient: 'academy',
            });
          } catch (error: unknown) {
            logger.error('Failed to queue WhatsApp for transfer initiation', { error, payoutId });
          }
        }
      }

      logger.info('Payout transfer job completed successfully', {
        jobId: job.id,
        payoutId,
        transferId: transfer.id,
        amount,
      });

      return {
        success: true,
        transferId: transfer.id,
        status: transfer.status,
      };
    } catch (error: any) {
      logger.error('Payout transfer job failed', {
        jobId: job.id,
        payoutId,
        error: error.message || error,
        stack: error.stack,
      });

      // Update payout status to failed
      try {
        const payout = await PayoutModel.findOne({ id: payoutId });
        if (payout) {
          payout.status = PayoutStatus.FAILED;
          payout.failure_reason = error.message || 'Transfer failed';
          await payout.save();

          // Create audit trail for failure
          await createAuditTrail(
            ActionType.PAYOUT_TRANSFER_FAILED,
            ActionScale.HIGH,
            `Transfer failed for payout ${payoutId}: ${error.message}`,
            'Payout',
            payout._id,
            {
              metadata: {
                payout_id: payoutId,
                error: error.message || error,
              },
            }
          ).catch((auditError) => {
            logger.error('Failed to create audit trail for transfer failure', {
              error: auditError,
              payoutId,
            });
          });
        }
      } catch (updateError: any) {
        logger.error('Failed to update payout status after job failure', {
          payoutId,
          error: updateError.message || updateError,
        });
      }

      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    concurrency: PAYOUT_TRANSFER_CONCURRENCY,
    connection,
  }
);

// Worker event handlers
payoutTransferWorker.on('error', (error) => {
  logger.error('Payout transfer worker error', {
    error: error.message || error,
  });
});

payoutTransferWorker.on('failed', async (job, error) => {
  logger.error('Payout transfer job failed permanently', {
    jobId: job?.id,
    payoutId: job?.data?.payoutId,
    attempts: job?.attemptsMade,
    error: error.message || error,
  });
});

payoutTransferWorker.on('completed', (job) => {
  logger.info('Payout transfer job completed', {
    jobId: job.id,
    payoutId: job.data.payoutId,
  });
});

payoutTransferWorker.on('stalled', (jobId) => {
  logger.warn('Payout transfer job stalled', { jobId });
});

payoutTransferWorker.on('ready', () => {
  logger.info('Payout transfer worker ready', {
    concurrency: PAYOUT_TRANSFER_CONCURRENCY,
    queueName: PAYOUT_TRANSFER_QUEUE_NAME,
  });
});

payoutTransferWorker.on('closed', () => {
  logger.info('Payout transfer worker closed');
});

/**
 * Close the payout transfer worker gracefully
 */
export const closePayoutTransferWorker = async (): Promise<void> => {
  try {
    await payoutTransferWorker.close();
    logger.info('Payout transfer worker closed successfully');
  } catch (error) {
    logger.error('Error closing payout transfer worker', { error });
  }
};
