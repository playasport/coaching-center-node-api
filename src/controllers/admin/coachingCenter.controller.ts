import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as adminCoachingCenterService from '../../services/admin/adminCoachingCenter.service';
import * as commonService from '../../services/common/coachingCenterCommon.service';

/**
 * Get all coaching centers (admin view)
 */
export const getAllCoachingCenters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { userId, status, search, sportId, isActive, sortBy, sortOrder } = req.query;

    const filters = {
      userId: userId as string,
      status: status as string,
      search: search as string,
      sportId: sportId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminCoachingCenterService.getAllCoachingCenters(page, limit, filters);

    const response = new ApiResponse(
      200,
      result,
      t('admin.coachingCenters.retrieved')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaching center by ID (admin view)
 */
export const getCoachingCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const coachingCenter = await commonService.getCoachingCenterById(id);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.retrieved'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaching centers by user ID (admin view)
 */
export const getCoachingCentersByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { sortBy, sortOrder } = req.query;

    const result = await adminCoachingCenterService.getCoachingCentersByUserId(
      userId, 
      page, 
      limit, 
      sortBy as string, 
      sortOrder as 'asc' | 'desc'
    );

    const response = new ApiResponse(
      200,
      result,
      t('admin.coachingCenters.retrieved')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create coaching center by admin
 * Allows admin to create center by providing academy owner details
 */
export const createCoachingCenterByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bank_information, ...data } = req.body;
    
    // Get admin user ID from request (if authenticated)
    const adminUserId = req.user?.id;
    
    const coachingCenter = await adminCoachingCenterService.createCoachingCenterByAdmin(data, adminUserId);

    const response = new ApiResponse(201, { coachingCenter }, t('coachingCenter.create.success'));
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update coaching center (admin)
 */
export const updateCoachingCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { bank_information, ...data } = req.body;

    // Use admin update logic which supports userId change
    const coachingCenter = await adminCoachingCenterService.updateCoachingCenterByAdmin(id, data);

    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete coaching center (admin)
 */
export const deleteCoachingCenter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await commonService.deleteCoachingCenter(id);

    const response = new ApiResponse(200, null, t('admin.coachingCenters.deleted'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle coaching center status (admin)
 */
export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const coachingCenter = await commonService.toggleCoachingCenterStatus(id);

    const response = new ApiResponse(200, { coachingCenter }, t('admin.coachingCenters.updated'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove media from coaching center (admin)
 */
export const removeMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { mediaType, uniqueId, sportId } = req.body;

    if (!mediaType || !uniqueId) {
      throw new ApiError(400, t('coachingCenter.media.missingParams'));
    }

    await commonService.removeMediaFromCoachingCenter(
      id,
      mediaType as 'logo' | 'document' | 'image' | 'video',
      uniqueId,
      sportId
    );

    const response = new ApiResponse(200, { success: true }, t('coachingCenter.media.removeSuccess'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get coaching center statistics for admin dashboard
 */
export const getCoachingCenterStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, userId, status, isActive, sportId, search } = req.query;

    const params = {
      startDate: startDate as string,
      endDate: endDate as string,
      userId: userId as string,
      status: status as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      sportId: sportId as string,
      search: search as string,
    };

    const stats = await adminCoachingCenterService.getCoachingCenterStats(params);

    const response = new ApiResponse(200, { stats }, 'Coaching center statistics retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
