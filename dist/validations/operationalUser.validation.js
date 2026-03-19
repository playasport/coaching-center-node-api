"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOperationalUserSchema = exports.createOperationalUserSchema = void 0;
const zod_1 = require("zod");
const validationMessages_1 = require("../utils/validationMessages");
const string_1 = require("../utils/string");
const adminUser_model_1 = require("../models/adminUser.model");
const role_model_1 = require("../models/role.model");
const gender_enum_1 = require("../enums/gender.enum");
const mongoose_1 = require("mongoose");
const mobileNumberSchema = zod_1.z
    .string()
    .regex(/^[6-9]\d{9}$/, validationMessages_1.validationMessages.mobileNumber.invalidPattern())
    .optional()
    .nullable();
const mobileRequiredSchema = zod_1.z
    .string({ error: 'Mobile number is required' })
    .min(1, 'Mobile number is required')
    .regex(/^[6-9]\d{9}$/, validationMessages_1.validationMessages.mobileNumber.invalidPattern());
const addressInputSchema = zod_1.z.object({
    line1: zod_1.z.string().max(255).optional().nullable(),
    line2: zod_1.z.string().max(255).optional().nullable(),
    area: zod_1.z.string().max(255).optional().nullable(),
    city: zod_1.z.string().max(255).optional().nullable(),
    state: zod_1.z.string().max(255).optional().nullable(),
    country: zod_1.z.string().max(255).optional().nullable().transform((val) => val || 'India'),
    pincode: zod_1.z
        .string()
        .regex(/^\d{6}$/, validationMessages_1.validationMessages.address.pincodeInvalid())
        .max(6)
        .optional()
        .nullable(),
});
/**
 * Schema for creating an operational user (admin, employee, agent - not user/academy/super_admin)
 */
exports.createOperationalUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ message: validationMessages_1.validationMessages.email.required() })
            .min(1, validationMessages_1.validationMessages.email.required())
            .email(validationMessages_1.validationMessages.email.invalid())
            .refine(async (email) => {
            const existingUser = await adminUser_model_1.AdminUserModel.findOne({ email: email.toLowerCase() });
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
        mobile: mobileRequiredSchema,
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
            // Check if all roles are NOT user, academy, or super_admin (any other role is allowed)
            const disallowedRoles = ['super_admin', 'user', 'academy'];
            for (const role of roles) {
                if (disallowedRoles.includes(role.name)) {
                    return false;
                }
            }
            // Also check by name directly if provided
            for (const roleName of roleNames) {
                if (disallowedRoles.includes(roleName)) {
                    return false;
                }
            }
            return true;
        }, { message: 'Roles "super_admin", "user", and "academy" cannot be assigned through this endpoint. All other roles are allowed.' })
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
        isActive: zod_1.z.boolean().default(true),
        address: addressInputSchema.optional().nullable(),
    }),
});
/**
 * Schema for updating an operational user
 * Note: email and password can only be updated by super_admin (checked in controller)
 */
exports.updateOperationalUserSchema = zod_1.z.object({
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
            // Check if all roles are NOT user, academy, or super_admin (any other role is allowed)
            const disallowedRoles = ['super_admin', 'user', 'academy'];
            for (const role of roles) {
                if (disallowedRoles.includes(role.name)) {
                    return false;
                }
            }
            // Also check by name directly if provided
            for (const roleName of roleNames) {
                if (disallowedRoles.includes(roleName)) {
                    return false;
                }
            }
            return true;
        }, { message: 'Roles "super_admin", "user", and "academy" cannot be assigned through this endpoint. All other roles are allowed.' })
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
        isActive: zod_1.z.boolean().optional(),
        address: addressInputSchema.optional().nullable(),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password is too long')
            .optional(),
    }),
});
//# sourceMappingURL=operationalUser.validation.js.map