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
exports.downloadInvoice = exports.getBookingDetails = exports.cancelBooking = exports.createPublicOrder = exports.getPublicPayBooking = exports.createPaymentOrder = exports.bookSlot = exports.deleteOrder = exports.getUserBookings = exports.verifyPayment = exports.getSummary = void 0;
const ApiResponse_1 = require("../utils/ApiResponse");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const bookingService = __importStar(require("../services/client/booking.service"));
/**
 * Get booking summary
 */
const getSummary = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.query;
        const summary = await bookingService.getBookingSummary(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, summary, 'Booking summary retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getSummary = getSummary;
/**
 * Verify Razorpay payment
 */
const verifyPayment = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        const booking = await bookingService.verifyPayment(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, booking, 'Payment verified successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPayment = verifyPayment;
/**
 * Get user bookings list
 */
const getUserBookings = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const queryParams = req.query;
        const params = {
            page: queryParams.page,
            limit: queryParams.limit,
            status: queryParams.status ? queryParams.status : undefined,
            paymentStatus: queryParams.paymentStatus ? queryParams.paymentStatus : undefined,
        };
        const result = await bookingService.getUserBookings(req.user.id, params);
        const response = new ApiResponse_1.ApiResponse(200, result, 'User bookings retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserBookings = getUserBookings;
/**
 * Delete/Cancel order
 */
const deleteOrder = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        const booking = await bookingService.deleteOrder(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, { booking }, 'Order cancelled successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteOrder = deleteOrder;
/**
 * Book slot - Create booking request (new flow)
 */
const bookSlot = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.body;
        const booking = await bookingService.bookSlot(data, req.user.id);
        const response = new ApiResponse_1.ApiResponse(201, booking, 'Booking request created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.bookSlot = bookSlot;
/**
 * Create payment order after academy approval
 */
const createPaymentOrder = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { bookingId } = req.params;
        const result = await bookingService.createPaymentOrder(bookingId, req.user.id);
        const response = new ApiResponse_1.ApiResponse(201, {
            booking: result.booking,
            razorpayOrder: result.razorpayOrder,
        }, 'Payment order created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createPaymentOrder = createPaymentOrder;
/**
 * Get booking by payment token (public, no auth). For pay page: shows details and payment_enabled / status.
 */
const getPublicPayBooking = async (req, res, next) => {
    try {
        const { token } = req.query;
        const data = await bookingService.getBookingByPaymentToken(token);
        const response = new ApiResponse_1.ApiResponse(200, data, 'Booking details retrieved');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicPayBooking = getPublicPayBooking;
/**
 * Create Razorpay order by payment token (public, no auth). Webhook will verify payment.
 */
const createPublicOrder = async (req, res, next) => {
    try {
        const { token } = req.body;
        const result = await bookingService.createOrderByPaymentToken(token);
        const response = new ApiResponse_1.ApiResponse(201, {
            booking: result.booking,
            razorpayOrder: result.razorpayOrder,
        }, 'Payment order created successfully');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.createPublicOrder = createPublicOrder;
/**
 * Cancel booking by user with reason
 */
const cancelBooking = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const { bookingId } = req.params;
        const { reason } = req.body;
        const booking = await bookingService.cancelBooking(bookingId, reason, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, booking, 'Booking cancelled successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.cancelBooking = cancelBooking;
/**
 * Get booking details by ID
 */
const getBookingDetails = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.params;
        const booking = await bookingService.getBookingDetails(data.bookingId, req.user.id);
        const response = new ApiResponse_1.ApiResponse(200, booking, 'Booking details retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingDetails = getBookingDetails;
/**
 * Download booking invoice as PDF
 */
const downloadInvoice = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            throw new ApiError_1.ApiError(401, (0, i18n_1.t)('auth.authorization.unauthorized'));
        }
        const data = req.params;
        const pdfBuffer = await bookingService.downloadBookingInvoice(data.bookingId, req.user.id);
        // Set response headers for PDF download
        const fileName = `invoice-${data.bookingId}-${Date.now()}.pdf`;
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
exports.downloadInvoice = downloadInvoice;
//# sourceMappingURL=booking.controller.js.map