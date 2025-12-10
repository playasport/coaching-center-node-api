import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { addressSchema, Address } from './address.model';

// Participant interface
export interface Participant {
  userId: Types.ObjectId; // Reference to User model
  firstName?: string | null;
  lastName?: string | null;
  gender?: number | null; // 0 = male, 1 = female, 2 = other
  disability: number; // 0 = no, 1 = yes
  dob?: Date | null; // Date of birth
  schoolName?: string | null;
  contactNumber?: string | null;
  profilePhoto?: string | null;
  address?: Address | null;
  isSelf?: string | null; // '1' for self, null otherwise
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ParticipantDocument = HydratedDocument<Participant>;

const participantSchema = new Schema<Participant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 191,
    },
    lastName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 191,
    },
    gender: {
      type: Number,
      default: null,
      enum: [0, 1, 2], // 0 = male, 1 = female, 2 = other
    },
    disability: {
      type: Number,
      default: 0,
      enum: [0, 1], // 0 = no, 1 = yes
    },
    dob: {
      type: Date,
      default: null,
    },
    schoolName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 191,
    },
    contactNumber: {
      type: String,
      default: null,
      trim: true,
      maxlength: 255,
    },
    profilePhoto: {
      type: String,
      default: null,
      trim: true,
      maxlength: 191,
    },
    address: {
      type: addressSchema,
      default: null,
    },
    isSelf: {
      type: String,
      default: null,
      trim: true,
      maxlength: 191,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better query performance
participantSchema.index({ userId: 1 });
participantSchema.index({ userId: 1, is_deleted: 1 });
participantSchema.index({ contactNumber: 1 });

export const ParticipantModel = model<Participant>('Participant', participantSchema);

