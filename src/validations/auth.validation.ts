import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';
import { UserModel } from '../models/user.model';
import { DefaultRoles } from '../enums/defaultRoles.enum';
import { t } from '../utils/i18n';

const mobileNumberSchema = z
  .string({ message: validationMessages.mobileNumber.required() })
  .min(10, validationMessages.mobileNumber.minLength())
  .regex(/^[6-9]\d{9}$/, validationMessages.mobileNumber.invalidPattern());

const otpCodeSchema = z
  .string({ message: validationMessages.otp.required() })
  .length(6, validationMessages.otp.length());

const passwordComplexitySchema = z
  .string({ message: validationMessages.password.required() })
  .min(8, validationMessages.password.minLength())
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    validationMessages.password.invalidPattern()
  );

const nameRegex = /^[A-Z][a-zA-Z\s]*$/;

// Device info schema for FCM token registration
const deviceInfoSchema = z.object({
  fcmToken: z.string().min(1, 'FCM token is required').optional(),
  deviceType: z.enum(['web', 'android', 'ios']).optional(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  appVersion: z.string().optional(),
});

const addressInputSchema = z.object({
  line1: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  line2: z
    .string({ message: validationMessages.address.line2Required() })
    .min(1, validationMessages.address.line2Required())
    .max(100),
  area: z
    .string()
    .max(100)
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
    otp: otpCodeSchema,
  })
    .merge(deviceInfoSchema)
    .refine(
      async (data) => {
        // Check if mobile number already exists for a user with 'academy' role
        const existingUser = await UserModel.findOne({ 
          mobile: data.mobile,
          isDeleted: false 
        })
          .populate('roles', 'name')
          .lean();
        
        if (!existingUser) {
          return true; // Mobile doesn't exist, validation passes
        }
        
        // Check if user has 'academy' role
        const roles = existingUser.roles as any[];
        if (roles && roles.length > 0) {
          const hasAcademyRole = roles.some((role: any) => role?.name === DefaultRoles.ACADEMY);
          if (hasAcademyRole) {
            return false; // Mobile exists with 'academy' role, validation fails
          }
        }
        
        return true; // Mobile exists but doesn't have 'academy' role, validation passes
      },
      {
        message: t('auth.register.mobileExists') || 'Mobile number already exists',
        path: ['mobile'],
      }
    ),
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
  }).merge(deviceInfoSchema),
});

export const academySocialLoginSchema = z.object({
  body: z.object({
    provider: z.enum(['google', 'facebook', 'instagram', 'apple']).optional(),
    idToken: z
      .string({ message: 'ID token is required' })
      .min(1, 'ID token is required'),
    firstName: z
      .string()
      .min(1, validationMessages.firstName.required())
      .optional(),
    lastName: z
      .string()
      .optional(),
  }).merge(deviceInfoSchema),
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
  }).merge(deviceInfoSchema),
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
    })
    .refine(
      (data) =>
        Boolean(
          data.firstName ?? data.lastName
        ),
      {
        message: validationMessages.profile.noChanges(),
        path: ['body'],
      }
    ),
});

