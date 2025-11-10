import { Schema, model, HydratedDocument } from 'mongoose';
import { addressSchema, Address } from './address.model';
import { DefaultRoles } from './role.model';

export interface UserRefRole {
  id: string;
  name: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName?: string | null;
  dob?: Date | null;
  email: string;
  mobile?: string | null;
  password: string;
  gender?: 'male' | 'female' | 'other';
  isActive: boolean;
  role?: UserRefRole | null;
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
    gender: { type: String, enum: ['male', 'female', 'other'], default: null },
    isActive: { type: Boolean, default: true },
    role: {
      id: {
        type: String,
        enum: Object.values(DefaultRoles),
        required: true,
        default: DefaultRoles.USER,
      },
      name: {
        type: String,
        enum: Object.values(DefaultRoles),
        required: true,
        default: DefaultRoles.USER,
      },
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