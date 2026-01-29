import { z } from 'zod';
import { RoleModel } from '../models/role.model';
import { DefaultRoles } from '../enums/defaultRoles.enum';

/**
 * Schema for creating a role via admin panel
 */
export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Role name is required' })
      .min(1, 'Role name is required')
      .max(50, 'Role name is too long')
      .regex(/^[a-z0-9_]+$/, 'Role name must be lowercase with numbers and underscores only (e.g., "new_role_123")')
      .refine(
        async (name) => {
          const existingRole = await RoleModel.findOne({ name });
          return !existingRole;
        },
        { message: 'Role name already exists' }
      )
      .refine(
        (name) => {
          // Prevent creating default roles
          const defaultRoleNames = Object.values(DefaultRoles);
          return !defaultRoleNames.includes(name as any);
        },
        { message: 'Cannot create default system roles' }
      ),
    description: z.string().max(500, 'Description is too long').optional().nullable(),
    visibleToRoles: z
      .array(z.string())
      .optional()
      .nullable()
      .refine(
        async (roleNames) => {
          if (!roleNames || roleNames.length === 0) {
            return true; // null or empty is allowed
          }
          const roles = await RoleModel.find({ name: { $in: roleNames } });
          return roles.length === roleNames.length;
        },
        { message: 'One or more visibleToRoles are invalid' }
      ),
  }),
});

/**
 * Schema for updating a role via admin panel
 */
export const updateRoleSchema = z.object({
  body: z.object({
    description: z.string().max(500, 'Description is too long').optional().nullable(),
    visibleToRoles: z
      .array(z.string())
      .optional()
      .nullable()
      .refine(
        async (roleNames) => {
          if (!roleNames || roleNames.length === 0) {
            return true; // null or empty is allowed
          }
          const roles = await RoleModel.find({ name: { $in: roleNames } });
          return roles.length === roleNames.length;
        },
        { message: 'One or more visibleToRoles are invalid' }
      ),
  }),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body'];
