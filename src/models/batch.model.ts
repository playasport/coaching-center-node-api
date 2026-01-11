import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { BatchStatus } from '../enums/batchStatus.enum';
import { DurationType } from '../enums/durationType.enum';
import { OperatingDays } from '../enums/operatingDays.enum';

// Individual timing interface
export interface IndividualTiming {
  day: string; // e.g., 'monday'
  start_time: string; // e.g., '09:00'
  end_time: string; // e.g., '18:00'
}

// Scheduled interface
export interface Scheduled {
  start_date: Date;
  end_date?: Date | null; // Optional end date
  start_time?: string | null; // e.g., '09:00' (for common timing)
  end_time?: string | null; // e.g., '18:00' (for common timing)
  individual_timings?: IndividualTiming[] | null; // For per-day timing
  training_days: string[]; // ['monday', 'tuesday', etc.]
}

// Duration interface
export interface Duration {
  count: number;
  type: DurationType;
}

// Capacity interface
export interface Capacity {
  min: number;
  max?: number | null;
}

// Age range interface
export interface AgeRange {
  min: number;
  max: number;
}

// Batch interface
export interface Batch {
  user: Types.ObjectId; // Reference to User model (_id)
  name: string;
  description?: string | null; // Optional description
  sport: Types.ObjectId; // Reference to Sport model
  center: Types.ObjectId; // Reference to CoachingCenter model
  coach?: Types.ObjectId | null; // Reference to Employee model (optional)
  gender: string[]; // Array of allowed genders: ['male', 'female', 'others']
  certificate_issued: boolean; // Whether certificate will be issued
  scheduled: Scheduled;
  duration: Duration;
  capacity: Capacity;
  age: AgeRange;
  admission_fee?: number | null;
  base_price: number; // Base price for the batch
  discounted_price?: number | null; // Optional discounted price
  is_allowed_disabled: boolean; // Whether disabled participants are allowed in this batch
  status: BatchStatus;
  is_active: boolean;
  is_deleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BatchDocument = HydratedDocument<Batch>;

// Training days enum
const trainingDaysEnum = Object.values(OperatingDays) as string[];

// Duration type enum
const durationTypeEnum = Object.values(DurationType) as string[];

// Status enum
const statusEnum = Object.values(BatchStatus) as string[];

// Individual timing sub-schema
const individualTimingSchema = new Schema<IndividualTiming>(
  {
    day: {
      type: String,
      required: [true, 'Day is required'],
      validate: {
        validator: function (value: string) {
          return trainingDaysEnum.includes(value.toLowerCase());
        },
        message: 'Day must be a valid training day',
      },
    },
    start_time: {
      type: String,
      required: [true, 'Start time is required'],
      validate: {
        validator: function (value: string) {
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'Start time must be in HH:MM format (24-hour)',
      },
    },
    end_time: {
      type: String,
      required: [true, 'End time is required'],
      validate: {
        validator: function (value: string) {
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in HH:MM format (24-hour)',
      },
    },
  },
  { _id: false }
);

// Scheduled sub-schema
const scheduledSchema = new Schema<Scheduled>(
  {
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    end_date: {
      type: Date,
      default: null,
    },
    start_time: {
      type: String,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (value === null || value === undefined) return true;
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'Start time must be in HH:MM format (24-hour)',
      },
    },
    end_time: {
      type: String,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (value === null || value === undefined) return true;
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in HH:MM format (24-hour)',
      },
    },
    individual_timings: {
      type: [individualTimingSchema],
      default: null,
    },
    training_days: {
      type: [String],
      required: [true, 'Training days are required'],
      validate: {
        validator: function (value: string[]) {
          if (!value || value.length === 0) {
            return false;
          }
          return value.every((day) => trainingDaysEnum.includes(day.toLowerCase()));
        },
        message: 'Training days must be valid days (monday, tuesday, wednesday, thursday, friday, saturday, sunday)',
      },
    },
  },
  { _id: false }
);

// Duration sub-schema
const durationSchema = new Schema<Duration>(
  {
    count: {
      type: Number,
      required: [true, 'Duration count is required'],
      min: [1, 'Duration count must be at least 1'],
      max: [1000, 'Duration count cannot exceed 1000'],
    },
    type: {
      type: String,
      required: [true, 'Duration type is required'],
      enum: {
        values: durationTypeEnum,
        message: `Duration type must be one of: ${durationTypeEnum.join(', ')}`,
      },
    },
  },
  { _id: false }
);

// Capacity sub-schema
const capacitySchema = new Schema<Capacity>(
  {
    min: {
      type: Number,
      required: [true, 'Minimum capacity is required'],
      min: [1, 'Minimum capacity must be at least 1'],
      max: [1000, 'Minimum capacity cannot exceed 1000'],
    },
    max: {
      type: Number,
      default: null,
      min: [1, 'Maximum capacity must be at least 1'],
      max: [1000, 'Maximum capacity cannot exceed 1000'],
    },
  },
  { _id: false }
);

// Age range sub-schema
const ageRangeSchema = new Schema<AgeRange>(
  {
    min: {
      type: Number,
      required: [true, 'Minimum age is required'],
      min: [3, 'Minimum age must be at least 3'],
      max: [18, 'Minimum age must be at most 18'],
    },
    max: {
      type: Number,
      required: [true, 'Maximum age is required'],
      min: [3, 'Maximum age must be at least 3'],
      max: [18, 'Maximum age must be at most 18'],
    },
  },
  { _id: false }
);

// Main batch schema
const batchSchema = new Schema<Batch>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
      maxlength: [50, 'Batch name cannot exceed 50 characters'],
      index: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    sport: {
      type: Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Sport is required'],
      index: true,
    },
    center: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingCenter',
      required: [true, 'Center is required'],
      index: true,
    },
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    gender: {
      type: [String],
      required: [true, 'Gender is required'],
      validate: {
        validator: function (value: string[]) {
          if (!value || value.length === 0) {
            return false;
          }
          const validGenders = ['male', 'female', 'others'];
          return value.every((g) => validGenders.includes(g.toLowerCase()));
        },
        message: 'Gender must be one or more of: male, female, others',
      },
    },
    certificate_issued: {
      type: Boolean,
      required: [true, 'Certificate issued status is required'],
      default: false,
    },
    scheduled: {
      type: scheduledSchema,
      required: [true, 'Scheduled information is required'],
    },
    duration: {
      type: durationSchema,
      required: [true, 'Duration is required'],
    },
    capacity: {
      type: capacitySchema,
      required: [true, 'Capacity is required'],
    },
    age: {
      type: ageRangeSchema,
      required: [true, 'Age range is required'],
    },
    admission_fee: {
      type: Number,
      default: null,
      min: [0, 'Admission fee cannot be negative'],
      max: [10000000, 'Admission fee cannot exceed ₹1 crore'],
      set: (value: number | null | undefined) => {
        if (value === null || value === undefined) {
          return null;
        }
        // Use Math.round for more precise rounding (handles 500.0 correctly)
        return Math.round(value * 100) / 100;
      },
    },
    base_price: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
      max: [10000000, 'Base price cannot exceed ₹1 crore'],
      set: (value: number | null | undefined) => {
        if (value === null || value === undefined) {
          return null;
        }
        // Use Math.round for more precise rounding (handles 500.0 correctly)
        return Math.round(value * 100) / 100;
      },
    },
    discounted_price: {
      type: Number,
      default: null,
      min: [0, 'Discounted price cannot be negative'],
      max: [10000000, 'Discounted price cannot exceed ₹1 crore'],
      set: (value: number | null | undefined) => {
        if (value === null || value === undefined) {
          return null;
        }
        // Use Math.round for more precise rounding (handles 500.0 correctly)
        return Math.round(value * 100) / 100;
      },
    },
    is_allowed_disabled: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: statusEnum,
        message: `Status must be one of: ${statusEnum.join(', ')}`,
      },
      default: BatchStatus.DRAFT,
      index: true,
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
batchSchema.index({ user: 1 });
batchSchema.index({ sport: 1 });
batchSchema.index({ center: 1 });
batchSchema.index({ coach: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ is_active: 1 });
batchSchema.index({ is_deleted: 1 });

