import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import * as adminTransactionService from '../../services/admin/transaction.service';
import * as transactionExportService from '../../services/admin/transactionExport.service';
import { TransactionStatus, TransactionType, TransactionSource } from '../../models/transaction.model';

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

/**
 * Export transactions
 */
export const exportTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const format = req.query.format as 'excel' | 'csv' | 'pdf';
    const { 
      userId, 
      bookingId, 
      status, 
      type, 
      source, 
      search, 
      startDate, 
      endDate 
    } = req.query;

    if (!format || !['excel', 'csv', 'pdf'].includes(format)) {
      throw new ApiError(400, 'Invalid format. Must be one of: excel, csv, pdf');
    }

    const filters: transactionExportService.TransactionExportFilters = {
      userId: userId as string,
      bookingId: bookingId as string,
      status: status as TransactionStatus,
      type: type as TransactionType,
      source: source as TransactionSource,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    };

    let buffer: Buffer | string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'excel':
        buffer = await transactionExportService.exportToExcel(filters);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `transactions-${Date.now()}.xlsx`;
        break;
      case 'csv':
        buffer = await transactionExportService.exportToCSV(filters);
        contentType = 'text/csv';
        filename = `transactions-${Date.now()}.csv`;
        break;
      case 'pdf':
        buffer = await transactionExportService.exportToPDF(filters);
        contentType = 'application/pdf';
        filename = `transactions-${Date.now()}.pdf`;
        break;
      default:
        throw new ApiError(400, 'Invalid format. Must be one of: excel, csv, pdf');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (Buffer.isBuffer(buffer)) {
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    } else {
      res.setHeader('Content-Length', Buffer.byteLength(buffer).toString());
      res.send(buffer);
    }
  } catch (error) {
    next(error);
  }
};

