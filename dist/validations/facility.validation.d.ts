import { z } from 'zod';
/**
 * Create facility validation schema
 */
export declare const createFacilitySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        is_active: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update facility validation schema
 */
export declare const updateFacilitySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        is_active: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Get facilities query validation schema
 */
export declare const getFacilitiesQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>['body'];
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>['body'];
//# sourceMappingURL=facility.validation.d.ts.map