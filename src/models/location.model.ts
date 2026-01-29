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
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'countries',
  }
);

const stateSchema = new Schema<State>(
  {
    name: { type: String, required: true, trim: true },
    countryId: { type: String, trim: true },
    countryCode: { type: String, trim: true },
    countryName: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'states',
  }
);

const citySchema = new Schema<City>(
  {
    name: { type: String, required: true, trim: true },
    stateId: { type: String, trim: true },
    stateName: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    countryId: { type: String, trim: true },
    countryCode: { type: String, trim: true },
    countryName: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'cities',
  }
);

// Add indexes for better query performance
// Country indexes
countrySchema.index({ name: 1, isDeleted: 1 });
countrySchema.index({ iso2: 1, isDeleted: 1 });
countrySchema.index({ isDeleted: 1, name: 1 }); // For sorted queries

// State indexes - optimized for $or queries
stateSchema.index({ countryCode: 1, isDeleted: 1, name: 1 }); // Compound index for countryCode queries
stateSchema.index({ countryId: 1, isDeleted: 1, name: 1 }); // Compound index for countryId queries
stateSchema.index({ _id: 1, isDeleted: 1 }); // For ObjectId lookups
stateSchema.index({ isDeleted: 1, name: 1 }); // For sorted queries

// City indexes - optimized for state lookups
citySchema.index({ stateId: 1, isDeleted: 1, name: 1 }); // Primary lookup by stateId
citySchema.index({ stateName: 1, isDeleted: 1, name: 1 }); // Fallback lookup by stateName
citySchema.index({ _id: 1, isDeleted: 1 }); // For ObjectId lookups
citySchema.index({ countryCode: 1, isDeleted: 1, name: 1 }); // For country-based queries
citySchema.index({ countryId: 1, isDeleted: 1, name: 1 }); // For country-based queries
citySchema.index({ isDeleted: 1, name: 1 }); // For sorted queries

export const CountryModel = model<Country>('Country', countrySchema);
export const StateModel = model<State>('State', stateSchema);
export const CityModel = model<City>('City', citySchema);

