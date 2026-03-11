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
exports.getRefundDetails = exports.createRefund = exports.getPayoutStats = exports.cancelPayout = exports.retryTransfer = exports.createTransfer = exports.getPayoutById = exports.getPayouts = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const payoutService = __importStar(require("../../services/admin/payout.service"));
const refundService = __importStar(require("../../services/admin/refund.service"));
const logger_1 = require("../../utils/logger");
/**
 * Get all payouts with filters
 */
const getPayouts = async (req, res) => {
    try {
        const { status, academyUserId, bookingId, transactionId, dateFrom, dateTo, page, limit, } = req.query;
        const filters = {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        };
        if (status) {
            filters.status = status;
        }
        if (academyUserId) {
            filters.academyUserId = academyUserId;
        }
        if (bookingId) {
            filters.bookingId = bookingId;
        }
        if (transactionId) {
            filters.transactionId = transactionId;
        }
        if (dateFrom) {
            filters.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            filters.dateTo = new Date(dateTo);
        }
        const result = await payoutService.getPayouts(filters);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, result, 'Payouts retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayouts controller:', {
            error: error.message || error,
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
 * Get payout by ID
 */
const getPayoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const payout = await payoutService.getPayoutById(id);
        if (!payout) {
            res.status(404).json(new ApiResponse_1.ApiResponse(404, null, 'Payout not found'));
            return;
        }
        res.status(200).json(new ApiResponse_1.ApiResponse(200, payout, 'Payout retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayoutById controller:', {
            error: error.message || error,
            payoutId: req.params.id,
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
 * Create transfer for a payout
 */
const createTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const payout = await payoutService.createTransfer(id, adminUserId, {
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
        });
        res.status(200).json(new ApiResponse_1.ApiResponse(200, payout, 'Transfer initiated successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in createTransfer controller:', {
            error: error.message || error,
            payoutId: req.params.id,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.createTransfer = createTransfer;
/**
 * Retry failed transfer
 */
const retryTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const payout = await payoutService.retryTransfer(id, adminUserId, {
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
        });
        res.status(200).json(new ApiResponse_1.ApiResponse(200, payout, 'Transfer retry initiated successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in retryTransfer controller:', {
            error: error.message || error,
            payoutId: req.params.id,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.retryTransfer = retryTransfer;
/**
 * Cancel payout
 */
const cancelPayout = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            throw new ApiError_1.ApiError(400, 'Cancellation reason is required');
        }
        const payout = await payoutService.cancelPayout(id, adminUserId, reason.trim(), {
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
        });
        res.status(200).json(new ApiResponse_1.ApiResponse(200, payout, 'Payout cancelled successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in cancelPayout controller:', {
            error: error.message || error,
            payoutId: req.params.id,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.cancelPayout = cancelPayout;
/**
 * Get payout statistics
 */
const getPayoutStats = async (req, res) => {
    try {
        const { academyUserId, dateFrom, dateTo } = req.query;
        const filters = {};
        if (academyUserId) {
            filters.academyUserId = academyUserId;
        }
        if (dateFrom) {
            filters.dateFrom = new Date(dateFrom);
        }
        if (dateTo) {
            filters.dateTo = new Date(dateTo);
        }
        const stats = await payoutService.getPayoutStats(filters);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, stats, 'Payout statistics retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayoutStats controller:', {
            error: error.message || error,
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
 * Create refund for a booking
 */
const createRefund = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { amount, reason } = req.body;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            throw new ApiError_1.ApiError(400, 'Refund reason is required');
        }
        const result = await refundService.createRefund(bookingId, adminUserId, {
            amount: amount ? Number(amount) : undefined,
            reason: reason.trim(),
        }, {
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
        });
        res.status(200).json(new ApiResponse_1.ApiResponse(200, result, 'Refund created successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in createRefund controller:', {
            error: error.message || error,
            bookingId: req.params.bookingId,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.createRefund = createRefund;
/**
 * Get refund details
 */
const getRefundDetails = async (req, res) => {
    try {
        const { refundId } = req.params;
        const refund = await refundService.getRefundDetails(refundId);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, refund, 'Refund details retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getRefundDetails controller:', {
            error: error.message || error,
            refundId: req.params.refundId,
        });
        if (error instanceof ApiError_1.ApiError) {
            res.status(error.statusCode).json(new ApiResponse_1.ApiResponse(error.statusCode, null, error.message));
            return;
        }
        res.status(500).json(new ApiResponse_1.ApiResponse(500, null, (0, i18n_1.t)('errors.internalServerError') || 'Internal server error'));
    }
};
exports.getRefundDetails = getRefundDetails;
//# sourceMappingURL=payout.controller.js.map