import { Request, Response, NextFunction } from 'express';
type SupportedLocale = 'en' | 'hi';
/**
 * Extract locale from request
 * Priority:
 * 1. Query parameter: ?lang=en or ?lang=hi
 * 2. Header: x-locale
 * 3. Header: Accept-Language
 * 4. Environment variable: DEFAULT_LOCALE
 * 5. Default: 'en'
 */
export declare const localeMiddleware: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Get current locale from request context
 */
export declare const getRequestLocale: () => SupportedLocale;
export {};
//# sourceMappingURL=locale.middleware.d.ts.map