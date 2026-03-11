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
exports.exportToCSV = exports.exportToPDF = exports.exportToExcel = exports.getEnrolledStudentDetail = exports.getEnrolledStudents = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const academyStudentService = __importStar(require("../../services/academy/student.service"));
const exportService = __importStar(require("../../services/academy/studentExport.service"));
/**
 * Get enrolled students for academy
 */
const getEnrolledStudents = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const centerId = req.query.centerId;
        const batchId = req.query.batchId;
        const status = req.query.status;
        const result = await academyStudentService.getAcademyEnrolledStudents(req.user.id, {
            page,
            limit,
            centerId,
            batchId,
            status,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Enrolled students retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEnrolledStudents = getEnrolledStudents;
/**
 * Get enrolled student detail by participant ID
 */
const getEnrolledStudentDetail = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { participantId } = req.params;
        if (!participantId) {
            throw new ApiError_1.ApiError(400, 'Participant ID is required');
        }
        const studentDetail = await academyStudentService.getAcademyEnrolledStudentDetail(participantId, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { student: studentDetail }, 'Student details retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getEnrolledStudentDetail = getEnrolledStudentDetail;
/**
 * Export enrolled students to Excel
 */
const exportToExcel = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { centerId, batchId, status, startDate, endDate } = req.query;
        const filters = {
            centerId: centerId,
            batchId: batchId,
            status: status,
            startDate: startDate,
            endDate: endDate,
        };
        const buffer = await exportService.exportToExcel(req.user.id, filters);
        const filename = `enrolled-students-${new Date().toISOString().split('T')[0]}.xlsx`;
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
 * Export enrolled students to PDF
 */
const exportToPDF = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { centerId, batchId, status, startDate, endDate } = req.query;
        const filters = {
            centerId: centerId,
            batchId: batchId,
            status: status,
            startDate: startDate,
            endDate: endDate,
        };
        const buffer = await exportService.exportToPDF(req.user.id, filters);
        const filename = `enrolled-students-${new Date().toISOString().split('T')[0]}.pdf`;
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
 * Export enrolled students to CSV
 */
const exportToCSV = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { centerId, batchId, status, startDate, endDate } = req.query;
        const filters = {
            centerId: centerId,
            batchId: batchId,
            status: status,
            startDate: startDate,
            endDate: endDate,
        };
        const csvContent = await exportService.exportToCSV(req.user.id, filters);
        const filename = `enrolled-students-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
    catch (error) {
        next(error);
    }
};
exports.exportToCSV = exportToCSV;
//# sourceMappingURL=student.controller.js.map