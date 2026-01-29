import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { addressSchema, Address } from './address.model';
import { Gender } from '../enums/gender.enum';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  dob?: Date | null;
  email: string;
  mobile?: string | null;
  password: string;
  gender?: Gender;
  profileImage?: string | null;
  isActive: boolean;
  roles: Types.ObjectId[]; // Array of Role references - supports multiple roles
  address?: Address | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminUserDocument = HydratedDocument<AdminUser>;

const adminUserSchema = new Schema<AdminUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: null, trim: true },
    dob: { type: Date, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, default: null, trim: true },
    password: { type: String, required: true },
    gender: { type: String, enum: Object.values(Gender), default: null },
    profileImage: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    roles: {
      type: [Schema.Types.ObjectId],
      ref: 'Role',
      default: [],
      index: true,
    },
    address: { type: addressSchema, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        delete result.password;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        delete result.password;
      },
    },
  }
);

// Single field indexes (most selective first)
// Note: email already has unique index from schema definition, so we don't need to add it again
adminUserSchema.index({ isDeleted: 1 });
adminUserSchema.index({ mobile: 1 });
adminUserSchema.index({ createdAt: -1 });

// Compound indexes for better query performance
// Note: Order matters - most selective fields first
adminUserSchema.index({ isDeleted: 1, roles: 1, createdAt: -1 });
adminUserSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });
adminUserSchema.index({ isDeleted: 1, roles: 1, isActive: 1, createdAt: -1 });

// Text index for search functionality (correct syntax)
adminUserSchema.index({ firstName: 'text', lastName: 'text', email: 'text', mobile: 'text' }, { name: 'adminUser_search_text_index' });

export const AdminUserModel = model<AdminUser>('AdminUser', adminUserSchema);
