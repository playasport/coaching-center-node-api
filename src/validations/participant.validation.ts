import { z } from 'zod';

// Address schema for participant (all fields optional to match original SQL schema)
const participantAddressSchema = z.object({
  line1: z.string().max(255).optional().nullable(),
  line2: z.string().max(255).optional().nullable(),
  area: z.string().max(255).optional().nullable(),
  city: z.string().max(255).optional().nullable(),
  state: z.string().max(255).optional().nullable(),
  country: z.string().max(255).optional().nullable(),
  pincode: z.string().max(191).optional().nullable(),
});

// Participant create schema
export const participantCreateSchema = z.object({
  body: z.object({
    userId: z.string().optional(), // Optional - automatically set from logged-in user
    firstName: z.string().max(191, 'First name must be less than 191 characters').optional().nullable(),
    lastName: z.string().max(191, 'Last name must be less than 191 characters').optional().nullable(),
    gender: z.enum(['0', '1', '2']).optional().nullable().transform((val) => val !== null && val !== undefined ? parseInt(val) : null),
    disability: z.enum(['0', '1']).optional().default('0').transform((val) => parseInt(val)),
    dob: z.string().date('Date of birth must be a valid date').optional().nullable(),
    schoolName: z.string().max(191, 'School name must be less than 191 characters').optional().nullable(),
    contactNumber: z.string().max(255, 'Contact number must be less than 255 characters').optional().nullable(),
    profilePhoto: z.string().url('Profile photo must be a valid URL').max(191, 'Profile photo URL must be less than 191 characters').optional().nullable(),
    address: participantAddressSchema.optional().nullable(),
    // isSelf is not allowed in create - it's automatically set to null for manually created participants
    // Only the system sets isSelf = '1' when creating a user
  }),
});

// Participant update schema (all fields optional)
export const participantUpdateSchema = z.object({
  body: z.object({
    firstName: z.string().max(191, 'First name must be less than 191 characters').optional().nullable(),
    lastName: z.string().max(191, 'Last name must be less than 191 characters').optional().nullable(),
    gender: z.enum(['0', '1', '2']).optional().nullable().transform((val) => val !== null && val !== undefined ? parseInt(val) : null),
    disability: z.enum(['0', '1']).optional().transform((val) => val !== undefined ? parseInt(val) : undefined),
    dob: z.string().date('Date of birth must be a valid date').optional().nullable(),
    schoolName: z.string().max(191, 'School name must be less than 191 characters').optional().nullable(),
    contactNumber: z.string().max(255, 'Contact number must be less than 255 characters').optional().nullable(),
    profilePhoto: z.string().url('Profile photo must be a valid URL').max(191, 'Profile photo URL must be less than 191 characters').optional().nullable(),
    address: participantAddressSchema.optional().nullable(),
    isSelf: z.string().max(191, 'isSelf must be less than 191 characters').optional().nullable(),
  }),
});

// Type exports for use in controllers and services
export type ParticipantCreateInput = z.infer<typeof participantCreateSchema>['body'];
export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>['body'];

