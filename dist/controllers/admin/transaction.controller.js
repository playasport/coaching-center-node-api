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
exports.exportTransactions = exports.getTransactionStats = exports.getTransactionById = exports.getAllTransactions = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminTransactionService = __importStar(require("../../services/admin/transaction.service"));
const transactionExportService = __importStar(require("../../services/admin/transactionExport.service"));
/**
 * Get all transactions for admin
 */
const getAllTransactions = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { userId, bookingId, status, type, source, search, startDate, endDate, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            userId: userId,
            bookingId: bookingId,
            status: status,
            type: type,
            source: source,
            search: search,
            startDate: startDate,
            endDate: endDate,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminTransactionService.getAllTransactions(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Transactions retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllTransactions = getAllTransactions;
/**
 * Get transaction by ID for admin
 */
const getTransactionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const transaction = await adminTransactionService.getTransactionById(id);
        if (!transaction) {
            throw new ApiError_1.ApiError(404, 'Transaction not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { transaction }, 'Transaction retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getTransactionById = getTransactionById;
/**
 * Get transaction statistics for admin dashboard
 */
const getTransactionStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const params = {
            startDate: startDate,
            endDate: endDate,
        };
        const stats = await adminTransactionService.getTransactionStats(params);
        const response = new ApiResponse_1.ApiResponse(200, { stats }, 'Transaction statistics retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getTransactionStats = getTransactionStats;
/**
 * Export transactions
 */
const exportTransactions = async (req, res, next) => {
    try {
        const format = req.query.format;
        const { userId, bookingId, status, type, source, search, startDate, endDate } = req.query;
        if (!format || !['excel', 'csv', 'pdf'].includes(format)) {
            throw new ApiError_1.ApiError(400, 'Invalid format. Must be one of: excel, csv, pdf');
        }
        const filters = {
            userId: userId,
            bookingId: bookingId,
            status: status,
            type: type,
            source: source,
            search: search,
            startDate: startDate,
            endDate: endDate,
        };
        let buffer;
        let contentType;
        let filename;
        switch (format) {
            case 'excel':
                buffer = await transactionExportService.exportToExcel(filters);
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                filename = `transactions-${Date.now()}.xlsx`;
                break;
            case 'csv':
                buffer = await transactionExportService.exportToCSV(filters);
                contentType = 'text/csv';
                filename = `transactions-${Date.now()}.csv`;
                break;
            case 'pdf':
                buffer = await transactionExportService.exportToPDF(filters);
                contentType = 'application/pdf';
                filename = `transactions-${Date.now()}.pdf`;
                break;
            default:
                throw new ApiError_1.ApiError(400, 'Invalid format. Must be one of: excel, csv, pdf');
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (Buffer.isBuffer(buffer)) {
            res.setHeader('Content-Length', buffer.length.toString());
            res.send(buffer);
        }
        else {
            res.setHeader('Content-Length', Buffer.byteLength(buffer).toString());
            res.send(buffer);
        }
    }
    catch (error) {
        next(error);
    }
};
exports.exportTransactions = exportTransactions;
//# sourceMappingURL=transaction.controller.js.map