import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { FeeType } from '../enums/feeType.enum';
import { BatchStatus } from '../enums/batchStatus.enum';
import { DurationType } from '../enums/durationType.enum';
import { OperatingDays } from '../enums/operatingDays.enum';

// Scheduled interface
export interface Scheduled {
  start_date: Date;
  start_time: string; // e.g., '09:00'
  end_time: string; // e.g., '18:00'
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

// Fee Structure interface (embedded in Batch)
export interface FeeStructure {
  fee_type: FeeType;
  fee_configuration: Record<string, any>; // Dynamic configuration based on fee_type
  admission_fee?: number | null;
}

// Batch interface
export interface Batch {
  user: Types.ObjectId; // Reference to User model (_id)
  name: string;
  sport: Types.ObjectId; // Reference to Sport model
  center: Types.ObjectId; // Reference to CoachingCenter model
  coach?: Types.ObjectId | null; // Reference to Employee model (optional)
  scheduled: Scheduled;
  duration: Duration;
  capacity: Capacity;
  age: AgeRange;
  admission_fee?: number | null;
  fee_structure?: FeeStructure | null; // Embedded fee structure (optional)
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

// Scheduled sub-schema
const scheduledSchema = new Schema<Scheduled>(
  {
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    start_time: {
      type: String,
      required: [true, 'Start time is required'],
      validate: {
        validator: function (value: string) {
          // Validate time format HH:MM (24-hour format)
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
          // Validate time format HH:MM (24-hour format)
          return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in HH:MM format (24-hour)',
      },
    },
    training_days: {
      type: [String],
      required: [true, 'Training days are required'],
      validate: {
        validator: function (value: string[]) {
          if (!value || value.length === 0) {
            return false;
          }
          // Check if all values are valid training days
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
    },
    max: {
      type: Number,
      default: null,
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
      index: true,
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
    },
    fee_structure: {
      type: {
        fee_type: {
          type: String,
          enum: Object.values(FeeType),
        },
        fee_configuration: {
          type: Schema.Types.Mixed,
          default: {},
        },
        admission_fee: {
          type: Number,
          default: null,
          min: [0, 'Admission fee cannot be negative'],
        },
      },
      default: null,
      _id: false,
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
batchSchema.index({ 'fee_structure.fee_type': 1 });

// Validate that end_time is after start_time and max capacity >= min capacity
batchSchema.pre('save', function (next) {
  // Validate scheduled times
  if (this.scheduled && this.scheduled.start_time && this.scheduled.end_time) {
    const [startHour, startMin] = this.scheduled.start_time.split(':').map(Number);
    const [endHour, endMin] = this.scheduled.end_time.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (endTime <= startTime) {
      return next(new Error('End time must be after start time'));
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

