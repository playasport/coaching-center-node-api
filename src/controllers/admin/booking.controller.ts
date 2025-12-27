import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminBookingService from '../../services/admin/booking.service';
import { BookingStatus, PaymentStatus } from '../../models/booking.model';

/**
 * Get all bookings for admin
 */
export const getAllBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { userId, centerId, batchId, status, paymentStatus, search, sortBy, sortOrder } = req.query;

    const params: adminBookingService.GetAdminBookingsParams = {
      page,
      limit,
      userId: userId as string,
      centerId: centerId as string,
      batchId: batchId as string,
      status: status as BookingStatus,
      paymentStatus: paymentStatus as PaymentStatus,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminBookingService.getAllBookings(params);

    const response = new ApiResponse(200, result, 'Bookings retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by ID for admin
 */
export const getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await adminBookingService.getBookingById(id);

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    const response = new ApiResponse(200, { booking }, 'Booking retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking status by admin
 */
export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(BookingStatus).includes(status)) {
      throw new ApiError(400, 'Invalid booking status');
    }

    const booking = await adminBookingService.updateBookingStatus(id, status);

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    const response = new ApiResponse(200, { booking }, 'Booking status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete booking by admin
 */
export const deleteBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await adminBookingService.deleteBooking(id);

    const response = new ApiResponse(200, null, 'Booking deleted successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking statistics for admin dashboard
 */
export const getBookingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const params = {
      startDate: startDate as string,
      endDate: endDate as string,
    };

    const stats = await adminBookingService.getBookingStats(params);

    const response = new ApiResponse(200, { stats }, 'Booking statistics retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Download booking invoice as PDF
 */
export const downloadBookingInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const invoiceService = await import('../../services/admin/invoice.service');
    const pdfBuffer = await invoiceService.generateBookingInvoice(id);

    // Set response headers for PDF download
    const bookingId = id;
    const fileName = `invoice-${bookingId}-${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
