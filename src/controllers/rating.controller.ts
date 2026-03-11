import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as ratingService from '../services/client/coachingCenterRating.service';

export const getUserRatings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await ratingService.getUserRatings(req.user.id, page, limit);

    const response = new ApiResponse(200, result, 'User ratings retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
