import { z } from 'zod';
/**
 * Create country validation schema
 */
export declare const createCountrySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        iso2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        iso3: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currencySymbol: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        region: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        subregion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update country validation schema
 */
export declare const updateCountrySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        iso2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        iso3: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currencySymbol: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        region: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        subregion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Get countries query validation schema
 */
export declare const getCountriesQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        region: z.ZodOptional<z.ZodString>;
        subregion: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Create state validation schema
 */
export declare const createStateSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        countryId: z.ZodOptional<z.ZodString>;
        countryCode: z.ZodOptional<z.ZodString>;
        stateCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update state validation schema
 */
export declare const updateStateSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        countryId: z.ZodOptional<z.ZodString>;
        countryCode: z.ZodOptional<z.ZodString>;
        stateCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Get states query validation schema
 */
export declare const getStatesQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        countryId: z.ZodOptional<z.ZodString>;
        countryCode: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Create city validation schema
 */
export declare const createCitySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        stateId: z.ZodOptional<z.ZodString>;
        stateName: z.ZodOptional<z.ZodString>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update city validation schema
 */
export declare const updateCitySchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        stateId: z.ZodOptional<z.ZodString>;
        stateName: z.ZodOptional<z.ZodString>;
        latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Get cities query validation schema
 */
export declare const getCitiesQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        stateId: z.ZodOptional<z.ZodString>;
        stateName: z.ZodOptional<z.ZodString>;
        countryId: z.ZodOptional<z.ZodString>;
        countryCode: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            asc: "asc";
            desc: "desc";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateCountryInput = z.infer<typeof createCountrySchema>['body'];
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>['body'];
export type CreateStateInput = z.infer<typeof createStateSchema>['body'];
export type UpdateStateInput = z.infer<typeof updateStateSchema>['body'];
export type CreateCityInput = z.infer<typeof createCitySchema>['body'];
export type UpdateCityInput = z.infer<typeof updateCitySchema>['body'];
//# sourceMappingURL=location.validation.d.ts.map