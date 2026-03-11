"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityModel = exports.StateModel = exports.CountryModel = void 0;
const mongoose_1 = require("mongoose");
const countrySchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    collection: 'countries',
});
const stateSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    countryId: { type: String, trim: true },
    countryCode: { type: String, trim: true },
    countryName: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'states',
});
const citySchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
    collection: 'cities',
});
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
exports.CountryModel = (0, mongoose_1.model)('Country', countrySchema);
exports.StateModel = (0, mongoose_1.model)('State', stateSchema);
exports.CityModel = (0, mongoose_1.model)('City', citySchema);
//# sourceMappingURL=location.model.js.map