import { Request, Response, NextFunction } from 'express';
import { setLocale, getLocale } from '../utils/i18n';
import { config } from '../config/env';

type SupportedLocale = 'en' | 'hi';

const supportedLocales: SupportedLocale[] = ['en', 'hi'];
const defaultLocale: SupportedLocale = config.defaultLocale;

/**
 * Extract locale from request
 * Priority:
 * 1. Query parameter: ?lang=en or ?lang=hi
 * 2. Header: x-locale
 * 3. Header: Accept-Language
 * 4. Environment variable: DEFAULT_LOCALE
 * 5. Default: 'en'
 */
export const localeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let locale: SupportedLocale = defaultLocale;

  // Check query parameter first (highest priority)
  const queryLang = req.query.lang as string;
  if (queryLang && supportedLocales.includes(queryLang as SupportedLocale)) {
    locale = queryLang as SupportedLocale;
  }
  // Check x-locale header
  else if (req.headers['x-locale']) {
    const headerLang = req.headers['x-locale'] as string;
    if (supportedLocales.includes(headerLang as SupportedLocale)) {
      locale = headerLang as SupportedLocale;
    }
  }
  // Check Accept-Language header
  else if (req.headers['accept-language']) {
    const acceptLanguage = req.headers['accept-language'] as string;
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,hi;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().toLowerCase().substring(0, 2));

    for (const lang of languages) {
      if (supportedLocales.includes(lang as SupportedLocale)) {
        locale = lang as SupportedLocale;
        break;
      }
    }
  }

  // Set the locale for this request
  setLocale(locale);

  // Add locale to response headers for debugging
  res.setHeader('x-locale', locale);

  next();
};

/**
 * Get current locale from request context
 */
export const getRequestLocale = (): SupportedLocale => {
  return getLocale() as SupportedLocale;
};

