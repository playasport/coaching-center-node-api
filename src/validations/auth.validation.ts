import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

const mobileNumberSchema = z
  .string({ message: validationMessages.mobileNumber.required() })
  .min(10, validationMessages.mobileNumber.minLength())
  .regex(/^[6-9]\d{9}$/, validationMessages.mobileNumber.invalidPattern());

const otpCodeSchema = z
  .string({ message: validationMessages.otp.required() })
  .length(6, validationMessages.otp.length());

const passwordComplexitySchema = z
  .string({ message: validationMessages.password.required() })
  .min(6, validationMessages.password.minLength())
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
    validationMessages.password.invalidPattern()
  );

const nameRegex = /^[A-Z][a-zA-Z\s]*$/;

const addressInputSchema = z.object({
  line1: z
    .string({ message: validationMessages.address.line1Required() })
    .min(1, validationMessages.address.line1Required()),
  line2: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  area: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  city: z
    .string({ message: validationMessages.address.cityRequired() })
    .min(1, validationMessages.address.cityRequired()),
  state: z
    .string({ message: validationMessages.address.stateRequired() })
    .min(1, validationMessages.address.stateRequired()),
  country: z
    .string({ message: validationMessages.address.countryRequired() })
    .min(1, validationMessages.address.countryRequired()),
  pincode: z
    .string({ message: validationMessages.address.pincodeRequired() })
    .regex(/^\d{6}$/, validationMessages.address.pincodeInvalid()),
});

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
    password: passwordComplexitySchema,
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
    mode: z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
  }),
});

export const academyVerifyOtpSchema = z.object({
  body: z.object({
    mobile: mobileNumberSchema,
    otp: otpCodeSchema,
    mode: z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
  }),
});

const forgotPasswordRequestBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('mobile'),
    mobile: mobileNumberSchema,
  }),
  z.object({
    mode: z.literal('email'),
    email: z
      .string({ message: validationMessages.email.required() })
      .email(validationMessages.email.invalid()),
  }),
]);

const forgotPasswordVerifyBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('mobile'),
    mobile: mobileNumberSchema,
    otp: otpCodeSchema,
    newPassword: passwordComplexitySchema,
  }),
  z.object({
    mode: z.literal('email'),
    email: z
      .string({ message: validationMessages.email.required() })
      .email(validationMessages.email.invalid()),
    otp: otpCodeSchema,
    newPassword: passwordComplexitySchema,
  }),
]);

export const academyForgotPasswordRequestSchema = z.object({
  body: forgotPasswordRequestBodySchema,
});

export const academyForgotPasswordVerifySchema = z.object({
  body: forgotPasswordVerifyBodySchema,
});

export const academyProfileUpdateSchema = z.object({
  body: z
    .object({
      firstName: z
        .string({ message: validationMessages.firstName.required() })
        .regex(nameRegex, validationMessages.firstName.invalidFormat())
        .optional(),
      lastName: z
        .union([
          z
            .string({ message: validationMessages.lastName.invalidFormat() })
            .regex(nameRegex, validationMessages.lastName.invalidFormat()),
          z.literal(''),
        ])
        .optional()
        .transform((val) => (val ? val : undefined)),
      email: z
        .string({ message: validationMessages.email.required() })
        .email(validationMessages.email.invalid())
        .optional(),
      mobile: mobileNumberSchema.optional(),
      mobileOtp: otpCodeSchema.optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      address: addressInputSchema.optional(),
    })
    .refine(
      (data) =>
        Boolean(
          data.firstName ??
            data.lastName ??
            data.email ??
            data.mobile ??
            data.gender ??
            data.address
        ),
      {
        message: validationMessages.profile.noChanges(),
        path: ['body'],
      }
    )
    .refine((data) => (data.mobile ? Boolean(data.mobileOtp) : true), {
      message: validationMessages.otp.required(),
      path: ['mobileOtp'],
    }),
});

export const academyPasswordChangeSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ message: validationMessages.password.required() })
        .min(6, validationMessages.password.minLength()),
      newPassword: passwordComplexitySchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: validationMessages.password.sameAsCurrent(),
      path: ['newPassword'],
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type AcademyRegisterInput = z.infer<typeof academyRegisterSchema>['body'];
export type AcademyLoginInput = z.infer<typeof academyLoginSchema>['body'];
export type AcademyProfileUpdateInput = z.infer<typeof academyProfileUpdateSchema>['body'];
export type AcademyPasswordChangeInput = z.infer<
  typeof academyPasswordChangeSchema
>['body'];
export type AcademyForgotPasswordRequestInput = z.infer<
  typeof academyForgotPasswordRequestSchema
>['body'];
export type AcademyForgotPasswordVerifyInput = z.infer<
  typeof academyForgotPasswordVerifySchema
>['body'];

