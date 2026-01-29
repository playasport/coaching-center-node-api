import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';
import { UserModel } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { Gender } from '../enums/gender.enum';
import { Types } from 'mongoose';

const mobileNumberSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, validationMessages.mobileNumber.invalidPattern())
  .optional()
  .nullable();

const addressInputSchema = z.object({
  line1: z.string().max(255).optional().nullable(),
  line2: z.string().min(1).max(255),
  area: z.string().max(255).optional().nullable(),
  city: z.string().min(1).max(255),
  state: z.string().min(1).max(255),
  country: z.string().min(1).max(255).optional().nullable().transform((val) => val || 'India'),
  pincode: z
    .string()
    .regex(/^\d{6}$/, validationMessages.address.pincodeInvalid())
    .min(6)
    .max(6),
});

/**
 * Schema for creating a user via admin panel
 */
export const createAdminUserSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid())
      .refine(
        async (email) => {
          const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
          return !existingUser;
        },
        { message: 'Email already exists' }
      ),
    firstName: z
      .string({ message: 'First name is required' })
      .min(1, 'First name is required')
      .max(100, 'First name is too long'),
    lastName: z.string().max(100, 'Last name is too long').optional().nullable(),
    mobile: mobileNumberSchema,
    gender: z.nativeEnum(Gender).optional().nullable(),
    dob: z
      .string()
      .datetime()
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
    roles: z
      .array(z.string())
      .min(1, 'At least one role is required')
      .refine(
        async (roleInputs) => {
          // Separate role names and ObjectIds
          const roleNames: string[] = [];
          const roleIds: Types.ObjectId[] = [];
          
          for (const input of roleInputs) {
            if (Types.ObjectId.isValid(input)) {
              roleIds.push(new Types.ObjectId(input));
            } else {
              roleNames.push(input);
            }
          }
          
          // Query roles to get their names
          const queryConditions: any[] = [];
          if (roleNames.length > 0) {
            queryConditions.push({ name: { $in: roleNames } });
          }
          if (roleIds.length > 0) {
            queryConditions.push({ _id: { $in: roleIds } });
          }
          
          if (queryConditions.length === 0) {
            return false;
          }
          
          const roles = await RoleModel.find({
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
        },
        { message: 'Only "user" and "academy" roles are allowed. Other roles (super_admin, admin, employee, agent) cannot be assigned through this endpoint.' }
      )
      .refine(
        async (roleInputs) => {
          // Separate role names and ObjectIds
          const roleNames: string[] = [];
          const roleIds: Types.ObjectId[] = [];
          
          for (const input of roleInputs) {
            if (Types.ObjectId.isValid(input)) {
              roleIds.push(new Types.ObjectId(input));
            } else {
              roleNames.push(input);
            }
          }
          
          // Query roles by name and/or _id
          const queryConditions: any[] = [];
          if (roleNames.length > 0) {
            queryConditions.push({ name: { $in: roleNames } });
          }
          if (roleIds.length > 0) {
            queryConditions.push({ _id: { $in: roleIds } });
          }
          
          if (queryConditions.length === 0) {
            return false;
          }
          
          const roles = await RoleModel.find({
            $or: queryConditions
          });
          
          // Verify all inputs were found
          return roles.length === roleInputs.length;
        },
        { message: 'One or more roles are invalid' }
      ),
    userType: z.enum(['student', 'guardian', 'academy']).optional().nullable(),
    isActive: z.boolean().default(true),
    address: addressInputSchema.optional().nullable(),
  }),
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>['body'];

/**
 * Schema for updating a user via admin panel
 * Note: email and password can only be updated by super_admin (checked in controller)
 */
export const updateAdminUserSchema = z.object({
  body: z.object({
    email: z
      .string({ message: validationMessages.email.required() })
      .min(1, validationMessages.email.required())
      .email(validationMessages.email.invalid())
      .optional(),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name is too long')
      .optional(),
    lastName: z.string().max(100, 'Last name is too long').optional().nullable(),
    mobile: mobileNumberSchema,
    gender: z.nativeEnum(Gender).optional().nullable(),
    dob: z
      .string()
      .datetime()
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
    roles: z
      .array(z.string())
      .min(1, 'At least one role is required')
      .refine(
        async (roleInputs) => {
          // Separate role names and ObjectIds
          const roleNames: string[] = [];
          const roleIds: Types.ObjectId[] = [];
          
          for (const input of roleInputs) {
            if (Types.ObjectId.isValid(input)) {
              roleIds.push(new Types.ObjectId(input));
            } else {
              roleNames.push(input);
            }
          }
          
          // Query roles to get their names
          const queryConditions: any[] = [];
          if (roleNames.length > 0) {
            queryConditions.push({ name: { $in: roleNames } });
          }
          if (roleIds.length > 0) {
            queryConditions.push({ _id: { $in: roleIds } });
          }
          
          if (queryConditions.length === 0) {
            return false;
          }
          
          const roles = await RoleModel.find({
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
        },
        { message: 'Only "user" and "academy" roles are allowed. Other roles (super_admin, admin, employee, agent) cannot be assigned through this endpoint.' }
      )
      .refine(
        async (roleInputs) => {
          // Separate role names and ObjectIds
          const roleNames: string[] = [];
          const roleIds: Types.ObjectId[] = [];
          
          for (const input of roleInputs) {
            if (Types.ObjectId.isValid(input)) {
              roleIds.push(new Types.ObjectId(input));
            } else {
              roleNames.push(input);
            }
          }
          
          // Query roles by name and/or _id
          const queryConditions: any[] = [];
          if (roleNames.length > 0) {
            queryConditions.push({ name: { $in: roleNames } });
          }
          if (roleIds.length > 0) {
            queryConditions.push({ _id: { $in: roleIds } });
          }
          
          if (queryConditions.length === 0) {
            return false;
          }
          
          const roles = await RoleModel.find({
            $or: queryConditions
          });
          
          // Verify all inputs were found
          return roles.length === roleInputs.length;
        },
        { message: 'One or more roles are invalid' }
      )
      .optional(),
    userType: z.enum(['student', 'guardian', 'academy']).optional().nullable(),
    isActive: z.boolean().optional(),
    address: addressInputSchema.optional().nullable(),
  }),
});

export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>['body'];
