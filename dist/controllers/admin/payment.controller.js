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
exports.getPaymentStats = exports.getPaymentById = exports.getAllPayments = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminPaymentService = __importStar(require("../../services/admin/payment.service"));
/**
 * Get all payments for admin
 */
const getAllPayments = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { userId, bookingId, status, paymentMethod, search, startDate, endDate, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            userId: userId,
            bookingId: bookingId,
            status: status,
            paymentMethod: paymentMethod,
            search: search,
            startDate: startDate,
            endDate: endDate,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminPaymentService.getAllPayments(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Payments retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllPayments = getAllPayments;
/**
 * Get payment by ID for admin
 */
const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payment = await adminPaymentService.getPaymentById(id);
        if (!payment) {
            throw new ApiError_1.ApiError(404, 'Payment not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { payment }, 'Payment retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentById = getPaymentById;
/**
 * Get payment statistics for admin dashboard
 */
const getPaymentStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const params = {
            startDate: startDate,
            endDate: endDate,
        };
        const stats = await adminPaymentService.getPaymentStats(params);
        const response = new ApiResponse_1.ApiResponse(200, { stats }, 'Payment statistics retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentStats = getPaymentStats;
//# sourceMappingURL=payment.controller.js.map