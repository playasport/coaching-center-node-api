import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { t } from '../utils/i18n';
import * as settingsService from '../services/common/settings.service';

/**
 * Get limited public settings (public route - only essential data)
 * Returns: app_name, app_logo, and contact info only
 */
export const getLimitedPublicSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.getLimitedPublicSettings();
    const response = new ApiResponse(200, { ...settings }, t('settings.get.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};


