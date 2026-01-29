import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as payoutService from '../../services/admin/payout.service';
import * as refundService from '../../services/admin/refund.service';
import { logger } from '../../utils/logger';
import { PayoutStatus } from '../../models/payout.model';

/**
 * Get all payouts with filters
 */
export const getPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      academyUserId,
      bookingId,
      transactionId,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const filters: any = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };

    if (status) {
      filters.status = status as PayoutStatus;
    }

    if (academyUserId) {
      filters.academyUserId = academyUserId as string;
    }

    if (bookingId) {
      filters.bookingId = bookingId as string;
    }

    if (transactionId) {
      filters.transactionId = transactionId as string;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    const result = await payoutService.getPayouts(filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Payouts retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getPayouts controller:', {
      error: error.message || error,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Get payout by ID
 */
export const getPayoutById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payout = await payoutService.getPayoutById(id);

    if (!payout) {
      res.status(404).json(
        new ApiResponse(404, null, 'Payout not found')
      );
      return;
    }

    res.status(200).json(
      new ApiResponse(200, payout, 'Payout retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getPayoutById controller:', {
      error: error.message || error,
      payoutId: req.params.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Create transfer for a payout
 */
export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user?.id;

    if (!adminUserId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const payout = await payoutService.createTransfer(id, adminUserId, {
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(200).json(
      new ApiResponse(200, payout, 'Transfer initiated successfully')
    );
  } catch (error: any) {
    logger.error('Error in createTransfer controller:', {
      error: error.message || error,
      payoutId: req.params.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Retry failed transfer
 */
export const retryTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUserId = (req as any).user?.id;

    if (!adminUserId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const payout = await payoutService.retryTransfer(id, adminUserId, {
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(200).json(
      new ApiResponse(200, payout, 'Transfer retry initiated successfully')
    );
  } catch (error: any) {
    logger.error('Error in retryTransfer controller:', {
      error: error.message || error,
      payoutId: req.params.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Cancel payout
 */
export const cancelPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = (req as any).user?.id;

    if (!adminUserId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new ApiError(400, 'Cancellation reason is required');
    }

    const payout = await payoutService.cancelPayout(id, adminUserId, reason.trim(), {
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(200).json(
      new ApiResponse(200, payout, 'Payout cancelled successfully')
    );
  } catch (error: any) {
    logger.error('Error in cancelPayout controller:', {
      error: error.message || error,
      payoutId: req.params.id,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Get payout statistics
 */
export const getPayoutStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { academyUserId, dateFrom, dateTo } = req.query;

    const filters: any = {};

    if (academyUserId) {
      filters.academyUserId = academyUserId as string;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    const stats = await payoutService.getPayoutStats(filters);

    res.status(200).json(
      new ApiResponse(200, stats, 'Payout statistics retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getPayoutStats controller:', {
      error: error.message || error,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Create refund for a booking
 */
export const createRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { amount, reason } = req.body;
    const adminUserId = (req as any).user?.id;

    if (!adminUserId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new ApiError(400, 'Refund reason is required');
    }

    const result = await refundService.createRefund(
      bookingId,
      adminUserId,
      {
        amount: amount ? Number(amount) : undefined,
        reason: reason.trim(),
      },
      {
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
      }
    );

    res.status(200).json(
      new ApiResponse(200, result, 'Refund created successfully')
    );
  } catch (error: any) {
    logger.error('Error in createRefund controller:', {
      error: error.message || error,
      bookingId: req.params.bookingId,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};

/**
 * Get refund details
 */
export const getRefundDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refundId } = req.params;

    const refund = await refundService.getRefundDetails(refundId);

    res.status(200).json(
      new ApiResponse(200, refund, 'Refund details retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getRefundDetails controller:', {
      error: error.message || error,
      refundId: req.params.refundId,
    });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
      return;
    }

    res.status(500).json(
      new ApiResponse(500, null, t('errors.internalServerError') || 'Internal server error')
    );
  }
};
