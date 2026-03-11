"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const dashboardService = __importStar(require("../../services/academy/dashboard.service"));
const logger_1 = require("../../utils/logger");
/**
 * Get academy dashboard statistics
 */
const getDashboard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const dashboardStats = await dashboardService.getAcademyDashboard(userId);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, dashboardStats, 'Dashboard statistics retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getDashboard controller:', {
            error: error.message || error,
            userId: req.user?.id,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=dashboard.controller.js.map