import { Schema, model, HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// CMS Page Platform enum
export enum CmsPagePlatform {
  WEB = 'web',
  APP = 'app',
  BOTH = 'both',
}

// CMS Page interface
export interface CmsPage {
  id: string;
  slug: string; // Unique identifier like: privacy-policy, terms, about-us
  title: string; // Page title
  content: string; // HTML or Markdown content
  platform: CmsPagePlatform; // Where this content is used
  isActive: boolean; // For enabling / disabling pages
  version: number; // Optional versioning
  updatedBy?: string | null; // Admin user ID who last updated
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export type CmsPageDocument = HydratedDocument<CmsPage>;

// CMS Page schema
const cmsPageSchema = new Schema<CmsPage>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: Object.values(CmsPagePlatform),
      required: true,
      default: CmsPagePlatform.BOTH,
      index: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    updatedBy: {
      type: String,
      default: null,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
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
cmsPageSchema.index({ slug: 1, deletedAt: 1 });
cmsPageSchema.index({ platform: 1, isActive: 1 });
cmsPageSchema.index({ isActive: 1, deletedAt: 1 });
cmsPageSchema.index({ createdAt: -1 });

export const CmsPageModel = model<CmsPage>('CmsPage', cmsPageSchema);

