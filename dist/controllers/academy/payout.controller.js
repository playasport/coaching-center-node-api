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
exports.downloadPayoutInvoice = exports.getPayoutStats = exports.getPayoutById = exports.getPayouts = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const payoutService = __importStar(require("../../services/academy/payout.service"));
const payoutInvoice_service_1 = require("../../services/academy/payoutInvoice.service");
const logger_1 = require("../../utils/logger");
/**
 * Get payouts for academy (list with basic data)
 */
const getPayouts = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const { status, dateFrom, dateTo, page, limit, } = req.query;
        const filters = {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        };
        if (status) {
            filters.status = status;
        }
        if (dateFrom) {
            filters.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            filters.dateTo = new Date(dateTo);
        }
        const result = await payoutService.getAcademyPayouts(userId, filters);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, result, 'Payouts retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayouts controller:', {
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
exports.getPayouts = getPayouts;
/**
 * Get payout details by ID for academy
 */
const getPayoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const payout = await payoutService.getAcademyPayoutById(id, userId);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, payout, 'Payout retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayoutById controller:', {
            error: error.message || error,
            payoutId: req.params.id,
            userId: req.user?.id,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.getPayoutById = getPayoutById;
/**
 * Get payout statistics for academy
 */
const getPayoutStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const { dateFrom, dateTo } = req.query;
        const filters = {};
        if (dateFrom) {
            filters.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            filters.dateTo = new Date(dateTo);
        }
        const stats = await payoutService.getAcademyPayoutStats(userId, filters);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, stats, 'Payout statistics retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayoutStats controller:', {
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
exports.getPayoutStats = getPayoutStats;
/**
 * Download payout invoice as PDF
 */
const downloadPayoutInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const pdfBuffer = await (0, payoutInvoice_service_1.generatePayoutInvoice)(id, userId);
        // Set response headers for PDF download
        const fileName = `payout-invoice-${id}-${Date.now()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        // Send PDF buffer
        res.send(pdfBuffer);
    }
    catch (error) {
        next(error);
    }
};
exports.downloadPayoutInvoice = downloadPayoutInvoice;
//# sourceMappingURL=payout.controller.js.map