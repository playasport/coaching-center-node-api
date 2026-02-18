import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as adminRatingService from '../../services/admin/adminCoachingCenterRating.service';
import type { RatingStatus } from '../../models/coachingCenterRating.model';

/**
 * Get paginated list of coaching center ratings (admin).
 */
export const getRatings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as RatingStatus | undefined;
    const coachingCenterId = req.query.coachingCenterId as string | undefined;

    const filters = {
      page,
      limit,
      ...(status && ['pending', 'approved', 'rejected'].includes(status) && { status }),
      ...(coachingCenterId && { coachingCenterId }),
    };

    const result = await adminRatingService.getRatings(filters);
    const response = new ApiResponse(200, result, t('coachingCenterRating.listSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single rating by id (admin).
 */
export const getRatingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const rating = await adminRatingService.getRatingById(id);

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
 * Update rating status (approve / reject / pending).
 */
export const updateRatingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: RatingStatus };

    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      throw new ApiError(400, t('coachingCenterRating.invalidStatus'));
    }

    const rating = await adminRatingService.updateRatingStatus(id, status);
    const response = new ApiResponse(200, { rating }, t('coachingCenterRating.statusUpdated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};
