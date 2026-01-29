import { Schema } from 'mongoose';

export interface Address {
  line1?: string | null;
  line2: string;
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
    line1: { type: String, default: null },
    line2: { type: String, required: true },
    area: { type: String, default: null },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
    pincode: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    _id: false,
  }
);


