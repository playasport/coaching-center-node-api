"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCurrentLocale = exports.getCurrentLocale = void 0;
const i18n_1 = require("../utils/i18n");
const i18n_2 = require("../utils/i18n");
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
/**
 * Get current locale
 */
const getCurrentLocale = async (_req, res, next) => {
    try {
        const response = new ApiResponse_1.ApiResponse(200, {
            locale: (0, i18n_1.getLocale)(),
            supportedLocales: ['en', 'hi'],
        });
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentLocale = getCurrentLocale;
/**
 * Set locale for the current request
 */
const setCurrentLocale = async (req, res, next) => {
    try {
        const { locale } = req.body;
        if (!locale || !['en', 'hi'].includes(locale)) {
            throw new ApiError_1.ApiError(400, (0, i18n_2.t)('validation.locale.invalid'));
        }
        (0, i18n_1.setLocale)(locale);
        const response = new ApiResponse_1.ApiResponse(200, { locale: (0, i18n_1.getLocale)() }, (0, i18n_2.t)('locale.changed', { locale }));
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.setCurrentLocale = setCurrentLocale;
//# sourceMappingURL=locale.controller.js.map