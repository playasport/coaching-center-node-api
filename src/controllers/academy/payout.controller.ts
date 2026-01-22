import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as payoutService from '../../services/academy/payout.service';
import { generatePayoutInvoice } from '../../services/academy/payoutInvoice.service';
import { logger } from '../../utils/logger';
import { PayoutStatus } from '../../models/payout.model';

/**
 * Get payouts for academy (list with basic data)
 */
export const getPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const {
      status,
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

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    const result = await payoutService.getAcademyPayouts(userId, filters);

    res.status(200).json(
      new ApiResponse(200, result, 'Payouts retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getPayouts controller:', {
      error: error.message || error,
      userId: (req as any).user?.id,
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
 * Get payout details by ID for academy
 */
export const getPayoutById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const payout = await payoutService.getAcademyPayoutById(id, userId);

    res.status(200).json(
      new ApiResponse(200, payout, 'Payout retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getPayoutById controller:', {
      error: error.message || error,
      payoutId: req.params.id,
      userId: (req as any).user?.id,
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
 * Get payout statistics for academy
 */
export const getPayoutStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const { dateFrom, dateTo } = req.query;

    const filters: any = {};

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    const stats = await payoutService.getAcademyPayoutStats(userId, filters);

    res.status(200).json(
      new ApiResponse(200, stats, 'Payout statistics retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getPayoutStats controller:', {
      error: error.message || error,
      userId: (req as any).user?.id,
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
 * Download payout invoice as PDF
 */
export const downloadPayoutInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const pdfBuffer = await generatePayoutInvoice(id, userId);

    // Set response headers for PDF download
    const fileName = `payout-invoice-${id}-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
