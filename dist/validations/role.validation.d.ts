import { z } from 'zod';
/**
 * Schema for creating a role via admin panel
 */
export declare const createRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        visibleToRoles: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Schema for updating a role via admin panel
 */
export declare const updateRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        visibleToRoles: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body'];
//# sourceMappingURL=role.validation.d.ts.map