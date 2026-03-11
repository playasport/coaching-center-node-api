"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSportSchema = exports.createSportSchema = void 0;
const zod_1 = require("zod");
exports.createSportSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({ message: 'Sport name is required' })
            .min(1, 'Sport name must be at least 1 character')
            .max(100, 'Sport name must not exceed 100 characters')
            .trim(),
        logo: zod_1.z
            .union([zod_1.z.string().url('Invalid logo URL'), zod_1.z.string().length(0)]) // Allow empty string for multipart
            .optional()
            .nullable()
            .transform((val) => (val === '' ? undefined : val)), // Convert empty string to undefined
        is_active: zod_1.z
            .union([
            zod_1.z.boolean(),
            zod_1.z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
        ])
            .optional()
            .default(true),
        is_popular: zod_1.z
            .union([
            zod_1.z.boolean(),
            zod_1.z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
        ])
            .optional()
            .default(false),
    }),
});
exports.updateSportSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string()
            .min(1, 'Sport name must be at least 1 character')
            .max(100, 'Sport name must not exceed 100 characters')
            .trim()
            .optional(),
        logo: zod_1.z
            .union([zod_1.z.string().url('Invalid logo URL'), zod_1.z.string().length(0)]) // Allow empty string for multipart
            .optional()
            .nullable()
            .transform((val) => (val === '' ? undefined : val)), // Convert empty string to undefined
        is_active: zod_1.z
            .union([
            zod_1.z.boolean(),
            zod_1.z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
        ])
            .optional(),
        is_popular: zod_1.z
            .union([
            zod_1.z.boolean(),
            zod_1.z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
        ])
            .optional(),
    }),
});
//# sourceMappingURL=sport.validation.js.map