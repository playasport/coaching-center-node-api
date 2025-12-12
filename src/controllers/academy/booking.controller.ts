import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as bookingService from '../../services/booking.service';
import { BookingStatus } from '../../models/booking.model';

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

    const result = await bookingService.getAcademyBookings(req.user.id, {
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
    const booking = await bookingService.getAcademyBookingById(id, req.user.id);

    const response = new ApiResponse(200, { booking }, 'Booking retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(BookingStatus).includes(status)) {
      throw new ApiError(400, 'Invalid booking status');
    }

    const booking = await bookingService.updateAcademyBookingStatus(id, status, req.user.id);

    const response = new ApiResponse(200, { booking }, 'Booking status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
