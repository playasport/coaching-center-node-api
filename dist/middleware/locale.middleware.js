"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestLocale = exports.localeMiddleware = void 0;
const i18n_1 = require("../utils/i18n");
const env_1 = require("../config/env");
const supportedLocales = ['en', 'hi'];
const defaultLocale = env_1.config.defaultLocale;
/**
 * Extract locale from request
 * Priority:
 * 1. Query parameter: ?lang=en or ?lang=hi
 * 2. Header: x-locale
 * 3. Header: Accept-Language
 * 4. Environment variable: DEFAULT_LOCALE
 * 5. Default: 'en'
 */
const localeMiddleware = (req, res, next) => {
    let locale = defaultLocale;
    // Check query parameter first (highest priority)
    const queryLang = req.query.lang;
    if (queryLang && supportedLocales.includes(queryLang)) {
        locale = queryLang;
    }
    // Check x-locale header
    else if (req.headers['x-locale']) {
        const headerLang = req.headers['x-locale'];
        if (supportedLocales.includes(headerLang)) {
            locale = headerLang;
        }
    }
    // Check Accept-Language header
    else if (req.headers['accept-language']) {
        const acceptLanguage = req.headers['accept-language'];
        // Parse Accept-Language header (e.g., "en-US,en;q=0.9,hi;q=0.8")
        const languages = acceptLanguage
            .split(',')
            .map((lang) => lang.split(';')[0].trim().toLowerCase().substring(0, 2));
        for (const lang of languages) {
            if (supportedLocales.includes(lang)) {
                locale = lang;
                break;
            }
        }
    }
    // Set the locale for this request
    (0, i18n_1.setLocale)(locale);
    // Add locale to response headers for debugging
    res.setHeader('x-locale', locale);
    next();
};
exports.localeMiddleware = localeMiddleware;
/**
 * Get current locale from request context
 */
const getRequestLocale = () => {
    return (0, i18n_1.getLocale)();
};
exports.getRequestLocale = getRequestLocale;
//# sourceMappingURL=locale.middleware.js.map