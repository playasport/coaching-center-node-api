import { z } from 'zod';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';
export declare const createPermissionSchema: z.ZodObject<{
    body: z.ZodObject<{
        role: z.ZodString;
        section: z.ZodEnum<typeof Section>;
        actions: z.ZodArray<z.ZodEnum<typeof Action>>;
        isActive: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updatePermissionSchema: z.ZodObject<{
    body: z.ZodObject<{
        section: z.ZodOptional<z.ZodEnum<typeof Section>>;
        actions: z.ZodOptional<z.ZodArray<z.ZodEnum<typeof Action>>>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const bulkUpdatePermissionsSchema: z.ZodObject<{
    body: z.ZodObject<{
        role: z.ZodString;
        permissions: z.ZodArray<z.ZodObject<{
            section: z.ZodEnum<typeof Section>;
            actions: z.ZodArray<z.ZodEnum<typeof Action>>;
            isActive: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>['body'];
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>['body'];
export type BulkUpdatePermissionsInput = z.infer<typeof bulkUpdatePermissionsSchema>['body'];
//# sourceMappingURL=permission.validation.d.ts.map