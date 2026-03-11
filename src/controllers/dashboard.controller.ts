import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as dashboardService from '../services/client/dashboard.service';

export const getUserDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const dashboard = await dashboardService.getUserDashboard(req.user.id);

    const response = new ApiResponse(200, dashboard, 'Dashboard retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
