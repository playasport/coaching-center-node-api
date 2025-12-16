import { Schema, model, HydratedDocument } from 'mongoose';

// Contact address interface
export interface ContactAddress {
  office?: string | null;
  registered?: string | null;
}

// Contact information interface
export interface ContactInfo {
  number?: string[] | null;
  email?: string | null;
  address?: ContactAddress | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
}

// Settings interface - flexible structure
export interface Settings {
  app_name?: string | null;
  app_logo?: string | null;
  contact?: ContactInfo | null;
  // Additional dynamic fields can be added here
  // Using Schema.Types.Mixed for future flexibility
  [key: string]: any; // Allow additional dynamic fields
}

export type SettingsDocument = HydratedDocument<Settings>;

// Contact address schema
const contactAddressSchema = new Schema<ContactAddress>(
  {
    office: { type: String, default: null, trim: true },
    registered: { type: String, default: null, trim: true },
  },
  { _id: false, strict: false } // strict: false allows additional fields
);

// Contact info schema
const contactInfoSchema = new Schema<ContactInfo>(
  {
    number: { type: [String], default: null },
    email: { type: String, default: null, trim: true, lowercase: true },
    address: { type: contactAddressSchema, default: null },
    whatsapp: { type: String, default: null, trim: true },
    instagram: { type: String, default: null, trim: true },
    facebook: { type: String, default: null, trim: true },
    youtube: { type: String, default: null, trim: true },
  },
  { _id: false, strict: false } // strict: false allows additional fields
);

// Main settings schema - using strict: false for flexibility
const settingsSchema = new Schema<Settings>(
  {
    app_name: { type: String, default: null, trim: true },
    app_logo: { type: String, default: null, trim: true },
    contact: { type: contactInfoSchema, default: null },
  },
  {
    timestamps: true,
    strict: false, // Allow additional fields not defined in schema
    collection: 'settings',
  }
);

// Ensure only one settings document exists
settingsSchema.index({ _id: 1 }, { unique: true });

export const SettingsModel = model<Settings>('Settings', settingsSchema);

