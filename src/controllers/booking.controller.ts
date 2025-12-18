import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as bookingService from '../services/client/booking.service';
import type { BookingSummaryInput, CreateOrderInput, VerifyPaymentInput, UserBookingListInput, DeleteOrderInput } from '../validations/booking.validation';
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

    const response = new ApiResponse(200, { ...summary }, 'Booking summary retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create Razorpay order
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as CreateOrderInput;
    const result = await bookingService.createOrder(data, req.user.id);

    const response = new ApiResponse(
      201,
      {
        booking: result.booking,
        razorpayOrder: {
          id: result.razorpayOrder.id,
          amount: result.razorpayOrder.amount,
          currency: result.razorpayOrder.currency,
          receipt: result.razorpayOrder.receipt,
          status: result.razorpayOrder.status,
          created_at: result.razorpayOrder.created_at,
        },
      },
      'Order created successfully'
    );
    res.status(201).json(response);
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
      { ...booking },
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

