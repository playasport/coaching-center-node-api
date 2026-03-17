import { z } from 'zod';
import { Gender } from '../enums/gender.enum';
/**
 * Schema for creating a user via admin panel
 */
export declare const createAdminUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        firstName: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        middleName: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
        lastName: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        mobile: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof Gender>>>;
        dob: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<Date | null, string | null | undefined>>;
        roles: z.ZodArray<z.ZodString>;
        userType: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            student: "student";
            guardian: "guardian";
            academy: "academy";
        }>>>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        address: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            line1: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            line2: z.ZodString;
            area: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodString;
            state: z.ZodString;
            country: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string, string | null | undefined>>;
            pincode: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>['body'];
/**
 * Schema for updating a user via admin panel
 * Note: email and password can only be updated by super_admin (checked in controller)
 */
export declare const updateAdminUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<string | undefined, string | undefined>>;
        middleName: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>, z.ZodTransform<string | undefined, string | undefined>>;
        lastName: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        mobile: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof Gender>>>;
        dob: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<Date | null, string | null | undefined>>;
        roles: z.ZodOptional<z.ZodArray<z.ZodString>>;
        userType: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            student: "student";
            guardian: "guardian";
            academy: "academy";
        }>>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        address: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            line1: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            line2: z.ZodString;
            area: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodString;
            state: z.ZodString;
            country: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string, string | null | undefined>>;
            pincode: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>['body'];
//# sourceMappingURL=adminUser.validation.d.ts.map