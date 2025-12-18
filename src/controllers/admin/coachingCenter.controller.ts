import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as coachingCenterService from '../../services/coachingCenter.service';
import { CoachingCenterModel } from '../../models/coachingCenter.model';

/**
 * Get all coaching centers (admin view)
 */
export const getAllCoachingCenters = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const [coachingCenters, total] = await Promise.all([
      CoachingCenterModel.find({})
        .populate('user', 'firstName lastName email')
        .populate('sports', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoachingCenterModel.countDocuments({}),
    ]);

    const response = new ApiResponse(
      200,
      {
        coachingCenters,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      t('admin.coachingCenters.retrieved')
    );
    res.json(response);
  } catch (error) {
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get coaching center by ID (admin view)
 */
export const getCoachingCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const coachingCenter = await coachingCenterService.getCoachingCenterById(id);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update coaching center (admin)
 */
export const updateCoachingCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const coachingCenter = await coachingCenterService.updateCoachingCenter(id, data);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete coaching center (admin)
 */
export const deleteCoachingCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const coachingCenter = await CoachingCenterModel.findOneAndDelete({ id });

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, null, t('admin.coachingCenters.deleted'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
