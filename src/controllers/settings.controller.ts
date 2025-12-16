import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as settingsService from '../services/settings.service';

/**
 * Get application settings
 */
export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.getSettings();
    const response = new ApiResponse(200, { ...settings }, t('settings.get.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update application settings
 */
export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settingsData = req.body;

    if (!settingsData || Object.keys(settingsData).length === 0) {
      throw new ApiError(400, t('settings.update.dataRequired'));
    }

    const settings = await settingsService.updateSettings(settingsData);
    const response = new ApiResponse(200, { settings }, t('settings.update.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset settings to default
 */
export const resetSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.resetSettings();
    const response = new ApiResponse(200, { settings }, t('settings.reset.success'));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

