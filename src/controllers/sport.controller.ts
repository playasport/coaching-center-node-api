import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { t } from '../utils/i18n';
import * as sportService from '../services/common/sport.service';

export const getAllSports = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sports = await sportService.getAllSports();
    const response = new ApiResponse(200, { sports }, t('sport.getAll.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

