import { Schema, model, HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface Facility {
  custom_id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type FacilityDocument = HydratedDocument<Facility>;

const facilitySchema = new Schema<Facility>(
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
    description: {
      type: String,
      default: null,
    },
    icon: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure custom_id is generated if not provided
facilitySchema.pre('save', function (next) {
  if (!this.custom_id) {
    this.custom_id = uuidv4();
  }
  next();
});

export const FacilityModel = model<Facility>('Facility', facilitySchema);

