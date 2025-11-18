import { Schema, model, HydratedDocument } from 'mongoose';
import { DefaultRoles } from '../enums/defaultRoles.enum';

export interface Role {
  _id?: string;
  name: string;
  description?: string | null;
  visibleToRoles?: string[] | null; // Array of role names that can view/list this role
  createdAt: Date;
  updatedAt: Date;
}

export type RoleDocument = HydratedDocument<Role>;

// Re-export for backward compatibility
export { DefaultRoles };

const roleSchema = new Schema<Role>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, default: null },
    visibleToRoles: { 
      type: [String], 
      default: null,
      index: true, // Index for better query performance
      description: 'Array of multiple role names that can view/list this role. One role can be visible to multiple roles. If null or empty, only SUPER_ADMIN and ADMIN can view it.'
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

export const RoleModel = model<Role>('Role', roleSchema);


