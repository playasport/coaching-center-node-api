"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModel = void 0;
const mongoose_1 = require("mongoose");
// Contact address schema
const contactAddressSchema = new mongoose_1.Schema({
    office: { type: String, default: null, trim: true },
    registered: { type: String, default: null, trim: true },
}, { _id: false, strict: false } // strict: false allows additional fields
);
// General settings schema
const generalSettingsSchema = new mongoose_1.Schema({
    ratings_enabled: { type: Boolean, default: true },
}, { _id: false, strict: false });
// Contact info schema
const contactInfoSchema = new mongoose_1.Schema({
    number: { type: [String], default: null },
    email: { type: String, default: null, trim: true, lowercase: true },
    address: { type: contactAddressSchema, default: null },
    whatsapp: { type: String, default: null, trim: true },
    instagram: { type: String, default: null, trim: true },
    facebook: { type: String, default: null, trim: true },
    youtube: { type: String, default: null, trim: true },
}, { _id: false, strict: false } // strict: false allows additional fields
);
// Main settings schema - using strict: false for flexibility
const settingsSchema = new mongoose_1.Schema({
    app_name: { type: String, default: null, trim: true },
    app_logo: { type: String, default: null, trim: true },
    contact: { type: contactInfoSchema, default: null },
    general: { type: generalSettingsSchema, default: null },
}, {
    timestamps: true,
    strict: false, // Allow additional fields not defined in schema
    collection: 'settings',
});
// Ensure only one settings document exists
// Note: unique _id already exists in MongoDB, this does NOT enforce singleton by itself.
// Enforce singleton by forcing a constant key across all documents.
settingsSchema.add({ singletonKey: { type: String, default: 'SETTINGS_SINGLETON', immutable: true } });
settingsSchema.index({ singletonKey: 1 }, { unique: true });
exports.SettingsModel = (0, mongoose_1.model)('Settings', settingsSchema);
//# sourceMappingURL=settings.model.js.map