export const academyAddressUpdateSchema = z.object({
  body: z.object({
    address: addressInputSchema,
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
export type AcademySocialLoginInput = z.infer<typeof academySocialLoginSchema>['body'];
export type AcademyProfileUpdateInput = z.infer<typeof academyProfileUpdateSchema>['body'];
export type AcademyAddressUpdateInput = z.infer<typeof academyAddressUpdateSchema>['body'];
export type AcademyPasswordChangeInput = z.infer<
  typeof academyPasswordChangeSchema
>['body'];
export type AcademyForgotPasswordRequestInput = z.infer<
  typeof academyForgotPasswordRequestSchema
>['body'];
export type AcademyForgotPasswordVerifyInput = z.infer<
  typeof academyForgotPasswordVerifySchema
>['body'];

// User Auth Validation Schemas
export const userRegisterSchema = z.object({
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
    mobile: mobileNumberSchema.optional(),
    type: z.enum(['student', 'guardian'], {
      message: 'Type must be either student or guardian',
    }),
    dob: z
      .string({ message: 'Date of birth is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .refine(
        (date) => {
          const dob = new Date(date);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            return age - 1 >= 3;
          }
          return age >= 3;
        },
        { message: 'Age must be at least 3 years' }
      ),
    gender: z.enum(['male', 'female', 'other'], {
      message: 'Gender must be male, female, or other',
    }),
    otp: otpCodeSchema.optional(),
    tempToken: z.string().min(1, 'Temporary token is required').optional(),
  })
    .merge(deviceInfoSchema)
    .refine(
      async (data) => {
        // Check if email already exists for a user with 'user' role
        const existingUser = await UserModel.findOne({ 
          email: data.email.toLowerCase(),
          isDeleted: false 
        })
          .populate('roles', 'name')
          .lean();
        
        if (!existingUser) {
          return true; // Email doesn't exist, validation passes
        }
        
        // Check if user has 'user' role
        const roles = existingUser.roles as any[];
        if (roles && roles.length > 0) {
          const hasUserRole = roles.some((role: any) => role?.name === DefaultRoles.USER);
          if (hasUserRole) {
            return false; // Email exists with 'user' role, validation fails
          }
        }
        
        return true; // Email exists but doesn't have 'user' role (e.g., academy), validation passes
      },
      {
        message: t('auth.register.emailExists') || 'Email already exists',
        path: ['email'],
      }
    )
    .refine(
      async (data) => {
        // Only validate mobile if it's provided directly (legacy OTP flow), not when using tempToken
        if (data.tempToken || !data.mobile) {
          return true; // Skip validation when using tempToken or mobile not provided
        }
        
        // First check if email user exists (to see if it's the same user)
        const existingUserByEmail = await UserModel.findOne({ 
          email: data.email.toLowerCase(),
          isDeleted: false 
        })
          .populate('roles', 'name')
          .lean();
        
        // Check if mobile number already exists for a user with 'user' role
        const existingUserByMobile = await UserModel.findOne({ 
          mobile: data.mobile,
          isDeleted: false 
        })
          .populate('roles', 'name')
          .lean();
        
        if (!existingUserByMobile) {
          return true; // Mobile doesn't exist, validation passes
        }
        
        // Allow if it's the same user (found by email) - they can update their own mobile
        if (existingUserByEmail && existingUserByEmail.id === existingUserByMobile.id) {
          return true; // Same user, validation passes
        }
        
        // Check if user has 'user' role
        const roles = existingUserByMobile.roles as any[];
        if (roles && roles.length > 0) {
          const hasUserRole = roles.some((role: any) => role?.name === DefaultRoles.USER);
          if (hasUserRole) {
            return false; // Mobile exists with 'user' role for a different user, validation fails
          }
        }
        
        return true; // Mobile exists but doesn't have 'user' role (e.g., academy), validation passes
      },
      {
        message: t('auth.register.mobileExists') || 'Mobile number already exists',
        path: ['mobile'],
      }
    )
    .refine(
      (data) => data.otp || data.tempToken,
      {
        message: 'Either tempToken or otp is required',
        path: ['tempToken'],
      }
    )
    .refine(
      (data) => !(data.tempToken && data.otp),
      {
        message: 'Cannot provide both tempToken and otp. Use tempToken for new registration flow or otp for legacy flow.',
        path: ['otp'],
      }
    )
    .refine(
      (data) => {
        // If using tempToken, mobile is not required (will be extracted from token)
        // If using legacy otp, mobile is required
        if (data.tempToken) {
          return true; // Mobile not needed when using tempToken
        }
        if (data.otp) {
          return !!data.mobile; // Mobile required for legacy otp flow
        }
        return true;
      },
      {
        message: 'Mobile number is required when using OTP (legacy flow)',
        path: ['mobile'],
      }
    )
    .refine(
      (data) => {
        // If type is student, validate minimum age is 13 years
        if (data.type === 'student' && data.dob) {
          const dob = new Date(data.dob);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const dayDiff = today.getDate() - dob.getDate();
          
          // Calculate exact age
          let exactAge = age;
          if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            exactAge = age - 1;
          }
          
          return exactAge >= 13;
        }
        return true; // For guardian type, no additional age validation needed
      },
      {
        message: 'Student must be at least 13 years old',
        path: ['dob'],
      }
    )
    .refine(
      (data) => {
        // If type is guardian, validate minimum age is 18 years
        if (data.type === 'guardian' && data.dob) {
          const dob = new Date(data.dob);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const dayDiff = today.getDate() - dob.getDate();
          
          // Calculate exact age
          let exactAge = age;
          if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            exactAge = age - 1;
          }
          
          return exactAge >= 18;
        }
        return true; // For student type, no additional age validation needed
      },
      {
        message: 'Parent/Guardian must be at least 18 years old',
        path: ['dob'],
      }
    ),
});

