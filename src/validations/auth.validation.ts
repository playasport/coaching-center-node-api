import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required())
      .min(6, validationMessages.password.minLength()),
    coachingName: z
      .string({ message: validationMessages.coachingName.required() })
      .min(1, validationMessages.coachingName.required()),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    mobileNumber: z.string().optional(),
    contactEmail: z
      .union([
        z.string().email(validationMessages.contactEmail.invalid()),
        z.literal(''),
      ])
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    contactNumber: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required()),
  }),
});

export const academyRegisterSchema = z.object({
  body: z.object({
    firstName: z
      .string({ message: validationMessages.firstName.required() })
      .min(1, validationMessages.firstName.required()),
    lastName: z.string().optional(),
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required())
      .min(6, validationMessages.password.minLength()),
    mobile: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
});

export const academyLoginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required()),
  }),
});

export const academyOtpSchema = z.object({
  body: z.object({
    mobile: z
      .string({ message: validationMessages.mobileNumber.required() })
      .min(8, validationMessages.mobileNumber.mustBeString()),
    mode: z.enum(['login', 'register']).optional(),
  }),
});

export const academyVerifyOtpSchema = z.object({
  body: z.object({
    mobile: z
      .string({ message: validationMessages.mobileNumber.required() })
      .min(8, validationMessages.mobileNumber.mustBeString()),
    otp: z
      .string({ message: validationMessages.password.required() })
      .length(6, validationMessages.password.required()),
    mode: z.enum(['login', 'register']).optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

