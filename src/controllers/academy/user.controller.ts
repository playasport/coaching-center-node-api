import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as academyUserService from '../../services/academy/user.service';

/**
 * Get enrolled users for academy
 */
export const getEnrolledUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const centerId = req.query.centerId as string | undefined;
    const batchId = req.query.batchId as string | undefined;
    const userType = req.query.userType as 'student' | 'guardian' | undefined;
    const search = req.query.search as string | undefined;

    const result = await academyUserService.getAcademyEnrolledUsers(req.user.id, {
      page,
      limit,
      centerId,
      batchId,
      userType,
      search,
    });

    const response = new ApiResponse(200, result, 'Enrolled users retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get enrolled user detail by user ID
 */
export const getEnrolledUserDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { userId } = req.params;

    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    const userDetail = await academyUserService.getAcademyEnrolledUserDetail(
      userId,
      req.user.id
    );

    const response = new ApiResponse(200, { user: userDetail }, 'User details retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
