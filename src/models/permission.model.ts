import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { Section } from '../enums/section.enum';
import { Action } from '../enums/section.enum';

export interface Permission {
  _id?: string;
  role: Types.ObjectId; // Reference to Role model
  section: Section;
  actions: Action[]; // Array of allowed actions
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PermissionDocument = HydratedDocument<Permission>;

const permissionSchema = new Schema<Permission>(
  {
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    section: {
      type: String,
      enum: Object.values(Section),
      required: true,
      index: true,
    },
    actions: {
      type: [String],
      enum: Object.values(Action),
      required: true,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result._id?.toString();
        delete result._id;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result._id?.toString();
        delete result._id;
      },
    },
  }
);

// Compound index for efficient permission lookups
permissionSchema.index({ role: 1, section: 1, isActive: 1 });
permissionSchema.index({ role: 1, isActive: 1 });

// Prevent duplicate permissions for same role and section
permissionSchema.index({ role: 1, section: 1 }, { unique: true });

export const PermissionModel = model<Permission>('Permission', permissionSchema);
