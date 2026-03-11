import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as transactionService from '../services/client/transaction.service';
import type { UserTransactionListInput, GetUserTransactionByIdInput } from '../validations/transaction.validation';
import { TransactionStatus, TransactionType } from '../models/transaction.model';

export const getUserTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const queryParams = req.query as unknown as UserTransactionListInput;
    const params: transactionService.GetUserTransactionsParams = {
      page: queryParams.page,
      limit: queryParams.limit,
      status: queryParams.status as TransactionStatus | undefined,
      type: queryParams.type as TransactionType | undefined,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      sortOrder: queryParams.sortOrder,
    };

    const result = await transactionService.getUserTransactions(req.user.id, params);

    const response = new ApiResponse(200, result, 'Transactions retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const { transactionId } = req.params as unknown as GetUserTransactionByIdInput;
    const transaction = await transactionService.getUserTransactionById(transactionId, req.user.id);

    const response = new ApiResponse(200, { transaction }, 'Transaction retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
