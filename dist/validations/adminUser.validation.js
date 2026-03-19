"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminUserSchema = exports.createAdminUserSchema = void 0;
const zod_1 = require("zod");
const validationMessages_1 = require("../utils/validationMessages");
const string_1 = require("../utils/string");
const user_model_1 = require("../models/user.model");
const role_model_1 = require("../models/role.model");
const gender_enum_1 = require("../enums/gender.enum");
const mongoose_1 = require("mongoose");
const mobileNumberSchema = zod_1.z
    .string()
    .regex(/^[6-9]\d{9}$/, validationMessages_1.validationMessages.mobileNumber.invalidPattern())
    .optional()
    .nullable();
const addressInputSchema = zod_1.z.object({
    line1: zod_1.z.string().max(255).optional().nullable(),
    line2: zod_1.z.string().min(1).max(255),
    area: zod_1.z.string().max(255).optional().nullable(),
    city: zod_1.z.string().min(1).max(255),
    state: zod_1.z.string().min(1).max(255),
    country: zod_1.z.string().min(1).max(255).optional().nullable().transform((val) => val || 'India'),
    pincode: zod_1.z
        .string()
        .regex(/^\d{6}$/, validationMessages_1.validationMessages.address.pincodeInvalid())
        .min(6)
        .max(6),
});
/**
 * Schema for creating a user via admin panel
 */
exports.createAdminUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid())
            .refine(async (email) => {
            const existingUser = await user_model_1.UserModel.findOne({ email: email.toLowerCase() });
            return !existingUser;
        }, { message: 'Email already exists' }),
        firstName: zod_1.z
            .string({ message: 'First name is required' })
            .min(1, 'First name is required')
            .max(100, 'First name is too long')
            .transform((val) => (0, string_1.toTitleCase)(val)),
        middleName: zod_1.z
            .union([zod_1.z.string(), zod_1.z.literal('')])
            .optional()
            .transform((val) => (val && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : undefined)),
        lastName: zod_1.z
            .string()
            .max(100, 'Last name is too long')
            .optional()
            .nullable()
            .transform((val) => (val != null && typeof val === 'string' && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : null)),
        mobile: mobileNumberSchema,
        gender: zod_1.z.nativeEnum(gender_enum_1.Gender).optional().nullable(),
        dob: zod_1.z
            .string()
            .datetime()
            .optional()
            .nullable()
            .transform((val) => (val ? new Date(val) : null)),
        roles: zod_1.z
            .array(zod_1.z.string())
            .min(1, 'At least one role is required')
            .refine(async (roleInputs) => {
            // Separate role names and ObjectIds
            const roleNames = [];
            const roleIds = [];
            for (const input of roleInputs) {
                if (mongoose_1.Types.ObjectId.isValid(input)) {
                    roleIds.push(new mongoose_1.Types.ObjectId(input));
                }
                else {
                    roleNames.push(input);
                }
            }
            // Query roles to get their names
            const queryConditions = [];
            if (roleNames.length > 0) {
                queryConditions.push({ name: { $in: roleNames } });
            }
            if (roleIds.length > 0) {
                queryConditions.push({ _id: { $in: roleIds } });
            }
            if (queryConditions.length === 0) {
                return false;
            }
            const roles = await role_model_1.RoleModel.find({
                $or: queryConditions
            });
            // Check if all roles are either "user" or "academy"
            const allowedRoles = ['user', 'academy'];
            const disallowedRoles = ['super_admin', 'admin', 'employee', 'agent'];
            for (const role of roles) {
                if (disallowedRoles.includes(role.name)) {
                    return false;
                }
                if (!allowedRoles.includes(role.name)) {
                    return false;
                }
            }
            // Also check by name directly if provided
            for (const roleName of roleNames) {
                if (disallowedRoles.includes(roleName) || !allowedRoles.includes(roleName)) {
                    return false;
                }
            }
            return true;
        }, { message: 'Only "user" and "academy" roles are allowed. Other roles (super_admin, admin, employee, agent) cannot be assigned through this endpoint.' })
            .refine(async (roleInputs) => {
            // Separate role names and ObjectIds
            const roleNames = [];
            const roleIds = [];
            for (const input of roleInputs) {
                if (mongoose_1.Types.ObjectId.isValid(input)) {
                    roleIds.push(new mongoose_1.Types.ObjectId(input));
                }
                else {
                    roleNames.push(input);
                }
            }
            // Query roles by name and/or _id
            const queryConditions = [];
            if (roleNames.length > 0) {
                queryConditions.push({ name: { $in: roleNames } });
            }
            if (roleIds.length > 0) {
                queryConditions.push({ _id: { $in: roleIds } });
            }
            if (queryConditions.length === 0) {
                return false;
            }
            const roles = await role_model_1.RoleModel.find({
                $or: queryConditions
            });
            // Verify all inputs were found
            return roles.length === roleInputs.length;
        }, { message: 'One or more roles are invalid' }),
        userType: zod_1.z.enum(['student', 'guardian', 'academy']).optional().nullable(),
        isActive: zod_1.z.boolean().default(true),
        address: addressInputSchema.optional().nullable(),
    }),
});
/**
 * Schema for updating a user via admin panel
 * Note: email and password can only be updated by super_admin (checked in controller)
 */
