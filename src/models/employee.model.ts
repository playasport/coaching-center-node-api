import { Schema, model, HydratedDocument, Types } from 'mongoose';

// Certification interface
export interface Certification {
  name: string;
  fileUrl: string;
}

// Employee interface
export interface Employee {
  userId: Types.ObjectId; // Reference to User model
  fullName: string; // Only text, no special characters and numbers
  role: Types.ObjectId; // Reference to Role model
  mobileNo: string; // Only numbers
  email?: string | null;
  sport?: Types.ObjectId | null; // Reference to Sport model
  center?: Types.ObjectId | null; // Reference to CoachingCenter model
  experience?: number | null;
  workingHours: string; // Required
  extraHours?: string | null;
  certification?: Certification[] | null;
  salary?: number | null;
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeDocument = HydratedDocument<Employee>;

// Certification sub-schema
const certificationSchema = new Schema<Certification>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// Validation function for full name (only letters and spaces)
const validateFullName = (value: string): boolean => {
  // Only letters (including accented characters) and spaces allowed
  const nameRegex = /^[a-zA-Z\s\u00C0-\u017F]+$/;
  return nameRegex.test(value);
};

// Validation function for mobile number (only digits)
const validateMobileNo = (value: string): boolean => {
  // Only digits allowed
  const mobileRegex = /^\d+$/;
  return mobileRegex.test(value);
};

const employeeSchema = new Schema<Employee>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      validate: {
        validator: validateFullName,
        message: 'Full name must contain only letters and spaces (no numbers or special characters)',
      },
      index: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role is required'],
      index: true,
    },
    mobileNo: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      validate: {
        validator: validateMobileNo,
        message: 'Mobile number must contain only digits',
      },
      index: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value: string | null) {
          // If email is provided, validate it; if null/undefined, it's optional
          if (!value) return true;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        message: 'Please provide a valid email address',
      },
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      default: null,
      index: true,
    },
    center: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      default: null,
      index: true,
    },
    experience: {
      type: Number,
      default: null,
      min: [0, 'Experience cannot be negative'],
    },
    workingHours: {
      type: String,
      required: [true, 'Working hours is required'],
      trim: true,
    },
    extraHours: {
      type: String,
      default: null,
      trim: true,
    },
    certification: {
      type: [certificationSchema],
      default: null,
    },
    salary: {
      type: Number,
      default: null,
      min: [0, 'Salary cannot be negative'],
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
employeeSchema.index({ userId: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ center: 1 });
employeeSchema.index({ sport: 1 });
employeeSchema.index({ mobileNo: 1 });
employeeSchema.index({ email: 1 });

// Compound indexes for common queries
employeeSchema.index({ center: 1, role: 1 });
employeeSchema.index({ sport: 1, center: 1 });

export const EmployeeModel = model<Employee>('Employee', employeeSchema);

