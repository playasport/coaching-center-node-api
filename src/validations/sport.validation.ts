import { z } from 'zod';

export const createSportSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Sport name is required' }).min(1).max(100),
    logo: z.string().url('Invalid logo URL').optional().nullable(),
    is_active: z.boolean().optional().default(true),
    is_popular: z.boolean().optional().default(false),
  }),
});

export const updateSportSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    logo: z.string().url('Invalid logo URL').optional().nullable(),
    is_active: z.boolean().optional(),
    is_popular: z.boolean().optional(),
  }),
});

export type CreateSportInput = z.infer<typeof createSportSchema>['body'];
export type UpdateSportInput = z.infer<typeof updateSportSchema>['body'];
