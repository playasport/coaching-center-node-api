"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeUpdateSchema = exports.employeeCreateSchema = void 0;
const zod_1 = require("zod");
// Certification schema
const certificationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Certification name is required').max(100, 'Certification name must be less than 100 characters'),
    fileUrl: zod_1.z.string().url('Certification file URL must be a valid URL'),
});
// Employee create schema
exports.employeeCreateSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        userId: zod_1.z.string().optional(), // Optional - automatically set from logged-in user, any provided value will be ignored
        fullName: zod_1.z
            .string()
            .min(1, 'Full name is required')
            .max(100, 'Full name must be less than 100 characters')
            .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, 'Full name must contain only letters and spaces (no numbers or special characters)'),
        role: zod_1.z.string().min(1, 'Role is required'),
        mobileNo: zod_1.z
            .string()
            .min(1, 'Mobile number is required')
            .regex(/^\d+$/, 'Mobile number must contain only digits')
            .min(10, 'Mobile number must be at least 10 digits')
            .max(15, 'Mobile number must be less than 15 digits'),
        email: zod_1.z.string().email('Please provide a valid email address').optional().nullable(),
        sport: zod_1.z.string().optional().nullable(),
        center: zod_1.z.string().optional().nullable(),
        experience: zod_1.z.number().min(0, 'Experience cannot be negative').optional().nullable(),
        workingHours: zod_1.z.string().min(1, 'Working hours is required').max(50, 'Working hours must be less than 50 characters'),
        extraHours: zod_1.z.string().max(50, 'Extra hours must be less than 50 characters').optional().nullable(),
        certification: zod_1.z.array(certificationSchema).optional().nullable(),
        salary: zod_1.z.number().min(0, 'Salary cannot be negative').optional().nullable(),
    })
        .refine((data) => {
        // Validate mobile number format (Indian format: 10 digits starting with 6-9)
        if (data.mobileNo && !/^[6-9]\d{9}$/.test(data.mobileNo)) {
            return false;
        }
        return true;
    }, {
        message: 'Mobile number must be a valid 10-digit Indian mobile number',
        path: ['mobileNo'],
    }),
});
// Employee update schema - all fields optional
exports.employeeUpdateSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        fullName: zod_1.z
            .string()
            .min(1, 'Full name is required')
            .max(100, 'Full name must be less than 100 characters')
            .regex(/^[a-zA-Z\s\u00C0-\u017F]+$/, 'Full name must contain only letters and spaces (no numbers or special characters)')
            .optional(),
        role: zod_1.z.string().min(1, 'Role is required').optional(),
        mobileNo: zod_1.z
            .string()
            .min(1, 'Mobile number is required')
            .regex(/^\d+$/, 'Mobile number must contain only digits')
            .min(10, 'Mobile number must be at least 10 digits')
            .max(15, 'Mobile number must be less than 15 digits')
            .optional(),
        email: zod_1.z.string().email('Please provide a valid email address').optional().nullable(),
        sport: zod_1.z.string().optional().nullable(),
        center: zod_1.z.string().optional().nullable(),
        experience: zod_1.z.number().min(0, 'Experience cannot be negative').optional().nullable(),
        workingHours: zod_1.z.string().min(1, 'Working hours is required').max(50, 'Working hours must be less than 50 characters').optional(),
        extraHours: zod_1.z.string().max(50, 'Extra hours must be less than 50 characters').optional().nullable(),
        certification: zod_1.z.array(certificationSchema).optional().nullable(),
        salary: zod_1.z.number().min(0, 'Salary cannot be negative').optional().nullable(),
    })
        .refine((data) => {
        // At least one field should be provided for update
        if (Object.keys(data).length === 0) {
            return false;
        }
        return true;
    }, {
        message: 'At least one field is required for update',
        path: [],
    })
        .refine((data) => {
        // Validate mobile number format if provided
        if (data.mobileNo && !/^[6-9]\d{9}$/.test(data.mobileNo)) {
            return false;
        }
        return true;
    }, {
        message: 'Mobile number must be a valid 10-digit Indian mobile number',
        path: ['mobileNo'],
    }),
});
//# sourceMappingURL=employee.validation.js.map