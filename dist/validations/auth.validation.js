"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academyIdParamSchema = exports.addAcademyBookmarkSchema = exports.saveFcmTokenSchema = exports.userFavoriteSportsUpdateSchema = exports.userPasswordChangeSchema = exports.userAddressUpdateSchema = exports.userProfileUpdateSchema = exports.userForgotPasswordVerifySchema = exports.userForgotPasswordRequestSchema = exports.userVerifyOtpSchema = exports.userOtpSchema = exports.userSocialLoginSchema = exports.userLoginSchema = exports.userRegisterSchema = exports.academyPasswordChangeSchema = exports.academyAddressUpdateSchema = exports.academyProfileUpdateSchema = exports.academyForgotPasswordVerifySchema = exports.academyForgotPasswordRequestSchema = exports.academyVerifyOtpSchema = exports.academyOtpSchema = exports.academySocialLoginSchema = exports.academyLoginSchema = exports.academyRegisterSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const validationMessages_1 = require("../utils/validationMessages");
const user_model_1 = require("../models/user.model");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
const i18n_1 = require("../utils/i18n");
const mobileNumberSchema = zod_1.z
    .string({ message: validationMessages_1.validationMessages.mobileNumber.required() })
    .min(10, validationMessages_1.validationMessages.mobileNumber.minLength())
    .regex(/^[6-9]\d{9}$/, validationMessages_1.validationMessages.mobileNumber.invalidPattern());
const otpCodeSchema = zod_1.z
    .string({ message: validationMessages_1.validationMessages.otp.required() })
    .length(6, validationMessages_1.validationMessages.otp.length());
