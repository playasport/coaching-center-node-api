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
exports.exportToCSV = exports.exportToPDF = exports.exportToExcel = exports.getEnrolledUserDetail = exports.getEnrolledUsers = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const academyUserService = __importStar(require("../../services/academy/user.service"));
const exportService = __importStar(require("../../services/academy/userExport.service"));
/**
 * Get enrolled users for academy
 */
const getEnrolledUsers = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const centerId = req.query.centerId;
        const batchId = req.query.batchId;
        const userType = req.query.userType;
        const search = req.query.search;
        const result = await academyUserService.getAcademyEnrolledUsers(req.user.id, {
            page,
            limit,
            centerId,
            batchId,
            userType,
            search,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Enrolled users retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEnrolledUsers = getEnrolledUsers;
/**
 * Get enrolled user detail by user ID
 */
const getEnrolledUserDetail = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { userId } = req.params;
        if (!userId) {
            throw new ApiError_1.ApiError(400, 'User ID is required');
        }
        const userDetail = await academyUserService.getAcademyEnrolledUserDetail(userId, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { user: userDetail }, 'User details retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEnrolledUserDetail = getEnrolledUserDetail;
/**
 * Export enrolled users to Excel
 */
const exportToExcel = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { centerId, batchId, userType, search, startDate, endDate } = req.query;
        const filters = {
            centerId: centerId,
            batchId: batchId,
            userType: userType,
            search: search,
            startDate: startDate,
            endDate: endDate,
        };
        const buffer = await exportService.exportToExcel(req.user.id, filters);
        const filename = `enrolled-users-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToExcel = exportToExcel;
/**
 * Export enrolled users to PDF
 */
const exportToPDF = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { centerId, batchId, userType, search, startDate, endDate } = req.query;
        const filters = {
            centerId: centerId,
            batchId: batchId,
            userType: userType,
            search: search,
            startDate: startDate,
            endDate: endDate,
        };
        const buffer = await exportService.exportToPDF(req.user.id, filters);
        const filename = `enrolled-users-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToPDF = exportToPDF;
/**
 * Export enrolled users to CSV
 */
const exportToCSV = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { centerId, batchId, userType, search, startDate, endDate } = req.query;
        const filters = {
            centerId: centerId,
            batchId: batchId,
            userType: userType,
            search: search,
            startDate: startDate,
            endDate: endDate,
        };
        const csvContent = await exportService.exportToCSV(req.user.id, filters);
        const filename = `enrolled-users-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToCSV = exportToCSV;
//# sourceMappingURL=user.controller.js.map