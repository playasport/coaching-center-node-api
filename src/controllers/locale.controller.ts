import { Request, Response, NextFunction } from 'express';
import { setLocale, getLocale } from '../utils/i18n';
import { t } from '../utils/i18n';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

type SupportedLocale = 'en' | 'hi';

/**
 * Get current locale
 */
export const getCurrentLocale = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const response = new ApiResponse(200, {
      locale: getLocale(),
      supportedLocales: ['en', 'hi'],
    });
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Set locale for the current request
 */
export const setCurrentLocale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { locale } = req.body;

    if (!locale || !['en', 'hi'].includes(locale)) {
      throw new ApiError(400, t('validation.locale.invalid'));
    }

    setLocale(locale as SupportedLocale);

    const response = new ApiResponse(200, { locale: getLocale() }, t('locale.changed', { locale }));
    res.json(response);
  } catch (error) {
    next(error);
  }
};

