import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { addressSchema, Address } from './address.model';
import { Gender } from '../enums/gender.enum';

export interface User {
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
  userType?: 'student' | 'guardian' | null; // Only applies when role is 'user'
  favoriteSports?: Types.ObjectId[]; // Array of Sport references for user preferences
  address?: Address | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
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
    userType: {
      type: String,
      enum: ['student', 'guardian'],
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


export const UserModel = model<User>('User', userSchema);