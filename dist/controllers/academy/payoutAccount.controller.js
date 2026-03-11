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
exports.syncAccountStatus = exports.updateBankDetails = exports.createPayoutAccount = exports.getPayoutAccount = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const payoutAccountService = __importStar(require("../../services/academy/payoutAccount.service"));
const logger_1 = require("../../utils/logger");
/**
 * Get payout account for the authenticated academy user
 */
const getPayoutAccount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const account = await payoutAccountService.getPayoutAccount(userId);
        if (!account) {
            res.status(404).json(new ApiResponse_1.ApiResponse(404, null, 'Payout account not found'));
            return;
        }
        res.status(200).json(new ApiResponse_1.ApiResponse(200, account, 'Payout account retrieved successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in getPayoutAccount controller:', {
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
exports.getPayoutAccount = getPayoutAccount;
/**
 * Create payout account for the authenticated academy user
 */
const createPayoutAccount = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const data = req.body;
        const account = await payoutAccountService.createPayoutAccount(userId, data, {
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
        });
        res.status(201).json(new ApiResponse_1.ApiResponse(201, account, 'Payout account created successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in createPayoutAccount controller:', {
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
exports.createPayoutAccount = createPayoutAccount;
/**
 * Update bank details for payout account
 */
const updateBankDetails = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        const bankDetails = req.body;
        const account = await payoutAccountService.updateBankDetails(userId, bankDetails, {
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
        });
        res.status(200).json(new ApiResponse_1.ApiResponse(200, account, 'Bank details updated successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in updateBankDetails controller:', {
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
exports.updateBankDetails = updateBankDetails;
/**
 * Sync account status from Razorpay
 */
const syncAccountStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.unauthorized') || 'Unauthorized');
        }
        // Get account first to verify ownership
        const account = await payoutAccountService.getPayoutAccount(userId);
        if (!account) {
            throw new ApiError_1.ApiError(404, 'Payout account not found');
        }
        // Sync status
        const updatedAccount = await payoutAccountService.syncAccountStatus(account.id);
        res.status(200).json(new ApiResponse_1.ApiResponse(200, updatedAccount, 'Account status synced successfully'));
    }
    catch (error) {
        logger_1.logger.error('Error in syncAccountStatus controller:', {
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
exports.syncAccountStatus = syncAccountStatus;
//# sourceMappingURL=payoutAccount.controller.js.map