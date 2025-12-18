import { Request, Response } from 'express';
import { getDashboardStats as getDashboardStatsService } from '../../services/admin.service';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardStatsService();
    const response = new ApiResponse(200, { stats }, t('admin.dashboard.statsRetrieved'));
    res.json(response);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
