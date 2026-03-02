"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRefreshTokenSchema = exports.adminChangePasswordSchema = exports.adminUpdateProfileSchema = exports.adminLoginSchema = void 0;
const zod_1 = require("zod");
const validationMessages_1 = require("../utils/validationMessages");
const passwordComplexitySchema = zod_1.z
    .string({ message: validationMessages_1.validationMessages.password.required() })
    .min(8, validationMessages_1.validationMessages.password.minLength())
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, validationMessages_1.validationMessages.password.invalidPattern());
exports.adminLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.adminUpdateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First name is required').max(100).optional(),
        lastName: zod_1.z.string().max(100).optional(),
        mobile: zod_1.z
            .string()
            .regex(/^[6-9]\d{9}$/, validationMessages_1.validationMessages.mobileNumber.invalidPattern())
            .optional(),
    }),
});
exports.adminChangePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: passwordComplexitySchema,
    }),
});
exports.adminRefreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
});
//# sourceMappingURL=adminAuth.validation.js.map