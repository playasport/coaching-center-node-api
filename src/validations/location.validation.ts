import { z } from 'zod';

// ==================== COUNTRY VALIDATION ====================

/**
 * Create country validation schema
 */
export const createCountrySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
    code: z.string().max(10).nullable().optional(),
    iso2: z.string().length(2, 'ISO2 must be exactly 2 characters').nullable().optional(),
    iso3: z.string().length(3, 'ISO3 must be exactly 3 characters').nullable().optional(),
    phoneCode: z.string().max(10).nullable().optional(),
    currency: z.string().max(10).nullable().optional(),
    currencySymbol: z.string().max(10).nullable().optional(),
    region: z.string().max(100).nullable().optional(),
    subregion: z.string().max(100).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
});

/**
 * Update country validation schema
 */
export const updateCountrySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').optional(),
    code: z.string().max(10).nullable().optional(),
    iso2: z.string().length(2, 'ISO2 must be exactly 2 characters').nullable().optional(),
    iso3: z.string().length(3, 'ISO3 must be exactly 3 characters').nullable().optional(),
    phoneCode: z.string().max(10).nullable().optional(),
    currency: z.string().max(10).nullable().optional(),
    currencySymbol: z.string().max(10).nullable().optional(),
    region: z.string().max(100).nullable().optional(),
    subregion: z.string().max(100).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
});

/**
 * Get countries query validation schema
 */
export const getCountriesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    region: z.string().optional(),
    subregion: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// ==================== STATE VALIDATION ====================

/**
 * Create state validation schema
 */
export const createStateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
    countryId: z.string().min(1, 'Country ID or Country Code is required').optional(),
    countryCode: z.string().min(1, 'Country ID or Country Code is required').optional(),
    stateCode: z.string().max(10).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }).refine((data) => data.countryId || data.countryCode, {
    message: 'Either countryId or countryCode is required',
    path: ['countryId'],
  }),
});

/**
 * Update state validation schema
 */
export const updateStateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').optional(),
    countryId: z.string().min(1).optional(),
    countryCode: z.string().min(1).optional(),
    stateCode: z.string().max(10).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
});

/**
 * Get states query validation schema
 */
export const getStatesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    countryId: z.string().optional(),
    countryCode: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// ==================== CITY VALIDATION ====================

/**
 * Create city validation schema
 */
export const createCitySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
    stateId: z.string().min(1, 'State ID or State Name is required').optional(),
    stateName: z.string().min(1, 'State ID or State Name is required').optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }).refine((data) => data.stateId || data.stateName, {
    message: 'Either stateId or stateName is required',
    path: ['stateId'],
  }),
});

/**
 * Update city validation schema
 */
export const updateCitySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').optional(),
    stateId: z.string().min(1).optional(),
    stateName: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
});

/**
 * Get cities query validation schema
 */
export const getCitiesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
    stateId: z.string().optional(),
    stateName: z.string().optional(),
    countryId: z.string().optional(),
    countryCode: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// ==================== TYPE EXPORTS ====================

export type CreateCountryInput = z.infer<typeof createCountrySchema>['body'];
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>['body'];
export type CreateStateInput = z.infer<typeof createStateSchema>['body'];
export type UpdateStateInput = z.infer<typeof updateStateSchema>['body'];
export type CreateCityInput = z.infer<typeof createCitySchema>['body'];
export type UpdateCityInput = z.infer<typeof updateCitySchema>['body'];

