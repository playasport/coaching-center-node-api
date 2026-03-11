"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const i18n_1 = require("../utils/i18n");
const ApiResponse_1 = require("../utils/ApiResponse");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const errorHandler = (err, req, res, _next) => {
    // Check if it's an ApiError instance
    const isApiError = err instanceof ApiError_1.ApiError;
    const statusCode = err.statusCode || 500;
    // Use the error message if it's an ApiError, otherwise use internal server error message
    const message = isApiError && err.message ? err.message : (statusCode === 500 ? (0, i18n_1.t)('errors.internalServerError') : err.message || (0, i18n_1.t)('errors.internalServerError'));
    // Only log as error if it's a 500, otherwise log as warn/info
    if (statusCode >= 500) {
        logger_1.logger.error('Unhandled application error', {
            statusCode,
            message: err.message,
            method: req.method,
            url: req.originalUrl,
            stack: err.stack,
        });
    }
    else {
        logger_1.logger.warn('Application error', {
            statusCode,
            message: err.message,
            method: req.method,
            url: req.originalUrl,
        });
    }
    const shouldIncludeStack = env_1.config.nodeEnv !== 'production';
    const data = shouldIncludeStack && err.stack ? { stack: err.stack } : null;
    // Include errors array if it's an ApiError with validation errors
    const responseData = isApiError && err.errors && err.errors.length > 0
        ? { ...data, errors: err.errors }
        : data;
    const response = new ApiResponse_1.ApiResponse(statusCode, responseData, message);
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, _next) => {
    logger_1.logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
    });
    const message = (0, i18n_1.t)('errors.routeNotFound', { route: req.originalUrl });
    const response = new ApiResponse_1.ApiResponse(404, null, message);
    res.status(404).json(response);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error.middleware.js.map