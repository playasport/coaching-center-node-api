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
exports.downloadBookingInvoice = exports.getBookingStats = exports.deleteBooking = exports.updateBookingStatus = exports.getBookingById = exports.getAllBookings = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const adminBookingService = __importStar(require("../../services/admin/booking.service"));
const booking_model_1 = require("../../models/booking.model");
/**
 * Get all bookings for admin
 */
const getAllBookings = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { userId, centerId, batchId, status, paymentStatus, search, sortBy, sortOrder } = req.query;
        const params = {
            page,
            limit,
            userId: userId,
            centerId: centerId,
            batchId: batchId,
            status: status,
            paymentStatus: paymentStatus,
            search: search,
            sortBy: sortBy,
            sortOrder: sortOrder,
        };
        const result = await adminBookingService.getAllBookings(params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'Bookings retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBookings = getAllBookings;
/**
 * Get booking by ID for admin
 */
const getBookingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await adminBookingService.getBookingById(id);
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { booking }, 'Booking retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingById = getBookingById;
/**
 * Update booking status by admin
 */
const updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !Object.values(booking_model_1.BookingStatus).includes(status)) {
            throw new ApiError_1.ApiError(400, 'Invalid booking status');
        }
        const booking = await adminBookingService.updateBookingStatus(id, status);
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const response = new ApiResponse_1.ApiResponse(200, { booking }, 'Booking status updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBookingStatus = updateBookingStatus;
/**
 * Delete booking by admin
 */
const deleteBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminBookingService.deleteBooking(id);
        const response = new ApiResponse_1.ApiResponse(200, null, 'Booking deleted successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBooking = deleteBooking;
/**
 * Get booking statistics for admin dashboard
 */
const getBookingStats = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const params = {
            startDate: startDate,
            endDate: endDate,
        };
        const stats = await adminBookingService.getBookingStats(params);
        const response = new ApiResponse_1.ApiResponse(200, { stats }, 'Booking statistics retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingStats = getBookingStats;
/**
 * Download booking invoice as PDF
 */
const downloadBookingInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const invoiceService = await Promise.resolve().then(() => __importStar(require('../../services/admin/invoice.service')));
        const pdfBuffer = await invoiceService.generateBookingInvoice(id);
        // Set response headers for PDF download
        const bookingId = id;
        const fileName = `invoice-${bookingId}-${Date.now()}.pdf`;
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
exports.downloadBookingInvoice = downloadBookingInvoice;
//# sourceMappingURL=booking.controller.js.map