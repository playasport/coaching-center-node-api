import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as dashboardService from '../../services/academy/dashboard.service';
import { logger } from '../../utils/logger';

/**
 * Get academy dashboard statistics
 */
export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new ApiError(401, t('auth.unauthorized') || 'Unauthorized');
    }

    const dashboardStats = await dashboardService.getAcademyDashboard(userId);

    res.status(200).json(
      new ApiResponse(200, dashboardStats, 'Dashboard statistics retrieved successfully')
    );
  } catch (error: any) {
    logger.error('Error in getDashboard controller:', {
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
