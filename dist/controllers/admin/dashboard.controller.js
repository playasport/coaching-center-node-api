"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const admin_service_1 = require("../../services/admin/admin.service");
const ApiError_1 = require("../../utils/ApiError");
const ApiResponse_1 = require("../../utils/ApiResponse");
const i18n_1 = require("../../utils/i18n");
const logger_1 = require("../../utils/logger");
/**
 * Get dashboard statistics
 */
const getDashboardStats = async (_req, res) => {
    try {
        const stats = await (0, admin_service_1.getDashboardStats)();
        const response = new ApiResponse_1.ApiResponse(200, { stats }, (0, i18n_1.t)('admin.dashboard.statsRetrieved'));
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Get dashboard stats error:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboard.controller.js.map