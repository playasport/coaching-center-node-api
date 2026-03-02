"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCitiesQuerySchema = exports.updateCitySchema = exports.createCitySchema = exports.getStatesQuerySchema = exports.updateStateSchema = exports.createStateSchema = exports.getCountriesQuerySchema = exports.updateCountrySchema = exports.createCountrySchema = void 0;
const zod_1 = require("zod");
// ==================== COUNTRY VALIDATION ====================
/**
 * Create country validation schema
 */
exports.createCountrySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
        code: zod_1.z.string().max(10).nullable().optional(),
        iso2: zod_1.z.string().length(2, 'ISO2 must be exactly 2 characters').nullable().optional(),
        iso3: zod_1.z.string().length(3, 'ISO3 must be exactly 3 characters').nullable().optional(),
        phoneCode: zod_1.z.string().max(10).nullable().optional(),
        currency: zod_1.z.string().max(10).nullable().optional(),
        currencySymbol: zod_1.z.string().max(10).nullable().optional(),
        region: zod_1.z.string().max(100).nullable().optional(),
        subregion: zod_1.z.string().max(100).nullable().optional(),
        latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
        longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    }),
});
/**
 * Update country validation schema
 */
exports.updateCountrySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').optional(),
        code: zod_1.z.string().max(10).nullable().optional(),
        iso2: zod_1.z.string().length(2, 'ISO2 must be exactly 2 characters').nullable().optional(),
        iso3: zod_1.z.string().length(3, 'ISO3 must be exactly 3 characters').nullable().optional(),
        phoneCode: zod_1.z.string().max(10).nullable().optional(),
        currency: zod_1.z.string().max(10).nullable().optional(),
        currencySymbol: zod_1.z.string().max(10).nullable().optional(),
        region: zod_1.z.string().max(100).nullable().optional(),
        subregion: zod_1.z.string().max(100).nullable().optional(),
        latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
        longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    }),
});
/**
 * Get countries query validation schema
 */
exports.getCountriesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        search: zod_1.z.string().optional(),
        region: zod_1.z.string().optional(),
        subregion: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
// ==================== STATE VALIDATION ====================
/**
 * Create state validation schema
 */
exports.createStateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
        countryId: zod_1.z.string().min(1, 'Country ID or Country Code is required').optional(),
        countryCode: zod_1.z.string().min(1, 'Country ID or Country Code is required').optional(),
        stateCode: zod_1.z.string().max(10).nullable().optional(),
        latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
        longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    }).refine((data) => data.countryId || data.countryCode, {
        message: 'Either countryId or countryCode is required',
        path: ['countryId'],
    }),
});
/**
 * Update state validation schema
 */
exports.updateStateSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').optional(),
        countryId: zod_1.z.string().min(1).optional(),
        countryCode: zod_1.z.string().min(1).optional(),
        stateCode: zod_1.z.string().max(10).nullable().optional(),
        latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
        longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    }),
});
/**
 * Get states query validation schema
 */
exports.getStatesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        search: zod_1.z.string().optional(),
        countryId: zod_1.z.string().optional(),
        countryCode: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
// ==================== CITY VALIDATION ====================
/**
 * Create city validation schema
 */
exports.createCitySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
        stateId: zod_1.z.string().min(1, 'State ID or State Name is required').optional(),
        stateName: zod_1.z.string().min(1, 'State ID or State Name is required').optional(),
        latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
        longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    }).refine((data) => data.stateId || data.stateName, {
        message: 'Either stateId or stateName is required',
        path: ['stateId'],
    }),
});
/**
 * Update city validation schema
 */
exports.updateCitySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters').optional(),
        stateId: zod_1.z.string().min(1).optional(),
        stateName: zod_1.z.string().min(1).optional(),
        latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
        longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
    }),
});
/**
 * Get cities query validation schema
 */
exports.getCitiesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        search: zod_1.z.string().optional(),
        stateId: zod_1.z.string().optional(),
        stateName: zod_1.z.string().optional(),
        countryId: zod_1.z.string().optional(),
        countryCode: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    }),
});
//# sourceMappingURL=location.validation.js.map