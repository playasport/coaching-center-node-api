import { Schema, model, HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Banner position enum
export enum BannerPosition {
  HOMEPAGE_TOP = 'homepage_top',
  HOMEPAGE_MIDDLE = 'homepage_middle',
  HOMEPAGE_BOTTOM = 'homepage_bottom',
  CATEGORY_TOP = 'category_top',
  CATEGORY_SIDEBAR = 'category_sidebar',
  SPORT_PAGE = 'sport_page',
  CENTER_PAGE = 'center_page',
  SEARCH_RESULTS = 'search_results',
  MOBILE_APP_HOME = 'mobile_app_home',
  MOBILE_APP_CATEGORY = 'mobile_app_category',
}

// Banner status enum
export enum BannerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
  DRAFT = 'draft',
}

// Banner target audience enum
export enum BannerTargetAudience {
  ALL = 'all',
  NEW_USERS = 'new_users',
  EXISTING_USERS = 'existing_users',
  PREMIUM_USERS = 'premium_users',
  MOBILE_USERS = 'mobile_users',
  WEB_USERS = 'web_users',
}

// Banner interface
export interface Banner {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string; // Main banner image URL
  mobileImageUrl?: string | null; // Optional mobile-specific image
  linkUrl?: string | null; // URL to redirect when banner is clicked
  linkType?: 'internal' | 'external' | null; // Type of link
  position: BannerPosition; // Where the banner should be displayed
  priority: number; // Display order (higher number = higher priority)
  status: BannerStatus;
  targetAudience: BannerTargetAudience;
  isActive: boolean; // Quick enable/disable toggle
  isOnlyForAcademy: boolean; // If true, banner is only shown to academies, not to regular users
  clickCount: number; // Track banner clicks
  viewCount: number; // Track banner views
  sportIds?: string[] | null; // Show banner only for specific sports
  centerIds?: string[] | null; // Show banner only for specific centers
  metadata?: Record<string, any> | null; // Additional metadata
  createdBy?: string | null; // Admin user ID who created the banner
  updatedBy?: string | null; // Admin user ID who last updated
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type BannerDocument = HydratedDocument<Banner>;

// Main banner schema
const bannerSchema = new Schema<Banner>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    mobileImageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    linkUrl: {
      type: String,
      default: null,
      trim: true,
    },
    linkType: {
      type: String,
      enum: ['internal', 'external', null],
      default: null,
    },
    position: {
      type: String,
      enum: Object.values(BannerPosition),
      required: true,
      index: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Priority cannot be negative'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BannerStatus),
      required: true,
      default: BannerStatus.DRAFT,
      index: true,
    },
    targetAudience: {
      type: String,
      enum: Object.values(BannerTargetAudience),
      required: true,
      default: BannerTargetAudience.ALL,
      index: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    isOnlyForAcademy: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    clickCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Click count cannot be negative'],
    },
    viewCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'View count cannot be negative'],
    },
    sportIds: {
      type: [String],
      default: null,
      index: true,
    },
    centerIds: {
      type: [String],
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
      index: true,
    },
    updatedBy: {
      type: String,
      default: null,
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

// Indexes for better query performance
bannerSchema.index({ position: 1, status: 1, isActive: 1 });
bannerSchema.index({ position: 1, priority: -1 });
bannerSchema.index({ status: 1, isActive: 1 });
bannerSchema.index({ createdAt: -1 });
bannerSchema.index({ deletedAt: 1 });

// Compound index for active banners by position
bannerSchema.index({ position: 1, isActive: 1, status: 1, priority: -1 });

export const BannerModel = model<Banner>('Banner', bannerSchema);

