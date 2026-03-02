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
exports.exportBookings = exports.rejectBookingRequest = exports.approveBookingRequest = exports.getBookingById = exports.getBookings = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const academyBookingService = __importStar(require("../../services/academy/booking.service"));
const bookingExportService = __importStar(require("../../services/academy/bookingExport.service"));
/**
 * Get bookings for academy
 */
const getBookings = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const centerId = req.query.centerId;
        const batchId = req.query.batchId;
        const status = req.query.status;
        const paymentStatus = req.query.paymentStatus;
        const result = await academyBookingService.getAcademyBookings(req.user.id, {
            page,
            limit,
            centerId,
            batchId,
            status,
            paymentStatus: paymentStatus,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Bookings retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBookings = getBookings;
/**
 * Get booking by ID
 */
const getBookingById = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const booking = await academyBookingService.getAcademyBookingById(id, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, booking, 'Booking retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingById = getBookingById;
/**
 * Approve booking request
 */
const approveBookingRequest = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const booking = await academyBookingService.approveBookingRequest(id, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, booking, 'Booking request approved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.approveBookingRequest = approveBookingRequest;
/**
 * Reject booking request
 */
const rejectBookingRequest = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { id } = req.params;
        const { reason } = req.body;
        const booking = await academyBookingService.rejectBookingRequest(id, req.user.id, reason);
        const response = new ApiResponse_1.ApiResponse(200, booking, 'Booking request rejected successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.rejectBookingRequest = rejectBookingRequest;
/**
 * Export bookings for academy
 */
const exportBookings = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const format = req.query.format;
        const centerId = req.query.centerId;
        const batchId = req.query.batchId;
        const status = req.query.status;
        const paymentStatus = req.query.paymentStatus;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const type = req.query.type;
        const filters = {
            centerId,
            batchId,
            status,
            paymentStatus,
            startDate,
            endDate,
            type: type || 'all',
        };
        let buffer;
        let contentType;
        let filename;
        switch (format) {
            case 'excel':
                buffer = await bookingExportService.exportToExcel(req.user.id, filters);
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                filename = `academy-bookings-${Date.now()}.xlsx`;
                break;
            case 'csv':
                buffer = await bookingExportService.exportToCSV(req.user.id, filters);
                contentType = 'text/csv';
                filename = `academy-bookings-${Date.now()}.csv`;
                break;
            case 'pdf':
                buffer = await bookingExportService.exportToPDF(req.user.id, filters);
                contentType = 'application/pdf';
                filename = `academy-bookings-${Date.now()}.pdf`;
                break;
            default:
                throw new ApiError_1.ApiError(400, 'Invalid format. Must be one of: excel, csv, pdf');
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (typeof buffer === 'string') {
            res.setHeader('Content-Length', Buffer.byteLength(buffer).toString());
            res.send(buffer);
        }
        else {
            res.setHeader('Content-Length', buffer.length.toString());
            res.send(buffer);
        }
    }
    catch (error) {
        next(error);
    }
};
exports.exportBookings = exportBookings;
//# sourceMappingURL=booking.controller.js.map