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
 * Schema for creating an operational user (admin, employee, agent - not user/academy/super_admin)
 */
export const createOperationalUserSchema = z.object({
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
        },
        { message: 'Roles "super_admin", "user", and "academy" cannot be assigned through this endpoint. All other roles are allowed.' }
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
    isActive: z.boolean().default(true),
    address: addressInputSchema.optional().nullable(),
  }),
});

export type CreateOperationalUserInput = z.infer<typeof createOperationalUserSchema>['body'];

/**
 * Schema for updating an operational user
 * Note: email and password can only be updated by super_admin (checked in controller)
 */
export const updateOperationalUserSchema = z.object({
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
        },
        { message: 'Roles "super_admin", "user", and "academy" cannot be assigned through this endpoint. All other roles are allowed.' }
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
    isActive: z.boolean().optional(),
    address: addressInputSchema.optional().nullable(),
  }),
});

export type UpdateOperationalUserInput = z.infer<typeof updateOperationalUserSchema>['body'];