exports.updateAdminUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid())
            .optional(),
        firstName: zod_1.z
            .string()
            .min(1, 'First name is required')
            .max(100, 'First name is too long')
            .optional()
            .transform((val) => (val && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : undefined)),
        middleName: zod_1.z
            .union([zod_1.z.string(), zod_1.z.literal('')])
            .optional()
            .transform((val) => (val && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : undefined)),
        lastName: zod_1.z
            .string()
            .max(100, 'Last name is too long')
            .optional()
            .nullable()
            .transform((val) => (val != null && typeof val === 'string' && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : null)),
        mobile: mobileNumberSchema,
        gender: zod_1.z.nativeEnum(gender_enum_1.Gender).optional().nullable(),
        dob: zod_1.z
            .string()
            .datetime()
            .optional()
            .nullable()
            .transform((val) => (val ? new Date(val) : null)),
        roles: zod_1.z
            .array(zod_1.z.string())
            .min(1, 'At least one role is required')
            .refine(async (roleInputs) => {
            // Separate role names and ObjectIds
            const roleNames = [];
            const roleIds = [];
            for (const input of roleInputs) {
                if (mongoose_1.Types.ObjectId.isValid(input)) {
                    roleIds.push(new mongoose_1.Types.ObjectId(input));
                }
                else {
                    roleNames.push(input);
                }
            }
            // Query roles to get their names
            const queryConditions = [];
            if (roleNames.length > 0) {
                queryConditions.push({ name: { $in: roleNames } });
            }
            if (roleIds.length > 0) {
                queryConditions.push({ _id: { $in: roleIds } });
            }
            if (queryConditions.length === 0) {
                return false;
            }
            const roles = await role_model_1.RoleModel.find({
                $or: queryConditions
            });
            // Check if all roles are either "user" or "academy"
            const allowedRoles = ['user', 'academy'];
            const disallowedRoles = ['super_admin', 'admin', 'employee', 'agent'];
            for (const role of roles) {
                if (disallowedRoles.includes(role.name)) {
                    return false;
                }
                if (!allowedRoles.includes(role.name)) {
                    return false;
                }
            }
            // Also check by name directly if provided
            for (const roleName of roleNames) {
                if (disallowedRoles.includes(roleName) || !allowedRoles.includes(roleName)) {
                    return false;
                }
            }
            return true;
        }, { message: 'Only "user" and "academy" roles are allowed. Other roles (super_admin, admin, employee, agent) cannot be assigned through this endpoint.' })
            .refine(async (roleInputs) => {
            // Separate role names and ObjectIds
            const roleNames = [];
            const roleIds = [];
            for (const input of roleInputs) {
                if (mongoose_1.Types.ObjectId.isValid(input)) {
                    roleIds.push(new mongoose_1.Types.ObjectId(input));
                }
                else {
                    roleNames.push(input);
                }
            }
            // Query roles by name and/or _id
            const queryConditions = [];
            if (roleNames.length > 0) {
                queryConditions.push({ name: { $in: roleNames } });
            }
            if (roleIds.length > 0) {
                queryConditions.push({ _id: { $in: roleIds } });
            }
            if (queryConditions.length === 0) {
                return false;
            }
            const roles = await role_model_1.RoleModel.find({
                $or: queryConditions
            });
            // Verify all inputs were found
            return roles.length === roleInputs.length;
        }, { message: 'One or more roles are invalid' })
            .optional(),
        userType: zod_1.z.enum(['student', 'guardian', 'academy']).optional().nullable(),
        isActive: zod_1.z.boolean().optional(),
        address: addressInputSchema.optional().nullable(),
    }),
});
//# sourceMappingURL=adminUser.validation.js.map