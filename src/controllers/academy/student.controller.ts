import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as academyStudentService from '../../services/academy/student.service';

/**
 * Get enrolled students for academy
 */
export const getEnrolledStudents = async (
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
    const status = req.query.status as 'active' | 'left' | 'completed' | 'pending' | undefined;

    const result = await academyStudentService.getAcademyEnrolledStudents(req.user.id, {
      page,
      limit,
      centerId,
      batchId,
      status,
    });

    const response = new ApiResponse(200, result, 'Enrolled students retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get enrolled student detail by participant ID
 */
export const getEnrolledStudentDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { participantId } = req.params;

    if (!participantId) {
      throw new ApiError(400, 'Participant ID is required');
    }

    const studentDetail = await academyStudentService.getAcademyEnrolledStudentDetail(
      participantId,
      req.user.id
    );

    const response = new ApiResponse(200, { student: studentDetail }, 'Student details retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
