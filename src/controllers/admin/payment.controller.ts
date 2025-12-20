import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminPaymentService from '../../services/admin/payment.service';
import { TransactionStatus } from '../../models/transaction.model';

/**
 * Get all payments for admin
 */
export const getAllPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { 
      userId, 
      bookingId, 
      status, 
      paymentMethod, 
      search, 
      startDate, 
      endDate,
      sortBy, 
      sortOrder 
    } = req.query;

    const params: adminPaymentService.GetAdminPaymentsParams = {
      page,
      limit,
      userId: userId as string,
      bookingId: bookingId as string,
      status: status as TransactionStatus,
      paymentMethod: paymentMethod as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminPaymentService.getAllPayments(params);

    const response = new ApiResponse(200, result, 'Payments retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment status by admin
 */
export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !Object.values(TransactionStatus).includes(status)) {
      throw new ApiError(400, 'Invalid payment status');
    }

    const adminId = req.user?.id;
    const payment = await adminPaymentService.updatePaymentStatus(id, status, adminId, notes);

    const response = new ApiResponse(200, { payment }, 'Payment status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment statistics for admin dashboard
 */
export const getPaymentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const params = {
      startDate: startDate as string,
      endDate: endDate as string,
    };

    const stats = await adminPaymentService.getPaymentStats(params);

    const response = new ApiResponse(200, { stats }, 'Payment statistics retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

