import { z } from 'zod';
export declare const userTransactionListSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        status: z.ZodOptional<z.ZodEnum<{
            success: "success";
            pending: "pending";
            failed: "failed";
            processing: "processing";
            refunded: "refunded";
            cancelled: "cancelled";
        }>>;
        type: z.ZodOptional<z.ZodEnum<{
            payment: "payment";
            refund: "refund";
            partial_refund: "partial_refund";
        }>>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserTransactionListInput = z.infer<typeof userTransactionListSchema>['query'];
export declare const getUserTransactionByIdSchema: z.ZodObject<{
    params: z.ZodObject<{
        transactionId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type GetUserTransactionByIdInput = z.infer<typeof getUserTransactionByIdSchema>['params'];
//# sourceMappingURL=transaction.validation.d.ts.map