const passwordComplexitySchema = zod_1.z
    .string({ message: validationMessages_1.validationMessages.password.required() })
    .min(8, validationMessages_1.validationMessages.password.minLength())
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, validationMessages_1.validationMessages.password.invalidPattern());
const nameRegex = /^[A-Z][a-zA-Z\s]*$/;
// Device info schema for FCM token registration
const deviceInfoSchema = zod_1.z.object({
    fcmToken: zod_1.z.string().min(1, 'FCM token is required').optional(),
    deviceType: zod_1.z.enum(['web', 'android', 'ios']).optional(),
    deviceId: zod_1.z.string().optional(),
    deviceName: zod_1.z.string().optional(),
    appVersion: zod_1.z.string().optional(),
});
const addressInputSchema = zod_1.z.object({
    line1: zod_1.z
        .string()
        .max(100)
        .optional()
        .transform((val) => (val === '' ? undefined : val)),
    line2: zod_1.z
        .string({ message: validationMessages_1.validationMessages.address.line2Required() })
        .min(1, validationMessages_1.validationMessages.address.line2Required())
        .max(100),
    area: zod_1.z
        .string()
        .max(100)
        .optional()
        .transform((val) => (val === '' ? undefined : val)),
    city: zod_1.z
        .string({ message: validationMessages_1.validationMessages.address.cityRequired() })
        .min(1, validationMessages_1.validationMessages.address.cityRequired()),
    state: zod_1.z
        .string({ message: validationMessages_1.validationMessages.address.stateRequired() })
        .min(1, validationMessages_1.validationMessages.address.stateRequired()),
    country: zod_1.z
        .string({ message: validationMessages_1.validationMessages.address.countryRequired() })
        .min(1, validationMessages_1.validationMessages.address.countryRequired()),
    pincode: zod_1.z
        .string({ message: validationMessages_1.validationMessages.address.pincodeRequired() })
        .regex(/^\d{6}$/, validationMessages_1.validationMessages.address.pincodeInvalid()),
});
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid()),
        password: zod_1.z
            .string({ message: validationMessages_1.validationMessages.password.required() })
            .min(1, validationMessages_1.validationMessages.password.required())
            .min(6, validationMessages_1.validationMessages.password.minLength()),
        coachingName: zod_1.z
            .string({ message: validationMessages_1.validationMessages.coachingName.required() })
            .min(1, validationMessages_1.validationMessages.coachingName.required()),
        firstName: zod_1.z.string().optional(),
        lastName: zod_1.z.string().optional(),
        mobileNumber: zod_1.z.string().optional(),
        contactEmail: zod_1.z
            .union([
            zod_1.z.string().email(validationMessages_1.validationMessages.contactEmail.invalid()),
            zod_1.z.literal(''),
        ])
            .optional()
            .transform((val) => (val === '' ? undefined : val)),
        contactNumber: zod_1.z.string().optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid()),
        password: zod_1.z
            .string({ message: validationMessages_1.validationMessages.password.required() })
            .min(1, validationMessages_1.validationMessages.password.required()),
    }),
});
exports.academyRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z
            .string({ message: validationMessages_1.validationMessages.firstName.required() })
            .min(1, validationMessages_1.validationMessages.firstName.required())
            .regex(/^[A-Z][a-zA-Z\s]*$/, validationMessages_1.validationMessages.firstName.invalidFormat()),
        lastName: zod_1.z
            .union([
            zod_1.z
                .string({ message: validationMessages_1.validationMessages.lastName.invalidFormat() })
                .regex(/^[A-Z][a-zA-Z\s]*$/, validationMessages_1.validationMessages.lastName.invalidFormat()),
            zod_1.z.literal(''),
        ])
            .optional()
            .transform((val) => (val ? val : undefined)),
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid()),
        password: passwordComplexitySchema,
        mobile: mobileNumberSchema,
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
        otp: otpCodeSchema,
        agentCode: zod_1.z
            .union([
            zod_1.z.string().min(1).regex(/^[a-zA-Z0-9]+$/, 'agentCode must be alphanumeric').transform((v) => v.trim().toUpperCase()),
            zod_1.z.literal('').transform(() => undefined),
        ])
            .optional(),
    })
        .merge(deviceInfoSchema)
        .refine(async (data) => {
        // Check if mobile number already exists for a user with 'academy' role
        const existingUser = await user_model_1.UserModel.findOne({
            mobile: data.mobile,
            isDeleted: false
        })
            .populate('roles', 'name')
            .lean();
        if (!existingUser) {
            return true; // Mobile doesn't exist, validation passes
        }
        // Check if user has 'academy' role
        const roles = existingUser.roles;
        if (roles && roles.length > 0) {
            const hasAcademyRole = roles.some((role) => role?.name === defaultRoles_enum_1.DefaultRoles.ACADEMY);
            if (hasAcademyRole) {
                return false; // Mobile exists with 'academy' role, validation fails
            }
        }
        return true; // Mobile exists but doesn't have 'academy' role, validation passes
    }, {
        message: (0, i18n_1.t)('auth.register.mobileExists') || 'Mobile number already exists',
        path: ['mobile'],
    }),
});
exports.academyLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid()),
        password: zod_1.z
            .string({ message: validationMessages_1.validationMessages.password.required() })
            .min(1, validationMessages_1.validationMessages.password.required()),
        agentCode: zod_1.z
            .union([
            zod_1.z.string().min(1).regex(/^[a-zA-Z0-9]+$/, 'agentCode must be alphanumeric').transform((v) => v.trim().toUpperCase()),
            zod_1.z.literal('').transform(() => undefined),
        ])
            .optional(),
    }).merge(deviceInfoSchema),
});
exports.academySocialLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        provider: zod_1.z.enum(['google', 'facebook', 'instagram', 'apple']).optional(),
        idToken: zod_1.z
            .string({ message: 'ID token is required' })
            .min(1, 'ID token is required'),
        firstName: zod_1.z
            .string()
            .min(1, validationMessages_1.validationMessages.firstName.required())
            .optional(),
        lastName: zod_1.z
            .string()
            .optional(),
    }).merge(deviceInfoSchema),
});
exports.academyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        mobile: mobileNumberSchema,
        mode: zod_1.z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
    }),
});
exports.academyVerifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        mobile: mobileNumberSchema,
        otp: otpCodeSchema,
        mode: zod_1.z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
        agentCode: zod_1.z
            .union([
            zod_1.z.string().min(1).regex(/^[a-zA-Z0-9]+$/, 'agentCode must be alphanumeric').transform((v) => v.trim().toUpperCase()),
            zod_1.z.literal('').transform(() => undefined),
        ])
            .optional(),
    }).merge(deviceInfoSchema),
});
const forgotPasswordRequestBodySchema = zod_1.z.discriminatedUnion('mode', [
    zod_1.z.object({
        mode: zod_1.z.literal('mobile'),
        mobile: mobileNumberSchema,
    }),
    zod_1.z.object({
        mode: zod_1.z.literal('email'),
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .email(validationMessages_1.validationMessages.email.invalid()),
    }),
]);
const forgotPasswordVerifyBodySchema = zod_1.z.discriminatedUnion('mode', [
    zod_1.z.object({
        mode: zod_1.z.literal('mobile'),
        mobile: mobileNumberSchema,
        otp: otpCodeSchema,
        newPassword: passwordComplexitySchema,
    }),
    zod_1.z.object({
        mode: zod_1.z.literal('email'),
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .email(validationMessages_1.validationMessages.email.invalid()),
        otp: otpCodeSchema,
        newPassword: passwordComplexitySchema,
    }),
]);
exports.academyForgotPasswordRequestSchema = zod_1.z.object({
    body: forgotPasswordRequestBodySchema,
});
exports.academyForgotPasswordVerifySchema = zod_1.z.object({
    body: forgotPasswordVerifyBodySchema,
});
exports.academyProfileUpdateSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        firstName: zod_1.z
            .string({ message: validationMessages_1.validationMessages.firstName.required() })
            .regex(nameRegex, validationMessages_1.validationMessages.firstName.invalidFormat())
            .optional(),
        lastName: zod_1.z
            .union([
            zod_1.z
                .string({ message: validationMessages_1.validationMessages.lastName.invalidFormat() })
                .regex(nameRegex, validationMessages_1.validationMessages.lastName.invalidFormat()),
            zod_1.z.literal(''),
        ])
            .optional()
            .transform((val) => (val ? val : undefined)),
    })
        .refine((data) => Boolean(data.firstName ?? data.lastName), {
        message: validationMessages_1.validationMessages.profile.noChanges(),
        path: ['body'],
    }),
});
exports.academyAddressUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        address: addressInputSchema,
    }),
});
exports.academyPasswordChangeSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        currentPassword: zod_1.z
            .string({ message: validationMessages_1.validationMessages.password.required() })
            .min(6, validationMessages_1.validationMessages.password.minLength()),
        newPassword: passwordComplexitySchema,
    })
        .refine((data) => data.currentPassword !== data.newPassword, {
        message: validationMessages_1.validationMessages.password.sameAsCurrent(),
        path: ['newPassword'],
    }),
});
// User Auth Validation Schemas
exports.userRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z
            .string({ message: validationMessages_1.validationMessages.firstName.required() })
            .min(1, validationMessages_1.validationMessages.firstName.required())
            .regex(/^[A-Z][a-zA-Z\s]*$/, validationMessages_1.validationMessages.firstName.invalidFormat()),
        lastName: zod_1.z
            .union([
            zod_1.z
                .string({ message: validationMessages_1.validationMessages.lastName.invalidFormat() })
                .regex(/^[A-Z][a-zA-Z\s]*$/, validationMessages_1.validationMessages.lastName.invalidFormat()),
            zod_1.z.literal(''),
        ])
            .optional()
            .transform((val) => (val ? val : undefined)),
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid()),
        mobile: mobileNumberSchema.optional(),
        type: zod_1.z.enum(['student', 'guardian'], {
            message: 'Type must be either student or guardian',
        }),
        dob: zod_1.z
            .string({ message: 'Date of birth is required' })
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
            .refine((date) => {
            const dob = new Date(date);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                return age - 1 >= 3;
            }
            return age >= 3;
        }, { message: 'Age must be at least 3 years' }),
        gender: zod_1.z.enum(['male', 'female', 'other'], {
            message: 'Gender must be male, female, or other',
        }),
        otp: otpCodeSchema.optional(),
        tempToken: zod_1.z.string().min(1, 'Temporary token is required').optional(),
    })
        .merge(deviceInfoSchema)
        .refine(async (data) => {
        // Check if email already exists for a user with 'user' role
        const existingUser = await user_model_1.UserModel.findOne({
            email: data.email.toLowerCase(),
            isDeleted: false
        })
            .populate('roles', 'name')
            .lean();
        if (!existingUser) {
            return true; // Email doesn't exist, validation passes
        }
        // Check if user has 'user' role
        const roles = existingUser.roles;
        if (roles && roles.length > 0) {
            const hasUserRole = roles.some((role) => role?.name === defaultRoles_enum_1.DefaultRoles.USER);
            if (hasUserRole) {
                return false; // Email exists with 'user' role, validation fails
            }
        }
        return true; // Email exists but doesn't have 'user' role (e.g., academy), validation passes
    }, {
        message: (0, i18n_1.t)('auth.register.emailExists') || 'Email already exists',
        path: ['email'],
    })
        .refine(async (data) => {
        // Only validate mobile if it's provided directly (legacy OTP flow), not when using tempToken
        if (data.tempToken || !data.mobile) {
            return true; // Skip validation when using tempToken or mobile not provided
        }
        // First check if email user exists (to see if it's the same user)
        const existingUserByEmail = await user_model_1.UserModel.findOne({
            email: data.email.toLowerCase(),
            isDeleted: false
        })
            .populate('roles', 'name')
            .lean();
        // Check if mobile number already exists for a user with 'user' role
        const existingUserByMobile = await user_model_1.UserModel.findOne({
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
        const roles = existingUserByMobile.roles;
        if (roles && roles.length > 0) {
            const hasUserRole = roles.some((role) => role?.name === defaultRoles_enum_1.DefaultRoles.USER);
            if (hasUserRole) {
                return false; // Mobile exists with 'user' role for a different user, validation fails
            }
        }
        return true; // Mobile exists but doesn't have 'user' role (e.g., academy), validation passes
    }, {
        message: (0, i18n_1.t)('auth.register.mobileExists') || 'Mobile number already exists',
        path: ['mobile'],
    })
        .refine((data) => data.otp || data.tempToken, {
        message: 'Either tempToken or otp is required',
        path: ['tempToken'],
    })
        .refine((data) => !(data.tempToken && data.otp), {
        message: 'Cannot provide both tempToken and otp. Use tempToken for new registration flow or otp for legacy flow.',
        path: ['otp'],
    })
        .refine((data) => {
        // If using tempToken, mobile is not required (will be extracted from token)
        // If using legacy otp, mobile is required
        if (data.tempToken) {
            return true; // Mobile not needed when using tempToken
        }
        if (data.otp) {
            return !!data.mobile; // Mobile required for legacy otp flow
        }
        return true;
    }, {
        message: 'Mobile number is required when using OTP (legacy flow)',
        path: ['mobile'],
    })
        .refine((data) => {
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
    }, {
        message: 'Student must be at least 13 years old',
        path: ['dob'],
    })
        .refine((data) => {
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
    }, {
        message: 'Parent/Guardian must be at least 18 years old',
        path: ['dob'],
    }),
});
exports.userLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid()),
        password: zod_1.z
            .string({ message: validationMessages_1.validationMessages.password.required() })
            .min(1, validationMessages_1.validationMessages.password.required()),
    }).merge(deviceInfoSchema),
});
exports.userSocialLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        provider: zod_1.z.enum(['google', 'facebook', 'instagram', 'apple']).optional(),
        idToken: zod_1.z
            .string({ message: 'ID token is required' })
            .min(1, 'ID token is required'),
        firstName: zod_1.z
            .string()
            .min(1, validationMessages_1.validationMessages.firstName.required())
            .optional(),
        lastName: zod_1.z
            .string()
            .optional(),
        type: zod_1.z.enum(['student', 'guardian']).optional(),
    }).merge(deviceInfoSchema),
});
exports.userOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        mobile: mobileNumberSchema,
        mode: zod_1.z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
    }),
});
exports.userVerifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        mobile: mobileNumberSchema,
        otp: otpCodeSchema,
        mode: zod_1.z.enum(['login', 'register', 'profile_update', 'forgot_password']).optional(),
    }).merge(deviceInfoSchema),
});
exports.userForgotPasswordRequestSchema = zod_1.z.object({
    body: forgotPasswordRequestBodySchema,
});
exports.userForgotPasswordVerifySchema = zod_1.z.object({
    body: forgotPasswordVerifyBodySchema,
});
exports.userProfileUpdateSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        firstName: zod_1.z
            .string({ message: validationMessages_1.validationMessages.firstName.required() })
            .regex(nameRegex, validationMessages_1.validationMessages.firstName.invalidFormat())
            .optional(),
        lastName: zod_1.z
            .union([
            zod_1.z
                .string({ message: validationMessages_1.validationMessages.lastName.invalidFormat() })
                .regex(nameRegex, validationMessages_1.validationMessages.lastName.invalidFormat()),
            zod_1.z.literal(''),
        ])
            .optional()
            .transform((val) => (val ? val : undefined)),
        email: zod_1.z
            .string()
            .email(validationMessages_1.validationMessages.email.invalid())
            .optional(),
        dob: zod_1.z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
            .optional(),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
    })
        .refine((data) => Boolean(data.firstName ?? data.lastName ?? data.email ?? data.dob ?? data.gender), {
        message: validationMessages_1.validationMessages.profile.noChanges(),
        path: ['body'],
    }),
});
exports.userAddressUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        address: addressInputSchema,
    }),
});
exports.userPasswordChangeSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        currentPassword: zod_1.z
            .string({ message: validationMessages_1.validationMessages.password.required() })
            .min(6, validationMessages_1.validationMessages.password.minLength()),
        newPassword: passwordComplexitySchema,
    })
        .refine((data) => data.currentPassword !== data.newPassword, {
        message: validationMessages_1.validationMessages.password.sameAsCurrent(),
        path: ['newPassword'],
    }),
});
exports.userFavoriteSportsUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        favoriteSports: zod_1.z
            .array(zod_1.z.string().min(1, 'Sport ID is required'))
            .min(0, 'At least one sport ID is required')
            .optional(),
    }),
});
// Save FCM token (academy and user) - authenticated route
exports.saveFcmTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        fcmToken: zod_1.z.string().min(1, 'FCM token is required'),
        deviceType: zod_1.z.enum(['web', 'android', 'ios']),
        deviceId: zod_1.z.string().optional(),
        deviceName: zod_1.z.string().optional(),
        appVersion: zod_1.z.string().optional(),
    }),
});
// Academy bookmark schemas
exports.addAcademyBookmarkSchema = zod_1.z.object({
    body: zod_1.z.object({
        academyId: zod_1.z.string().min(1, 'Academy ID is required'),
    }),
});
exports.academyIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        academyId: zod_1.z.string().min(1, 'Academy ID is required'),
    }),
});
//# sourceMappingURL=auth.validation.js.map