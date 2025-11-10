import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

const mobileNumberSchema = z
  .string({ message: validationMessages.mobileNumber.required() })
  .min(10, validationMessages.mobileNumber.minLength())
  .regex(/^[6-9]\d{9}$/, validationMessages.mobileNumber.invalidPattern());

const otpCodeSchema = z
  .string({ message: validationMessages.password.required() })
  .length(6, validationMessages.password.required());

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
      .min(1, validationMessages.firstName.required())
      .regex(/^[A-Z][a-zA-Z\s]*$/, validationMessages.firstName.invalidFormat()),
    lastName: z
      .union([
        z
          .string({ message: validationMessages.lastName.invalidFormat() })
          .regex(/^[A-Z][a-zA-Z\s]*$/, validationMessages.lastName.invalidFormat()),
        z.literal(''),
      ])
      .optional()
      .transform((val) => (val ? val : undefined)),
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(6, validationMessages.password.minLength())
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
        validationMessages.password.invalidPattern()
      ),
    mobile: mobileNumberSchema,
    gender: z.enum(['male', 'female', 'other']).optional(),
    isVerified: z
      .boolean({ message: validationMessages.isVerified.required() })
      .refine((value) => value === true, {
        message: validationMessages.isVerified.mustBeTrue(),
      }),
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
    mobile: mobileNumberSchema,
    mode: z.enum(['login', 'register']).optional(),
  }),
});

export const academyVerifyOtpSchema = z.object({
  body: z.object({
    mobile: mobileNumberSchema,
    otp: otpCodeSchema,
    mode: z.enum(['login', 'register']).optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type AcademyRegisterInput = z.infer<typeof academyRegisterSchema>['body'];
export type AcademyLoginInput = z.infer<typeof academyLoginSchema>['body'];

