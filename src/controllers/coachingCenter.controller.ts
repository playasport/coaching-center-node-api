import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as coachingCenterService from '../services/coachingCenter.service';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../validations/coachingCenter.validation';

export const createCoachingCenter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as CoachingCenterCreateInput;

    const coachingCenter = await coachingCenterService.createCoachingCenter(data);

    const response = new ApiResponse(
      201,
      { coachingCenter },
      t('coachingCenter.create.success')
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getCoachingCenter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('coachingCenter.idRequired'));
    }

    const coachingCenter = await coachingCenterService.getCoachingCenterById(id);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(
      200,
      { coachingCenter },
      t('coachingCenter.get.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateCoachingCenter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('coachingCenter.idRequired'));
    }

    const data = req.body as CoachingCenterUpdateInput;

    const coachingCenter = await coachingCenterService.updateCoachingCenter(id, data);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(
      200,
      { coachingCenter },
      t('coachingCenter.update.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

