import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { t } from '../utils/i18n';
import * as facilityService from '../services/common/facility.service';

export const getAllFacilities = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const facilities = await facilityService.getAllFacilities();
    const response = new ApiResponse(200, { facilities }, t('facility.getAll.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

