import { z } from 'zod';
export declare const adminLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const adminUpdateProfileSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        mobile: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const adminChangePasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const adminRefreshTokenSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>['body'];
export type AdminUpdateProfileInput = z.infer<typeof adminUpdateProfileSchema>['body'];
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>['body'];
export type AdminRefreshTokenInput = z.infer<typeof adminRefreshTokenSchema>['body'];
//# sourceMappingURL=adminAuth.validation.d.ts.map