import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as academyBookingService from '../../services/academy/booking.service';
import * as bookingExportService from '../../services/academy/bookingExport.service';
import { BookingStatus, PaymentStatus } from '../../models/booking.model';

/**
 * Get bookings for academy
 */
export const getBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const centerId = req.query.centerId as string | undefined;
    const batchId = req.query.batchId as string | undefined;
    const status = req.query.status as BookingStatus | undefined;
    const paymentStatus = req.query.paymentStatus as string | undefined;

    const result = await academyBookingService.getAcademyBookings(req.user.id, {
      page,
      limit,
      centerId,
      batchId,
      status,
      paymentStatus: paymentStatus as any,
    });

    const response = new ApiResponse(200, result, 'Bookings retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { id } = req.params;
    const booking = await academyBookingService.getAcademyBookingById(id, req.user.id);

    const response = new ApiResponse(200, booking, 'Booking retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve booking request
 */
export const approveBookingRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { id } = req.params;
    const booking = await academyBookingService.approveBookingRequest(id, req.user.id);

    const response = new ApiResponse(200, booking, 'Booking request approved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject booking request
 */
export const rejectBookingRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { id } = req.params;
    const { reason } = req.body;
    const booking = await academyBookingService.rejectBookingRequest(id, req.user.id, reason);

    const response = new ApiResponse(200, booking, 'Booking request rejected successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Export bookings for academy
 */
export const exportBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const format = req.query.format as 'excel' | 'csv' | 'pdf';
    const centerId = req.query.centerId as string | undefined;
    const batchId = req.query.batchId as string | undefined;
    const status = req.query.status as BookingStatus | undefined;
    const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const type = req.query.type as 'all' | 'confirmed' | 'pending' | 'cancelled' | 'rejected' | undefined;

    const filters: bookingExportService.AcademyBookingExportFilters = {
      centerId,
      batchId,
      status,
      paymentStatus,
      startDate,
      endDate,
      type: type || 'all',
    };

    let buffer: Buffer | string;
    let contentType: string;
    let filename: string;

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
        throw new ApiError(400, 'Invalid format. Must be one of: excel, csv, pdf');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (typeof buffer === 'string') {
      res.setHeader('Content-Length', Buffer.byteLength(buffer).toString());
      res.send(buffer);
    } else {
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    }
  } catch (error) {
    next(error);
  }
};
