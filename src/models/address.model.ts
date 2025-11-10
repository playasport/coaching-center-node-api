import { Schema } from 'mongoose';

export interface Address {
  line1: string;
  line2?: string | null;
  area?: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const addressSchema = new Schema<Address>(
  {
    line1: { type: String, required: true },
    line2: { type: String, default: null },
    area: { type: String, default: null },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pincode: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    _id: false,
  }
);


