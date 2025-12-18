import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

const passwordComplexitySchema = z
  .string({ message: validationMessages.password.required() })
  .min(8, validationMessages.password.minLength())
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    validationMessages.password.invalidPattern()
  );

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const adminUpdateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(100).optional(),
    lastName: z.string().max(100).optional(),
    mobile: z
      .string()
      .regex(/^[6-9]\d{9}$/, validationMessages.mobileNumber.invalidPattern())
      .optional(),
  }),
});

export const adminChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordComplexitySchema,
  }),
});

export const adminRefreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>['body'];
export type AdminUpdateProfileInput = z.infer<typeof adminUpdateProfileSchema>['body'];
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>['body'];
export type AdminRefreshTokenInput = z.infer<typeof adminRefreshTokenSchema>['body'];
