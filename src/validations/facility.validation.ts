import { z } from 'zod';

/**
 * Create facility validation schema
 */
export const createFacilitySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    description: z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
    icon: z.string().url('Invalid icon URL').nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

/**
 * Update facility validation schema
 */
export const updateFacilitySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
    description: z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
    icon: z.string().url('Invalid icon URL').nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

/**
 * Get facilities query validation schema
 */
export const getFacilitiesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>['body'];
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>['body'];

