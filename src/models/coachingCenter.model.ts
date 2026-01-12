import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CoachingCenterStatus } from '../enums/coachingCenterStatus.enum';
import { OperatingDays } from '../enums/operatingDays.enum';
import { Gender } from '../enums/gender.enum';

// Media item interface (for images and documents)
export interface MediaItem {
  unique_id: string;
  url: string;
  is_active: boolean;
  is_deleted: boolean;
  is_banner?: boolean; // Mark if this image is used as banner for the center
  deletedAt?: Date | null; // Track when media was soft deleted
}

// Video item interface (with thumbnail)
export interface VideoItem {
  unique_id: string;
  url: string;
  thumbnail?: string | null; // Thumbnail URL (auto-generated if not provided)
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null; // Track when media was soft deleted
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

// Sport detail interface (NEW)
export interface SportDetail {
  sport_id: Types.ObjectId; // Reference to Sport model
  description: string; // Sport-specific description
  images: MediaItem[]; // Sport-specific images
  videos: VideoItem[]; // Sport-specific videos with thumbnails
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
  id: string;
  user: Types.ObjectId; // Reference to User model (_id) - the academy owner
  addedBy?: Types.ObjectId | null; // Reference to User model (_id) - the admin user who created this (only set when created via admin route)
  center_name: string;
  mobile_number: string;
  email: string;
  rules_regulation?: string[] | null;
  logo?: string | null;
  sports: Types.ObjectId[]; // References to Sport model (for quick search)
  sport_details: SportDetail[]; // Sport-specific data (description, images, videos)
  age: AgeRange;
  location: CenterLocation;
  facility: Types.ObjectId[]; // Array of references to Facility model
  operational_timing: OperationalTiming;
  documents: MediaItem[]; // General documents (not sport-specific)
  bank_information: BankInformation;
  status: CoachingCenterStatus;
  allowed_genders: Gender[];
  allowed_disabled: boolean;
  is_only_for_disabled: boolean;
  experience: number; // Number of years of experience
  is_active: boolean;
  approval_status: 'approved' | 'rejected' | 'pending_approval';
  reject_reason?: string | null;
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
    is_banner: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
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
      enum: Object.values(OperatingDays),
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

// Video item schema (with thumbnail)
const videoItemSchema = new Schema<VideoItem>(
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
    thumbnail: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// Sport detail schema
const sportDetailSchema = new Schema<SportDetail>(
  {
    sport_id: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [mediaItemSchema],
      default: [],
    },
    videos: {
      type: [videoItemSchema],
      default: [],
    },
  },
  { _id: false }
);


const bankInformationSchema = new Schema<BankInformation>(
  {
    bank_name: {
      type: String,
      required: false,
      default: null,
    },
    account_number: {
      type: String,
      required: false,
      default: null,
    },
    ifsc_code: {
      type: String,
      required: false,
      uppercase: true,
      default: null,
    },
    account_holder_name: {
      type: String,
      required: false,
      default: null,
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
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    center_name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile_number: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    rules_regulation: {
      type: [String],
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
    sport_details: {
      type: [sportDetailSchema],
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
    documents: {
      type: [mediaItemSchema],
      default: [],
    },
    bank_information: {
      type: bankInformationSchema,
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(CoachingCenterStatus),
      default: CoachingCenterStatus.DRAFT,
    },
    allowed_genders: {
      type: [String],
      enum: Object.values(Gender),
      required: true,
      validate: {
        validator: function(v: string[]) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one gender must be selected',
      },
    },
    allowed_disabled: {
      type: Boolean,
      required: true,
    },
    is_only_for_disabled: {
      type: Boolean,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    approval_status: {
      type: String,
      enum: ['approved', 'rejected', 'pending_approval'],
      default: 'approved',
      index: true,
    },
    reject_reason: {
      type: String,
      default: null,
      maxlength: 500,
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
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
      },
    },
  }
);

// Indexes
coachingCenterSchema.index({ user: 1 });
coachingCenterSchema.index({ addedBy: 1 });
coachingCenterSchema.index({ center_name: 1 });
coachingCenterSchema.index({ email: 1 });
coachingCenterSchema.index({ mobile_number: 1 });
coachingCenterSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
coachingCenterSchema.index({ sports: 1 });
coachingCenterSchema.index({ 'sport_details.sport_id': 1 });
coachingCenterSchema.index({ facility: 1 });
coachingCenterSchema.index({ status: 1 });
coachingCenterSchema.index({ is_active: 1, is_deleted: 1 });
coachingCenterSchema.index({ status: 1, is_active: 1, is_deleted: 1 });
coachingCenterSchema.index({ user: 1, is_deleted: 1 });
coachingCenterSchema.index({ user: 1, status: 1, is_deleted: 1 });

// Meilisearch indexing hooks - using queue for non-blocking indexing
coachingCenterSchema.post('save', async function (doc) {
  try {
    if (doc.id) {
      const { enqueueMeilisearchIndexing, IndexingJobType } = await import('../queue/meilisearchIndexingQueue');
      await enqueueMeilisearchIndexing(IndexingJobType.INDEX_COACHING_CENTER, doc.id);
    }
  } catch (error) {
    // Silently fail - Meilisearch indexing is optional
  }
});

coachingCenterSchema.post('findOneAndUpdate', async function (doc) {
  try {
    if (doc && doc.id) {
      const { enqueueMeilisearchIndexing, IndexingJobType } = await import('../queue/meilisearchIndexingQueue');
      await enqueueMeilisearchIndexing(IndexingJobType.UPDATE_COACHING_CENTER, doc.id);
    }
  } catch (error) {
    // Silently fail - Meilisearch indexing is optional
  }
});

coachingCenterSchema.post('findOneAndDelete', async function (doc) {
  try {
    if (doc && doc.id) {
      const { enqueueMeilisearchIndexing, IndexingJobType } = await import('../queue/meilisearchIndexingQueue');
      await enqueueMeilisearchIndexing(IndexingJobType.DELETE_COACHING_CENTER, doc.id);
    }
  } catch (error) {
    // Silently fail - Meilisearch indexing is optional
  }
});

export const CoachingCenterModel = model<CoachingCenter>('CoachingCenter', coachingCenterSchema);

