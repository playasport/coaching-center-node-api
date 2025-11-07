import { Request, Response, NextFunction } from 'express';
import { setLocale, getLocale } from '../utils/i18n';
import { t } from '../utils/i18n';

type SupportedLocale = 'en' | 'hi';

/**
 * Get current locale
 */
export const getCurrentLocale = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        locale: getLocale(),
        supportedLocales: ['en', 'hi'],
      },
    });
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
      res.status(400).json({
        success: false,
        message: t('validation.locale.invalid'),
        supportedLocales: ['en', 'hi'],
      });
      return;
    }

    setLocale(locale as SupportedLocale);

    res.json({
      success: true,
      message: t('locale.changed', { locale }),
      data: {
        locale: getLocale(),
      },
    });
  } catch (error) {
    next(error);
  }
};

