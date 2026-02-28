import { z } from 'zod';

export const userTransactionListSchema = z.object({
  query: z.object({
    page: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    status: z
      .enum(['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'])
      .optional(),
    type: z.enum(['payment', 'refund', 'partial_refund']).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type UserTransactionListInput = z.infer<typeof userTransactionListSchema>['query'];

export const getUserTransactionByIdSchema = z.object({
  params: z.object({
    transactionId: z.string().min(1, 'Transaction ID is required'),
  }),
});

export type GetUserTransactionByIdInput = z.infer<typeof getUserTransactionByIdSchema>['params'];
