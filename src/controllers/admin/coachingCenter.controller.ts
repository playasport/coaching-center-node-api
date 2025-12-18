import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as adminCoachingCenterService from '../../services/admin/adminCoachingCenter.service';
import * as commonService from '../../services/common/coachingCenterCommon.service';

/**
 * Get all coaching centers (admin view)
 */
export const getAllCoachingCenters = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await adminCoachingCenterService.getAllCoachingCenters(page, limit);

    const response = new ApiResponse(
      200,
      result,
      t('admin.coachingCenters.retrieved')
    );
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get coaching center by ID (admin view)
 */
export const getCoachingCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const coachingCenter = await commonService.getCoachingCenterById(id);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.retrieved'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create coaching center by admin
 * Allows admin to create center for a specific academy user
 */
export const createCoachingCenterByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new ApiError(400, 'userId is required to create coaching center for an academy');
    }

    const coachingCenter = await adminCoachingCenterService.createCoachingCenterByAdmin(req.body, userId);

    const response = new ApiResponse(201, { coachingCenter }, t('coachingCenter.create.success'));
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
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

    // Use common update logic
    const coachingCenter = await adminCoachingCenterService.updateCoachingCenterByAdmin(id, data);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Delete coaching center (admin)
 */
export const deleteCoachingCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await commonService.deleteCoachingCenter(id);

    const response = new ApiResponse(200, null, t('admin.coachingCenters.deleted'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Toggle coaching center status (admin)
 */
export const toggleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const coachingCenter = await commonService.toggleCoachingCenterStatus(id);

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
