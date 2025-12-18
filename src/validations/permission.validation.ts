import { z } from 'zod';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';

const sectionEnum = z.nativeEnum(Section);
const actionEnum = z.nativeEnum(Action);

export const createPermissionSchema = z.object({
  body: z.object({
    role: z.string().min(1, 'Role ID is required'),
    section: sectionEnum,
    actions: z.array(actionEnum).min(1, 'At least one action is required'),
    isActive: z.boolean().default(true),
  }),
});

export const updatePermissionSchema = z.object({
  body: z.object({
    section: sectionEnum.optional(),
    actions: z.array(actionEnum).min(1, 'At least one action is required').optional(),
    isActive: z.boolean().optional(),
  }),
});

export const bulkUpdatePermissionsSchema = z.object({
  body: z.object({
    role: z.string().min(1, 'Role ID is required'),
    permissions: z.array(
      z.object({
        section: sectionEnum,
        actions: z.array(actionEnum).min(1, 'At least one action is required'),
        isActive: z.boolean().default(true),
      })
    ).min(1, 'At least one permission is required'),
  }),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>['body'];
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>['body'];
export type BulkUpdatePermissionsInput = z.infer<typeof bulkUpdatePermissionsSchema>['body'];
