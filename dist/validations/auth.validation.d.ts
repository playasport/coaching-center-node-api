import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        coachingName: z.ZodString;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        mobileNumber: z.ZodOptional<z.ZodString>;
        contactEmail: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
        contactNumber: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyRegisterSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
        email: z.ZodString;
        password: z.ZodString;
        mobile: z.ZodString;
        gender: z.ZodOptional<z.ZodEnum<{
            male: "male";
            female: "female";
            other: "other";
        }>>;
        otp: z.ZodString;
        agentCode: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        agentCode: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academySocialLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        provider: z.ZodOptional<z.ZodEnum<{
            google: "google";
            facebook: "facebook";
            apple: "apple";
            instagram: "instagram";
        }>>;
        idToken: z.ZodString;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        mobile: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            login: "login";
            register: "register";
            profile_update: "profile_update";
            forgot_password: "forgot_password";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyVerifyOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        mobile: z.ZodString;
        otp: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            login: "login";
            register: "register";
            profile_update: "profile_update";
            forgot_password: "forgot_password";
        }>>;
        agentCode: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyForgotPasswordRequestSchema: z.ZodObject<{
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"mobile">;
        mobile: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        mode: z.ZodLiteral<"email">;
        email: z.ZodString;
    }, z.core.$strip>], "mode">;
}, z.core.$strip>;
export declare const academyForgotPasswordVerifySchema: z.ZodObject<{
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"mobile">;
        mobile: z.ZodString;
        otp: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        mode: z.ZodLiteral<"email">;
        email: z.ZodString;
        otp: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>], "mode">;
}, z.core.$strip>;
export declare const academyProfileUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyAddressUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        address: z.ZodObject<{
            line1: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<string | undefined, string | undefined>>;
            line2: z.ZodString;
            area: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<string | undefined, string | undefined>>;
            city: z.ZodString;
            state: z.ZodString;
            country: z.ZodString;
            pincode: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyPasswordChangeSchema: z.ZodObject<{
    body: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type AcademyRegisterInput = z.infer<typeof academyRegisterSchema>['body'];
export type AcademyLoginInput = z.infer<typeof academyLoginSchema>['body'];
export type AcademySocialLoginInput = z.infer<typeof academySocialLoginSchema>['body'];
export type AcademyProfileUpdateInput = z.infer<typeof academyProfileUpdateSchema>['body'];
export type AcademyAddressUpdateInput = z.infer<typeof academyAddressUpdateSchema>['body'];
export type AcademyPasswordChangeInput = z.infer<typeof academyPasswordChangeSchema>['body'];
export type AcademyForgotPasswordRequestInput = z.infer<typeof academyForgotPasswordRequestSchema>['body'];
export type AcademyForgotPasswordVerifyInput = z.infer<typeof academyForgotPasswordVerifySchema>['body'];
export declare const userRegisterSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
        email: z.ZodString;
        mobile: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<{
            student: "student";
            guardian: "guardian";
        }>;
        dob: z.ZodString;
        gender: z.ZodEnum<{
            male: "male";
            female: "female";
            other: "other";
        }>;
        otp: z.ZodOptional<z.ZodString>;
        tempToken: z.ZodOptional<z.ZodString>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userSocialLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        provider: z.ZodOptional<z.ZodEnum<{
            google: "google";
            facebook: "facebook";
            apple: "apple";
            instagram: "instagram";
        }>>;
        idToken: z.ZodString;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            student: "student";
            guardian: "guardian";
        }>>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        mobile: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            login: "login";
            register: "register";
            profile_update: "profile_update";
            forgot_password: "forgot_password";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userVerifyOtpSchema: z.ZodObject<{
    body: z.ZodObject<{
        mobile: z.ZodString;
        otp: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            login: "login";
            register: "register";
            profile_update: "profile_update";
            forgot_password: "forgot_password";
        }>>;
        fcmToken: z.ZodOptional<z.ZodString>;
        deviceType: z.ZodOptional<z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userForgotPasswordRequestSchema: z.ZodObject<{
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"mobile">;
        mobile: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        mode: z.ZodLiteral<"email">;
        email: z.ZodString;
    }, z.core.$strip>], "mode">;
}, z.core.$strip>;
export declare const userForgotPasswordVerifySchema: z.ZodObject<{
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"mobile">;
        mobile: z.ZodString;
        otp: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        mode: z.ZodLiteral<"email">;
        email: z.ZodString;
        otp: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>], "mode">;
}, z.core.$strip>;
export declare const userProfileUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
        email: z.ZodOptional<z.ZodString>;
        dob: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodEnum<{
            male: "male";
            female: "female";
            other: "other";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userAddressUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        address: z.ZodObject<{
            line1: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<string | undefined, string | undefined>>;
            line2: z.ZodString;
            area: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<string | undefined, string | undefined>>;
            city: z.ZodString;
            state: z.ZodString;
            country: z.ZodString;
            pincode: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userPasswordChangeSchema: z.ZodObject<{
    body: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserRegisterInput = z.infer<typeof userRegisterSchema>['body'];
export type UserLoginInput = z.infer<typeof userLoginSchema>['body'];
export type UserSocialLoginInput = z.infer<typeof userSocialLoginSchema>['body'];
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>['body'];
export type UserAddressUpdateInput = z.infer<typeof userAddressUpdateSchema>['body'];
export type UserPasswordChangeInput = z.infer<typeof userPasswordChangeSchema>['body'];
export type UserForgotPasswordRequestInput = z.infer<typeof userForgotPasswordRequestSchema>['body'];
export type UserForgotPasswordVerifyInput = z.infer<typeof userForgotPasswordVerifySchema>['body'];
export declare const userFavoriteSportsUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        favoriteSports: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserFavoriteSportsUpdateInput = z.infer<typeof userFavoriteSportsUpdateSchema>['body'];
export declare const saveFcmTokenSchema: z.ZodObject<{
    body: z.ZodObject<{
        fcmToken: z.ZodString;
        deviceType: z.ZodEnum<{
            web: "web";
            android: "android";
            ios: "ios";
        }>;
        deviceId: z.ZodOptional<z.ZodString>;
        deviceName: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SaveFcmTokenInput = z.infer<typeof saveFcmTokenSchema>['body'];
export declare const addAcademyBookmarkSchema: z.ZodObject<{
    body: z.ZodObject<{
        academyId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyIdParamSchema: z.ZodObject<{
    params: z.ZodObject<{
        academyId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AddAcademyBookmarkInput = z.infer<typeof addAcademyBookmarkSchema>['body'];
//# sourceMappingURL=auth.validation.d.ts.map