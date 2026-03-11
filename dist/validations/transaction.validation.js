"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTransactionByIdSchema = exports.userTransactionListSchema = void 0;
const zod_1 = require("zod");
exports.userTransactionListSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        status: zod_1.z
            .enum(['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'])
            .optional(),
        type: zod_1.z.enum(['payment', 'refund', 'partial_refund']).optional(),
        startDate: zod_1.z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
            .optional(),
        endDate: zod_1.z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
            .optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
exports.getUserTransactionByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        transactionId: zod_1.z.string().min(1, 'Transaction ID is required'),
    }),
});
//# sourceMappingURL=transaction.validation.js.map