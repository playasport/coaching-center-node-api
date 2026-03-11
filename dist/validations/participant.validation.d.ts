import { z } from 'zod';
export declare const participantCreateSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodOptional<z.ZodString>;
        firstName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        lastName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            [x: string]: string;
        }>>>;
        disability: z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            0: "0";
            1: "1";
        }>>>, z.ZodTransform<number, "0" | "1">>;
        dob: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        schoolName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        contactNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        profilePhoto: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        address: z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodNullable<z.ZodOptional<z.ZodObject<{
            line1: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            line2: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            area: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            state: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            country: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            pincode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const participantUpdateSchema: z.ZodObject<{
    body: z.ZodObject<{
        firstName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        lastName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
            [x: string]: string;
        }>>>;
        disability: z.ZodPipe<z.ZodOptional<z.ZodEnum<{
            0: "0";
            1: "1";
        }>>, z.ZodTransform<number | undefined, "0" | "1" | undefined>>;
        dob: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        schoolName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        contactNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        profilePhoto: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        address: z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodNullable<z.ZodOptional<z.ZodObject<{
            line1: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            line2: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            area: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            state: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            country: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            pincode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>>>>;
        isSelf: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ParticipantCreateInput = z.infer<typeof participantCreateSchema>['body'];
export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>['body'];
//# sourceMappingURL=participant.validation.d.ts.map