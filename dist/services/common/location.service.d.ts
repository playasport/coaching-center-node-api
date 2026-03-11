import { Country, State } from '../../models/location.model';
export declare const getAllCountries: () => Promise<Country[]>;
export declare const getStatesByCountry: (countryCode: string) => Promise<State[]>;
export interface CityResponse {
    _id?: string;
    name: string;
    state?: {
        id?: string;
        name?: string;
        code?: string;
    };
    country?: {
        id?: string;
        name?: string;
        code?: string;
    };
    latitude?: number;
    longitude?: number;
}
export declare const getCitiesByState: (stateName: string, countryCode?: string) => Promise<CityResponse[]>;
export declare const getCitiesByStateId: (stateId: string) => Promise<CityResponse[]>;
export interface TopCity {
    city: string;
    state: string;
    academyCount: number;
    sportsCount: number;
}
export declare const getTopCities: (limit?: number) => Promise<TopCity[]>;
//# sourceMappingURL=location.service.d.ts.map