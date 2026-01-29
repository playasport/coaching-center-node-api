import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as bookingService from '../services/client/booking.service';
import type { BookingSummaryInput, VerifyPaymentInput, UserBookingListInput, DeleteOrderInput, BookSlotInput, CreatePaymentOrderInput, CancelBookingInput, GetBookingDetailsInput } from '../validations/booking.validation';
import { BookingStatus, PaymentStatus } from '../models/booking.model';

/**
 * Get booking summary
 */
export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.query as unknown as BookingSummaryInput;
    const summary = await bookingService.getBookingSummary(data, req.user.id);

    const response = new ApiResponse(200, summary, 'Booking summary retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay payment
 */
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as VerifyPaymentInput;
    const booking = await bookingService.verifyPayment(data, req.user.id);

    const response = new ApiResponse(
      200,
      booking,
      'Payment verified successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user bookings list
 */
export const getUserBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const queryParams = req.query as unknown as UserBookingListInput;
    const params = {
      page: queryParams.page,
      limit: queryParams.limit,
      status: queryParams.status ? (queryParams.status as BookingStatus) : undefined,
      paymentStatus: queryParams.paymentStatus ? (queryParams.paymentStatus as PaymentStatus) : undefined,
    };
    const result = await bookingService.getUserBookings(req.user.id, params);

    const response = new ApiResponse(200, result, 'User bookings retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/Cancel order
 */
export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as DeleteOrderInput;
    const booking = await bookingService.deleteOrder(data, req.user.id);

    const response = new ApiResponse(
      200,
      { booking },
      'Order cancelled successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Book slot - Create booking request (new flow)
 */
export const bookSlot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as BookSlotInput;
    const booking = await bookingService.bookSlot(data, req.user.id);

    const response = new ApiResponse(
      201,
      booking,
      'Booking request created successfully'
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create payment order after academy approval
 */
export const createPaymentOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { bookingId } = req.params as CreatePaymentOrderInput;
    const result = await bookingService.createPaymentOrder(bookingId, req.user.id);

    const response = new ApiResponse(
      201,
      {
        booking: result.booking,
        razorpayOrder: result.razorpayOrder,
      },
      'Payment order created successfully'
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel booking by user with reason
 */
export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { bookingId } = req.params;
    const { reason } = req.body as CancelBookingInput['body'];
    const booking = await bookingService.cancelBooking(bookingId, reason, req.user.id);

    const response = new ApiResponse(
      200,
      booking,
      'Booking cancelled successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get booking details by ID
 */
export const getBookingDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.params as unknown as GetBookingDetailsInput;
    const booking = await bookingService.getBookingDetails(data.bookingId, req.user.id);

    const response = new ApiResponse(200, booking, 'Booking details retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Download booking invoice as PDF
 */
export const downloadInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.params as unknown as GetBookingDetailsInput;
    const pdfBuffer = await bookingService.downloadBookingInvoice(data.bookingId, req.user.id);

    // Set response headers for PDF download
    const fileName = `invoice-${data.bookingId}-${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

