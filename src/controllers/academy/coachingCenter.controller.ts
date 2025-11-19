import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as coachingCenterService from '../../services/coachingCenter.service';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../../validations/coachingCenter.validation';

export const createCoachingCenter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as CoachingCenterCreateInput;

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const coachingCenter = await coachingCenterService.createCoachingCenter(data, req.user.id);

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

export const toggleCoachingCenterStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('coachingCenter.idRequired'));
    }

    const coachingCenter = await coachingCenterService.toggleCoachingCenterStatus(id);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const statusMessage = coachingCenter.is_active
      ? t('coachingCenter.toggleStatus.active')
      : t('coachingCenter.toggleStatus.inactive');

    const response = new ApiResponse(
      200,
      { coachingCenter },
      statusMessage
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteCoachingCenter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('coachingCenter.idRequired'));
    }

    await coachingCenterService.deleteCoachingCenter(id);

    const response = new ApiResponse(
      200,
      {},
      t('coachingCenter.delete.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getMyCoachingCenters = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await coachingCenterService.getCoachingCentersByUser(
      req.user.id,
      page,
      limit
    );

    const response = new ApiResponse(
      200,
      result,
      t('coachingCenter.list.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove media from coaching center (soft delete)
 */
export const removeMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { mediaType, uniqueId, sportId } = req.body;

    if (!mediaType || !uniqueId) {
      throw new ApiError(400, t('coachingCenter.media.missingParams'));
    }

    // Validate mediaType
    if (!['logo', 'document', 'image', 'video'].includes(mediaType)) {
      throw new ApiError(400, t('coachingCenter.media.invalidType'));
    }

    // sportId is required for image/video
    if ((mediaType === 'image' || mediaType === 'video') && !sportId) {
      throw new ApiError(400, t('coachingCenter.media.sportIdRequired'));
    }

    await coachingCenterService.removeMediaFromCoachingCenter(
      id,
      mediaType as 'logo' | 'document' | 'image' | 'video',
      uniqueId,
      sportId
    );

    const response = new ApiResponse(
      200,
      { success: true },
      t('coachingCenter.media.removeSuccess')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

