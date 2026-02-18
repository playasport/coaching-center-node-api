import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as academyRatingService from '../../services/academy/academyCoachingCenterRating.service';
import type { RatingStatus } from '../../models/coachingCenterRating.model';

/**
 * Get paginated list of ratings for the academy's coaching centers.
 */
export const getRatings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as RatingStatus | undefined;
    const coachingCenterId = req.query.coachingCenterId as string | undefined;

    const filters = {
      page,
      limit,
      ...(status &&
        ['pending', 'approved', 'rejected'].includes(status) && { status }),
      ...(coachingCenterId && { coachingCenterId }),
    };

    const result = await academyRatingService.getRatings(req.user.id, filters);
    const response = new ApiResponse(200, result, t('coachingCenterRating.listSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single rating by id (only if it belongs to the academy's centers).
 */
export const getRatingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }
    const { id } = req.params;
    const rating = await academyRatingService.getRatingById(req.user.id, id);

    if (!rating) {
      throw new ApiError(404, t('coachingCenterRating.ratingNotFound'));
    }

    const response = new ApiResponse(200, { rating }, t('coachingCenterRating.getSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update rating status (approve / reject / pending) for a rating belonging to the academy's centers.
 */
export const updateRatingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }
    const { id } = req.params;
    const { status } = req.body as { status: RatingStatus };

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      throw new ApiError(400, t('coachingCenterRating.invalidStatus'));
    }

    const rating = await academyRatingService.updateRatingStatus(
      req.user.id,
      id,
      status
    );
    const response = new ApiResponse(200, { rating }, t('coachingCenterRating.statusUpdated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};
