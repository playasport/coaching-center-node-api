import { Schema, model, HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface Sport {
  custom_id: string;
  name: string;
  logo?: string | null;
  is_active: boolean;
  is_popular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SportDocument = HydratedDocument<Sport>;

const sportSchema = new Schema<Sport>(
  {
    custom_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    logo: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_popular: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure custom_id is generated if not provided
sportSchema.pre('save', function (next) {
  if (!this.custom_id) {
    this.custom_id = uuidv4();
  }
  next();
});

export const SportModel = model<Sport>('Sport', sportSchema);

