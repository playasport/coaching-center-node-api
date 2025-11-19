import { Schema, model, HydratedDocument } from 'mongoose';
import { FeeType } from '../enums/feeType.enum';
import { FormFieldType } from '../enums/formFieldType.enum';

// Re-export for backward compatibility
export { FeeType };

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string | number; label: string }>;
  fields?: FormField[]; // For nested objects/arrays
  description?: string;
}

export interface FeeTypeConfig {
  fee_type: FeeType;
  label: string;
  description: string;
  formFields: FormField[];
  validationRules?: Record<string, any>;
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FeeTypeConfigDocument = HydratedDocument<FeeTypeConfig>;

// FormField sub-schema
const formFieldSchema = new Schema<FormField>(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(FormFieldType),
      required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: null },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    step: { type: Number, default: null },
    options: {
      type: [
        {
          value: { type: Schema.Types.Mixed },
          label: { type: String, required: true },
        },
      ],
      default: null,
    },
    fields: {
      type: [Schema.Types.Mixed], // Recursive reference for nested fields
      default: null,
    },
    description: { type: String, default: null },
  },
  { _id: false }
);

// FeeTypeConfig schema
const feeTypeConfigSchema = new Schema<FeeTypeConfig>(
  {
    fee_type: {
      type: String,
      enum: Object.values(FeeType),
      required: true,
      unique: true,
      index: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    formFields: { type: [formFieldSchema], required: true },
    validationRules: { type: Schema.Types.Mixed, default: null },
    is_active: { type: Boolean, default: true, index: true },
    is_deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result._id?.toString();
        delete result._id;
        delete result.__v;
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result._id?.toString();
        delete result._id;
        delete result.__v;
      },
    },
  }
);

// Indexes
feeTypeConfigSchema.index({ fee_type: 1, is_active: 1, is_deleted: 1 });

export const FeeTypeConfigModel = model<FeeTypeConfig>('FeeTypeConfig', feeTypeConfigSchema);