// Compound indexes for common queries
batchSchema.index({ center: 1, sport: 1 });
batchSchema.index({ center: 1, status: 1 });
batchSchema.index({ user: 1, center: 1 });
batchSchema.index({ center: 1, is_active: 1, is_deleted: 1 });

// Helper function to round numeric values recursively
const roundNumericValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'number') {
    // Use Math.round for more precise rounding (handles 500.0 correctly)
    return Math.round(obj * 100) / 100;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => roundNumericValues(item));
  }
  
  if (typeof obj === 'object') {
    const rounded: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        rounded[key] = roundNumericValues(obj[key]);
      }
    }
    return rounded;
  }
  
  return obj;
};

// Validate that end_time is after start_time and max capacity >= min capacity
// Also round all numeric values in fee_configuration to avoid floating-point precision issues
batchSchema.pre('save', function (next) {
  // Round price fields using Math.round for more precise rounding
  if (this.base_price !== null && this.base_price !== undefined) {
    this.base_price = Math.round(this.base_price * 100) / 100;
  }
  if (this.discounted_price !== null && this.discounted_price !== undefined) {
    this.discounted_price = Math.round(this.discounted_price * 100) / 100;
  }
  if (this.admission_fee !== null && this.admission_fee !== undefined) {
    this.admission_fee = Math.round(this.admission_fee * 100) / 100;
  }

  // Validate discounted_price <= base_price
  if (this.discounted_price !== null && this.discounted_price !== undefined && this.base_price !== null && this.base_price !== undefined) {
    if (this.discounted_price > this.base_price) {
      return next(new Error('Discounted price must be less than or equal to base price'));
    }
  }

  // Validate scheduled times - common timing
  if (this.scheduled && this.scheduled.start_time && this.scheduled.end_time) {
    const [startHour, startMin] = this.scheduled.start_time.split(':').map(Number);
    const [endHour, endMin] = this.scheduled.end_time.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (endTime <= startTime) {
      return next(new Error('End time must be after start time'));
    }
  }

  // Validate individual timings
  if (this.scheduled && this.scheduled.individual_timings && this.scheduled.individual_timings.length > 0) {
    for (const timing of this.scheduled.individual_timings) {
      const [startHour, startMin] = timing.start_time.split(':').map(Number);
      const [endHour, endMin] = timing.end_time.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (endTime <= startTime) {
        return next(new Error(`End time must be after start time for ${timing.day}`));
      }
    }
  }

  // Validate capacity
  if (this.capacity) {
    if (this.capacity.max !== null && this.capacity.max !== undefined) {
      if (this.capacity.max < this.capacity.min) {
        return next(new Error('Maximum capacity must be greater than or equal to minimum capacity'));
      }
    }
  }

  // Validate age range
  if (this.age) {
    if (this.age.max < this.age.min) {
      return next(new Error('Maximum age must be greater than or equal to minimum age'));
    }
  }

  next();
});

export const BatchModel = model<Batch>('Batch', batchSchema);

