import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Media item interface
export interface MediaItem {
  unique_id: string;
  url: string;
  is_active: boolean;
  is_deleted: boolean;
}

// Age range interface
export interface AgeRange {
  min: number;
  max: number;
}

// Address interface (nested in location)
export interface CenterAddress {
  line1?: string | null;
  line2: string;
  city: string;
  state: string;
  country?: string | null;
  pincode: string;
}

// Location interface
export interface CenterLocation {
  latitude: number;
  longitude: number;
  address: CenterAddress;
}

// Operational timing interface
export interface OperationalTiming {
  operating_days: string[]; // ['monday', 'tuesday', etc.]
  opening_time: string; // e.g., '09:00'
  closing_time: string; // e.g., '18:00'
}

// Media interface
export interface CenterMedia {
  images: MediaItem[];
  videos: MediaItem[];
  documents: MediaItem[];
}

// Bank information interface
export interface BankInformation {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  gst_number?: string | null;
}

// Main Coaching Center interface
export interface CoachingCenter {
  center_name: string;
  mobile_number: string;
  email: string;
  description?: string | null;
  rules_regulation?: string | null;
  logo?: string | null;
  sports: Types.ObjectId[]; // References to Sport model
  age: AgeRange;
  location: CenterLocation;
  facility: Types.ObjectId[]; // Array of references to Facility model
  operational_timing: OperationalTiming;
  media: CenterMedia;
  bank_information: BankInformation;
  status: 'draft' | 'published';
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CoachingCenterDocument = HydratedDocument<CoachingCenter>;

// Sub-schemas
const mediaItemSchema = new Schema<MediaItem>(
  {
    unique_id: {
      type: String,
      required: true,
      default: () => uuidv4(),
    },
    url: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const ageRangeSchema = new Schema<AgeRange>(
  {
    min: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const centerAddressSchema = new Schema<CenterAddress>(
  {
    line1: {
      type: String,
      default: null,
    },
    line2: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: null,
    },
    pincode: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const centerLocationSchema = new Schema<CenterLocation>(
  {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    address: {
      type: centerAddressSchema,
      required: true,
    },
  },
  { _id: false }
);

const operationalTimingSchema = new Schema<OperationalTiming>(
  {
    operating_days: {
      type: [String],
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    opening_time: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
    closing_time: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
    },
  },
  { _id: false }
);

const centerMediaSchema = new Schema<CenterMedia>(
  {
    images: {
      type: [mediaItemSchema],
      default: [],
    },
    videos: {
      type: [mediaItemSchema],
      default: [],
    },
    documents: {
      type: [mediaItemSchema],
      default: [],
    },
  },
  { _id: false }
);

const bankInformationSchema = new Schema<BankInformation>(
  {
    bank_name: {
      type: String,
      required: true,
    },
    account_number: {
      type: String,
      required: true,
    },
    ifsc_code: {
      type: String,
      required: true,
      uppercase: true,
    },
    account_holder_name: {
      type: String,
      required: true,
    },
    gst_number: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

// Main schema
const coachingCenterSchema = new Schema<CoachingCenter>(
  {
    center_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mobile_number: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    rules_regulation: {
      type: String,
      default: null,
    },
    logo: {
      type: String,
      default: null,
    },
    sports: {
      type: [Schema.Types.ObjectId],
      ref: 'Sport',
      required: true,
      default: [],
    },
    age: {
      type: ageRangeSchema,
      required: true,
    },
    location: {
      type: centerLocationSchema,
      required: true,
    },
    facility: {
      type: [Schema.Types.ObjectId],
      ref: 'Facility',
      default: [],
    },
    operational_timing: {
      type: operationalTimingSchema,
      required: true,
    },
    media: {
      type: centerMediaSchema,
      default: () => ({
        images: [],
        videos: [],
        documents: [],
      }),
    },
    bank_information: {
      type: bankInformationSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
coachingCenterSchema.index({ center_name: 1 });
coachingCenterSchema.index({ email: 1 });
coachingCenterSchema.index({ mobile_number: 1 });
coachingCenterSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
coachingCenterSchema.index({ sports: 1 });
coachingCenterSchema.index({ facility: 1 });
coachingCenterSchema.index({ status: 1 });
coachingCenterSchema.index({ is_active: 1, is_deleted: 1 });
coachingCenterSchema.index({ status: 1, is_active: 1, is_deleted: 1 });

export const CoachingCenterModel = model<CoachingCenter>('CoachingCenter', coachingCenterSchema);

