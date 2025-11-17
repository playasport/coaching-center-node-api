import { Schema, model, HydratedDocument } from 'mongoose';

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
  createdAt?: Date;
  updatedAt?: Date;
}

export type CountryDocument = HydratedDocument<Country>;
export type StateDocument = HydratedDocument<State>;
export type CityDocument = HydratedDocument<City>;

const countrySchema = new Schema<Country>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    iso2: { type: String, trim: true },
    iso3: { type: String, trim: true },
    phoneCode: { type: String, trim: true },
    currency: { type: String, trim: true },
    currencySymbol: { type: String, trim: true },
    region: { type: String, trim: true },
    subregion: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  {
    timestamps: true,
    collection: 'countries',
  }
);

const stateSchema = new Schema<State>(
  {
    name: { type: String, required: true, trim: true, index: true },
    countryId: { type: String, trim: true, index: true },
    countryCode: { type: String, trim: true, index: true },
    countryName: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  {
    timestamps: true,
    collection: 'states',
  }
);

const citySchema = new Schema<City>(
  {
    name: { type: String, required: true, trim: true, index: true },
    stateId: { type: String, trim: true, index: true },
    stateName: { type: String, trim: true, index: true },
    stateCode: { type: String, trim: true },
    countryId: { type: String, trim: true, index: true },
    countryCode: { type: String, trim: true, index: true },
    countryName: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  {
    timestamps: true,
    collection: 'cities',
  }
);

// Add indexes for better query performance
countrySchema.index({ name: 1 });
countrySchema.index({ iso2: 1 });
stateSchema.index({ countryId: 1, name: 1 });
stateSchema.index({ countryCode: 1, name: 1 });
citySchema.index({ stateId: 1, name: 1 });
citySchema.index({ stateName: 1, name: 1 });
citySchema.index({ countryCode: 1, name: 1 });

export const CountryModel = model<Country>('Country', countrySchema);
export const StateModel = model<State>('State', stateSchema);
export const CityModel = model<City>('City', citySchema);

