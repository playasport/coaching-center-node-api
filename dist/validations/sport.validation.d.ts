import { z } from 'zod';
export declare const createSportSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        logo: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        is_active: z.ZodDefault<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>]>>>;
        is_popular: z.ZodDefault<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateSportSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        logo: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodString]>>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        is_active: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>]>>;
        is_popular: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>]>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateSportInput = z.infer<typeof createSportSchema>['body'];
export type UpdateSportInput = z.infer<typeof updateSportSchema>['body'];
//# sourceMappingURL=sport.validation.d.ts.map