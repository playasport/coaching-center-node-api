import { z } from 'zod';

export const createSportSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Sport name is required' })
      .min(1, 'Sport name must be at least 1 character')
      .max(100, 'Sport name must not exceed 100 characters')
      .trim(),
    logo: z
      .union([z.string().url('Invalid logo URL'), z.string().length(0)]) // Allow empty string for multipart
      .optional()
      .nullable()
      .transform((val) => (val === '' ? undefined : val)), // Convert empty string to undefined
    is_active: z
      .union([
        z.boolean(),
        z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
      ])
      .optional()
      .default(true),
    is_popular: z
      .union([
        z.boolean(),
        z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
      ])
      .optional()
      .default(false),
  }),
});

export const updateSportSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Sport name must be at least 1 character')
      .max(100, 'Sport name must not exceed 100 characters')
      .trim()
      .optional(),
    logo: z
      .union([z.string().url('Invalid logo URL'), z.string().length(0)]) // Allow empty string for multipart
      .optional()
      .nullable()
      .transform((val) => (val === '' ? undefined : val)), // Convert empty string to undefined
    is_active: z
      .union([
        z.boolean(),
        z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
      ])
      .optional(),
    is_popular: z
      .union([
        z.boolean(),
        z.string().transform((val) => val === 'true' || val === '1'), // Handle string booleans from form-data
      ])
      .optional(),
  }),
});

export type CreateSportInput = z.infer<typeof createSportSchema>['body'];
export type UpdateSportInput = z.infer<typeof updateSportSchema>['body'];
