import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { addressSchema, Address } from './address.model';
import { Gender } from '../enums/gender.enum';

export type RegistrationMethod = 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram';

export interface AcademyDetails {
  name: string;
}

export interface User {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  dob?: Date | null;
  email: string;
  mobile?: string | null;
  password: string;
  gender?: Gender;
  profileImage?: string | null;
  isActive: boolean;
  roles: Types.ObjectId[]; // Array of Role references - supports multiple roles
  userType?: 'student' | 'guardian' | null; // Only applies when role is 'user'
  registrationMethod?: RegistrationMethod | null; // How the user registered (email, mobile, google, facebook, apple, instagram)
  favoriteSports?: Types.ObjectId[]; // Array of Sport references for user preferences
  address?: Address | null;
  academyDetails?: AcademyDetails | null;
  referredByAgent?: Types.ObjectId | null; // AdminUser (agent) who referred this academy user
  referredByAgentAt?: Date | null; // Timestamp when agent was linked
  isDeleted: boolean;
  deletedAt?: Date | null;
  /** Soft-delete for consumer (`user` role) only; academy login may still work. */
  userRoleDeletedAt?: Date | null;
  /** Soft-delete for academy role only; user-app login may still work. */
  academyRoleDeletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, default: null, trim: true },
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
    userType: {
      type: String,
      enum: ['student', 'guardian'],
      default: null,
      index: true,
    },
    registrationMethod: {
      type: String,
      enum: ['email', 'mobile', 'google', 'facebook', 'apple', 'instagram'],
      default: null,
      index: true,
    },
    favoriteSports: {
      type: [Schema.Types.ObjectId],
      ref: 'Sport',
      default: [],
      index: true,
    },
    address: { type: addressSchema, default: null },
    academyDetails: {
      type: {
        name: { type: String, trim: true },
      },
      default: null,
    },
    referredByAgent: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
      index: true,
    },
    referredByAgentAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    userRoleDeletedAt: { type: Date, default: null, index: true },
    academyRoleDeletedAt: { type: Date, default: null, index: true },
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
userSchema.index({ isDeleted: 1 });
userSchema.index({ mobile: 1 });
userSchema.index({ createdAt: -1 });

// Compound indexes for better query performance
// Index for common filter combinations in getAllUsers
// Note: Order matters - most selective fields first
userSchema.index({ isDeleted: 1, roles: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, userType: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, isActive: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, roles: 1, userType: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, roles: 1, isActive: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, userType: 1, isActive: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, userRoleDeletedAt: 1 });
userSchema.index({ isDeleted: 1, academyRoleDeletedAt: 1 });

// Text index for search functionality (correct syntax)
userSchema.index({ firstName: 'text', middleName: 'text', lastName: 'text', email: 'text', mobile: 'text' }, { name: 'user_search_text_index' });

export const UserModel = model<User>('User', userSchema);