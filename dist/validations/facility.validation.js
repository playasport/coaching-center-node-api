"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFacilitiesQuerySchema = exports.updateFacilitySchema = exports.createFacilitySchema = void 0;
const zod_1 = require("zod");
/**
 * Create facility validation schema
 */
exports.createFacilitySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
        description: zod_1.z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
        icon: zod_1.z.string().url('Invalid icon URL').nullable().optional(),
        is_active: zod_1.z.boolean().optional(),
    }),
});
/**
 * Update facility validation schema
 */
exports.updateFacilitySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
        description: zod_1.z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
        icon: zod_1.z.string().url('Invalid icon URL').nullable().optional(),
        is_active: zod_1.z.boolean().optional(),
    }),
});
/**
 * Get facilities query validation schema
 */
exports.getFacilitiesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        search: zod_1.z.string().optional(),
        isActive: zod_1.z
            .string()
            .transform((val) => val === 'true')
            .optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
//# sourceMappingURL=facility.validation.js.map