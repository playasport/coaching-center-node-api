import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminTransactionService from '../../services/admin/transaction.service';
import { TransactionStatus } from '../../models/transaction.model';

/**
 * Get all transactions for admin
 */
export const getAllTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { 
      userId, 
      bookingId, 
      status, 
      type, 
      source, 
      search, 
      startDate, 
      endDate,
      sortBy, 
      sortOrder 
    } = req.query;

    const params: adminTransactionService.GetAdminTransactionsParams = {
      page,
      limit,
      userId: userId as string,
      bookingId: bookingId as string,
      status: status as TransactionStatus,
      type: type as any,
      source: source as any,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await adminTransactionService.getAllTransactions(params);

    const response = new ApiResponse(200, result, 'Transactions retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction by ID for admin
 */
export const getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const transaction = await adminTransactionService.getTransactionById(id);

    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    const response = new ApiResponse(200, { transaction }, 'Transaction retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction status by admin
 */
export const updateTransactionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !Object.values(TransactionStatus).includes(status)) {
      throw new ApiError(400, 'Invalid transaction status');
    }

    const adminId = req.user?.id;
    const transaction = await adminTransactionService.updateTransactionStatus(id, status, adminId, notes);

    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    const response = new ApiResponse(200, { transaction }, 'Transaction status updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction statistics for admin dashboard
 */
export const getTransactionStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const params = {
      startDate: startDate as string,
      endDate: endDate as string,
    };

    const stats = await adminTransactionService.getTransactionStats(params);

    const response = new ApiResponse(200, { stats }, 'Transaction statistics retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

