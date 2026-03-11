import { Country, State, City } from '../../models/location.model';
import { CreateCountryInput, UpdateCountryInput, CreateStateInput, UpdateStateInput, CreateCityInput, UpdateCityInput } from '../../validations/location.validation';
export interface GetAdminLocationsParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface AdminPaginatedResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface GetAdminCountriesParams extends GetAdminLocationsParams {
    region?: string;
    subregion?: string;
}
/**
 * Get all countries for admin with filters and pagination
 */
export declare const getAllCountries: (params?: GetAdminCountriesParams) => Promise<AdminPaginatedResult<Country>>;
/**
 * Get country by ID
 */
export declare const getCountryById: (id: string) => Promise<Country | null>;
/**
 * Create a new country
 */
export declare const createCountry: (data: CreateCountryInput) => Promise<Country>;
/**
 * Update country
 */
export declare const updateCountry: (id: string, data: UpdateCountryInput) => Promise<Country | null>;
/**
 * Delete country (soft delete with cascade)
 * Soft deletes the country and all associated states and cities
 */
export declare const deleteCountry: (id: string) => Promise<void>;
export interface GetAdminStatesParams extends GetAdminLocationsParams {
    countryId?: string;
    countryCode?: string;
}
/**
 * Get all states for admin with filters and pagination
 */
export declare const getAllStates: (params?: GetAdminStatesParams) => Promise<AdminPaginatedResult<State>>;
/**
 * Get state by ID
 */
export declare const getStateById: (id: string) => Promise<State | null>;
/**
 * Create a new state
 */
export declare const createState: (data: CreateStateInput) => Promise<State>;
/**
 * Update state
 */
export declare const updateState: (id: string, data: UpdateStateInput) => Promise<State | null>;
/**
 * Delete state (soft delete with cascade)
 * Soft deletes the state and all associated cities
 */
export declare const deleteState: (id: string) => Promise<void>;
export interface GetAdminCitiesParams extends GetAdminLocationsParams {
    stateId?: string;
    stateName?: string;
    countryId?: string;
    countryCode?: string;
}
/**
 * Get all cities for admin with filters and pagination
 */
export declare const getAllCities: (params?: GetAdminCitiesParams) => Promise<AdminPaginatedResult<City>>;
/**
 * Get city by ID
 */
export declare const getCityById: (id: string) => Promise<City | null>;
/**
 * Create a new city
 */
export declare const createCity: (data: CreateCityInput) => Promise<City>;
/**
 * Update city
 */
export declare const updateCity: (id: string, data: UpdateCityInput) => Promise<City | null>;
/**
 * Delete city (soft delete)
 */
export declare const deleteCity: (id: string) => Promise<void>;
//# sourceMappingURL=location.service.d.ts.map