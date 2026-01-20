import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as payoutAccountService from '../../services/academy/payoutAccount.service';
import { logger } from '../../utils/logger';

/**
 * Get payout account for the authenticated academy user
 */
export const getPayoutAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const account = await payoutAccountService.getPayoutAccount(userId);

    if (!account) {
      res.status(404).json(
        new ApiResponse(false, 'Payout account not found', null, 404)
      );
      return;
    }

    res.status(200).json(
      new ApiResponse(true, 'Payout account retrieved successfully', account)
    );
  } catch (error: any) {
    logger.error('Error in getPayoutAccount controller:', {
      error: error.message || error,
      userId: (req as any).user?.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(false, error.message, null, error.statusCode)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(false, t('errors.internalServerError') || 'Internal server error', null, 500)
    );
  }
};

/**
 * Create payout account for the authenticated academy user
 */
export const createPayoutAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const data = req.body;

    const account = await payoutAccountService.createPayoutAccount(userId, data, {
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(201).json(
      new ApiResponse(true, 'Payout account created successfully', account, 201)
    );
  } catch (error: any) {
    logger.error('Error in createPayoutAccount controller:', {
      error: error.message || error,
      userId: (req as any).user?.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(false, error.message, null, error.statusCode)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(false, t('errors.internalServerError') || 'Internal server error', null, 500)
    );
  }
};

/**
 * Update bank details for payout account
 */
export const updateBankDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const bankDetails = req.body;

    const account = await payoutAccountService.updateBankDetails(userId, bankDetails, {
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(200).json(
      new ApiResponse(true, 'Bank details updated successfully', account)
    );
  } catch (error: any) {
    logger.error('Error in updateBankDetails controller:', {
      error: error.message || error,
      userId: (req as any).user?.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(false, error.message, null, error.statusCode)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(false, t('errors.internalServerError') || 'Internal server error', null, 500)
    );
  }
};

/**
 * Sync account status from Razorpay
 */
export const syncAccountStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    // Get account first to verify ownership
    const account = await payoutAccountService.getPayoutAccount(userId);
    if (!account) {
      throw new ApiError(404, 'Payout account not found');
    }

    // Sync status
    const updatedAccount = await payoutAccountService.syncAccountStatus(account.id);

    res.status(200).json(
      new ApiResponse(true, 'Account status synced successfully', updatedAccount)
    );
  } catch (error: any) {
    logger.error('Error in syncAccountStatus controller:', {
      error: error.message || error,
      userId: (req as any).user?.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(false, error.message, null, error.statusCode)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(false, t('errors.internalServerError') || 'Internal server error', null, 500)
    );
  }
};