export const userLoginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid()),
    password: z
      .string({ message: validationMessages.password.required() })
      .min(1, validationMessages.password.required()),
  }).merge(deviceInfoSchema),
});

export const userSocialLoginSchema = z.object({
  body: z.object({
    provider: z.enum(['google', 'facebook', 'instagram', 'apple']).optional(),
    idToken: z
      .string({ message: 'ID token is required' })
      .min(1, 'ID token is required'),
    firstName: z
      .string()
      .min(1, validationMessages.firstName.required())
      .optional(),
    lastName: z
      .string()
      .optional(),
    type: z.enum(['student', 'guardian']).optional(),
  }).merge(deviceInfoSchema),
});

export const userOtpSchema = z.object({
  body: z.object({
    mobile: mobileNumberSchema,
    mode: z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
  }),
});

export const userVerifyOtpSchema = z.object({
  body: z.object({
    mobile: mobileNumberSchema,
    otp: otpCodeSchema,
    mode: z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
  }).merge(deviceInfoSchema),
});

export const userForgotPasswordRequestSchema = z.object({
  body: forgotPasswordRequestBodySchema,
});

export const userForgotPasswordVerifySchema = z.object({
  body: forgotPasswordVerifyBodySchema,
});

export const userProfileUpdateSchema = z.object({
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
        .string()
        .email(validationMessages.email.invalid())
        .optional(),
      dob: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
        .optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
    })
    .refine(
      (data) =>
        Boolean(
          data.firstName ?? data.lastName ?? data.email ?? data.dob ?? data.gender
        ),
      {
        message: validationMessages.profile.noChanges(),
        path: ['body'],
      }
    ),
});

export const userAddressUpdateSchema = z.object({
  body: z.object({
    address: addressInputSchema,
  }),
});

export const userPasswordChangeSchema = z.object({
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

export type UserRegisterInput = z.infer<typeof userRegisterSchema>['body'];
export type UserLoginInput = z.infer<typeof userLoginSchema>['body'];
export type UserSocialLoginInput = z.infer<typeof userSocialLoginSchema>['body'];
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>['body'];
export type UserAddressUpdateInput = z.infer<typeof userAddressUpdateSchema>['body'];
export type UserPasswordChangeInput = z.infer<
  typeof userPasswordChangeSchema
>['body'];
export type UserForgotPasswordRequestInput = z.infer<
  typeof userForgotPasswordRequestSchema
>['body'];
export type UserForgotPasswordVerifyInput = z.infer<
  typeof userForgotPasswordVerifySchema
>['body'];

export const userFavoriteSportsUpdateSchema = z.object({
  body: z.object({
    favoriteSports: z
      .array(z.string().min(1, 'Sport ID is required'))
      .min(0, 'At least one sport ID is required')
      .optional(),
  }),
});

export type UserFavoriteSportsUpdateInput = z.infer<typeof userFavoriteSportsUpdateSchema>['body'];

