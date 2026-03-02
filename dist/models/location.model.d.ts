import { HydratedDocument } from 'mongoose';
export interface Country {
    _id?: string;
    name: string;
    code?: string;
    iso2?: string;
    iso3?: string;
    phoneCode?: string;
    currency?: string;
    currencySymbol?: string;
    region?: string;
    subregion?: string;
    latitude?: number;
    longitude?: number;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface State {
    _id?: string;
    name: string;
    countryId?: string;
    countryCode?: string;
    countryName?: string;
    stateCode?: string;
    latitude?: number;
    longitude?: number;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface City {
    _id?: string;
    name: string;
    stateId?: string;
    stateName?: string;
    stateCode?: string;
    countryId?: string;
    countryCode?: string;
    countryName?: string;
    latitude?: number;
    longitude?: number;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export type CountryDocument = HydratedDocument<Country>;
export type StateDocument = HydratedDocument<State>;
export type CityDocument = HydratedDocument<City>;
export declare const CountryModel: import("mongoose").Model<Country, {}, {}, {}, import("mongoose").Document<unknown, {}, Country, {}, {}> & Country & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export declare const StateModel: import("mongoose").Model<State, {}, {}, {}, import("mongoose").Document<unknown, {}, State, {}, {}> & State & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export declare const CityModel: import("mongoose").Model<City, {}, {}, {}, import("mongoose").Document<unknown, {}, City, {}, {}> & City & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=location.model.d.ts.map