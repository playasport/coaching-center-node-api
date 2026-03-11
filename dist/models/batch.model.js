"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchModel = void 0;
const mongoose_1 = require("mongoose");
const batchStatus_enum_1 = require("../enums/batchStatus.enum");
const durationType_enum_1 = require("../enums/durationType.enum");
const operatingDays_enum_1 = require("../enums/operatingDays.enum");
const gender_enum_1 = require("../enums/gender.enum");
// Training days enum
const trainingDaysEnum = Object.values(operatingDays_enum_1.OperatingDays);
// Duration type enum
const durationTypeEnum = Object.values(durationType_enum_1.DurationType);
// Status enum
const statusEnum = Object.values(batchStatus_enum_1.BatchStatus);
// Individual timing sub-schema
const individualTimingSchema = new mongoose_1.Schema({
    day: {
        type: String,
        required: [true, 'Day is required'],
        validate: {
            validator: function (value) {
                return trainingDaysEnum.includes(value.toLowerCase());
            },
            message: 'Day must be a valid training day',
        },
    },
    start_time: {
        type: String,
        required: [true, 'Start time is required'],
        validate: {
            validator: function (value) {
                return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
            },
            message: 'Start time must be in HH:MM format (24-hour)',
        },
    },
    end_time: {
        type: String,
        required: [true, 'End time is required'],
        validate: {
            validator: function (value) {
                return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
            },
            message: 'End time must be in HH:MM format (24-hour)',
        },
    },
}, { _id: false });
// Scheduled sub-schema
const scheduledSchema = new mongoose_1.Schema({
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
            validator: function (value) {
                if (value === null || value === undefined)
                    return true;
                return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
            },
            message: 'Start time must be in HH:MM format (24-hour)',
        },
    },
    end_time: {
        type: String,
        default: null,
        validate: {
            validator: function (value) {
                if (value === null || value === undefined)
                    return true;
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
            validator: function (value) {
                if (!value || value.length === 0) {
                    return false;
                }
                return value.every((day) => trainingDaysEnum.includes(day.toLowerCase()));
            },
            message: 'Training days must be valid days (monday, tuesday, wednesday, thursday, friday, saturday, sunday)',
        },
    },
}, { _id: false });
// Duration sub-schema
const durationSchema = new mongoose_1.Schema({
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
}, { _id: false });
// Capacity sub-schema
const capacitySchema = new mongoose_1.Schema({
    min: {
        type: Number,
        required: [true, 'Minimum capacity is required'],
        min: [1, 'Minimum capacity must be at least 1'],
        max: [10000, 'Minimum capacity cannot exceed 10000'],
    },
    max: {
        type: Number,
        default: null,
        min: [1, 'Maximum capacity must be at least 1'],
        max: [10000, 'Maximum capacity cannot exceed 10000'],
    },
}, { _id: false });
// Age range sub-schema
const ageRangeSchema = new mongoose_1.Schema({
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
}, { _id: false });
// Main batch schema
const batchSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
    },
    name: {
        type: String,
        required: [true, 'Batch name is required'],
        trim: true,
        maxlength: [50, 'Batch name cannot exceed 50 characters'],
    },
    description: {
        type: String,
        default: null,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    sport: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Sport',
        required: [true, 'Sport is required'],
    },
    center: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CoachingCenter',
        required: [true, 'Center is required'],
    },
    coach: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    gender: {
        type: [String],
        enum: Object.values(gender_enum_1.Gender),
        required: [true, 'Gender is required'],
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'At least one gender must be selected',
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
        set: (value) => {
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
        set: (value) => {
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
        set: (value) => {
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
    },
    status: {
        type: String,
        enum: {
            values: statusEnum,
            message: `Status must be one of: ${statusEnum.join(', ')}`,
        },
        default: batchStatus_enum_1.BatchStatus.DRAFT,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});
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
const roundNumericValues = (obj) => {
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
        const rounded = {};
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
exports.BatchModel = (0, mongoose_1.model)('Batch', batchSchema);
//# sourceMappingURL=batch.model.js.map