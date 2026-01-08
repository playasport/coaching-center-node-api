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

// Fee configuration interface
export interface FeeConfig {
  platform_fee?: number | null;
  gst_percentage?: number | null;
  gst_enabled?: boolean | null;
  currency?: string | null;
}

// SMS configuration interface
export interface SmsConfig {
  enabled?: boolean | null;
  provider?: string | null;
  api_key?: string | null; // Encrypted
  api_secret?: string | null; // Encrypted
  from_number?: string | null;
  sender_id?: string | null;
}

// Email configuration interface
export interface EmailConfig {
  enabled?: boolean | null;
  host?: string | null;
  port?: number | null;
  username?: string | null; // Encrypted
  password?: string | null; // Encrypted
  from?: string | null;
  from_name?: string | null;
  secure?: boolean | null;
}

// WhatsApp configuration interface
export interface WhatsAppConfig {
  enabled?: boolean | null;
  provider?: string | null;
  api_key?: string | null; // Encrypted
  api_secret?: string | null; // Encrypted
  from_number?: string | null;
  account_sid?: string | null; // Encrypted (for Twilio)
  auth_token?: string | null; // Encrypted (for Twilio)
}

// Notification configuration interface
export interface NotificationConfig {
  enabled?: boolean | null;
  sms?: SmsConfig | null;
  email?: EmailConfig | null;
  whatsapp?: WhatsAppConfig | null;
  push?: {
    enabled?: boolean | null;
  } | null;
}

// Payment configuration interface
export interface PaymentConfig {
  enabled?: boolean | null;
  gateway?: string | null; // 'razorpay' | 'stripe' | 'payu' | 'cashfree'
  razorpay?: {
    key_id?: string | null; // Encrypted
    key_secret?: string | null; // Encrypted
    enabled?: boolean | null;
  } | null;
  stripe?: {
    api_key?: string | null; // Encrypted
    secret_key?: string | null; // Encrypted
    enabled?: boolean | null;
  } | null;
  // Add other payment gateways as needed
}

// Basic information interface (extended)
export interface BasicInfo {
  app_name?: string | null;
  app_logo?: string | null;
  about_us?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
}

// Settings interface - flexible structure
export interface Settings {
  // Basic Information
  app_name?: string | null;
  app_logo?: string | null;
  contact?: ContactInfo | null;
  basic_info?: BasicInfo | null;
  
  // Fee Configuration
  fees?: FeeConfig | null;
  
  // Notification Configuration
  notifications?: NotificationConfig | null;
  
  // Payment Configuration
  payment?: PaymentConfig | null;
  
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
// Note: unique _id already exists in MongoDB, this does NOT enforce singleton by itself.
// Enforce singleton by forcing a constant key across all documents.
settingsSchema.add({ singletonKey: { type: String, default: 'SETTINGS_SINGLETON', immutable: true } });
settingsSchema.index({ singletonKey: 1 }, { unique: true });

export const SettingsModel = model<Settings>('Settings', settingsSchema);

