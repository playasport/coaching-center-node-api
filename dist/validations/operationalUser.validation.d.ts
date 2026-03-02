import { z } from 'zod';
import { Gender } from '../enums/gender.enum';
/**
 * Schema for creating an operational user (admin, employee, agent - not user/academy/super_admin)
 */
export declare const createOperationalUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        mobile: z.ZodString;
        gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof Gender>>>;
        dob: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<Date | null, string | null | undefined>>;
        roles: z.ZodArray<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        address: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            line1: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            line2: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            area: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            state: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            country: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string, string | null | undefined>>;
            pincode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateOperationalUserInput = z.infer<typeof createOperationalUserSchema>['body'];
/**
 * Schema for updating an operational user
 * Note: email and password can only be updated by super_admin (checked in controller)
 */
export declare const updateOperationalUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        mobile: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<typeof Gender>>>;
        dob: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<Date | null, string | null | undefined>>;
        roles: z.ZodOptional<z.ZodArray<z.ZodString>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        address: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            line1: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            line2: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            area: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            state: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            country: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string, string | null | undefined>>;
            pincode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>>>;
        password: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UpdateOperationalUserInput = z.infer<typeof updateOperationalUserSchema>['body'];
//# sourceMappingURL=operationalUser.validation.d.ts.map