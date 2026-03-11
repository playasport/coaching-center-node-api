"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleSchema = exports.createRoleSchema = void 0;
const zod_1 = require("zod");
const role_model_1 = require("../models/role.model");
const defaultRoles_enum_1 = require("../enums/defaultRoles.enum");
/**
 * Schema for creating a role via admin panel
 */
exports.createRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({ message: 'Role name is required' })
            .min(1, 'Role name is required')
            .max(50, 'Role name is too long')
            .regex(/^[a-z0-9_]+$/, 'Role name must be lowercase with numbers and underscores only (e.g., "new_role_123")')
            .refine(async (name) => {
            const existingRole = await role_model_1.RoleModel.findOne({ name });
            return !existingRole;
        }, { message: 'Role name already exists' })
            .refine((name) => {
            // Prevent creating default roles
            const defaultRoleNames = Object.values(defaultRoles_enum_1.DefaultRoles);
            return !defaultRoleNames.includes(name);
        }, { message: 'Cannot create default system roles' }),
        description: zod_1.z.string().max(500, 'Description is too long').optional().nullable(),
        visibleToRoles: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .nullable()
            .refine(async (roleNames) => {
            if (!roleNames || roleNames.length === 0) {
                return true; // null or empty is allowed
            }
            const roles = await role_model_1.RoleModel.find({ name: { $in: roleNames } });
            return roles.length === roleNames.length;
        }, { message: 'One or more visibleToRoles are invalid' }),
    }),
});
/**
 * Schema for updating a role via admin panel
 */
exports.updateRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        description: zod_1.z.string().max(500, 'Description is too long').optional().nullable(),
        visibleToRoles: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .nullable()
            .refine(async (roleNames) => {
            if (!roleNames || roleNames.length === 0) {
                return true; // null or empty is allowed
            }
            const roles = await role_model_1.RoleModel.find({ name: { $in: roleNames } });
            return roles.length === roleNames.length;
        }, { message: 'One or more visibleToRoles are invalid' }),
    }),
});
//# sourceMappingURL=role.validation.js.map