import { z } from 'zod';
import { t } from '../utils/i18n';
import { Gender } from '../enums/gender.enum';

// Training days enum
const trainingDaysEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

// Duration type enum
const durationTypeEnum = z.enum(['day', 'month', 'week', 'year']);

// Status enum
const statusEnum = z.enum(['published', 'draft']);

// Age range schema
const ageRangeSchema = z
  .object({
    min: z
      .number({ message: t('validation.batch.age.minRequired') })
      .int(t('validation.batch.age.minInteger'))
      .min(3, t('validation.batch.age.minRange'))
      .max(18, t('validation.batch.age.minRange')),
    max: z
      .number({ message: t('validation.batch.age.maxRequired') })
      .int(t('validation.batch.age.maxInteger'))
      .min(3, t('validation.batch.age.maxRange'))
      .max(18, t('validation.batch.age.maxRange')),
  })
  .refine(
    (data) => data.max >= data.min,
    {
      message: t('validation.batch.age.maxGreaterThanMin'),
      path: ['max'],
    }
  );

// ==================== COMMON BATCH VALIDATION SCHEMAS ====================
// Note: These schemas are used by both admin and academy routes

// Gender enum - using Gender enum values
const genderEnum = z.enum(Object.values(Gender) as [string, ...string[]]);

// Individual timing schema
const individualTimingSchema = z.object({
  day: trainingDaysEnum,
  start_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format (24-hour)'),
  end_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format (24-hour)'),
}).refine(
  (data) => {
    const [startHour, startMin] = data.start_time.split(':').map(Number);
    const [endHour, endMin] = data.end_time.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    return endTime > startTime;
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

// Scheduled schema - supports both common timing and individual timing
const scheduledSchema = z
  .object({
    start_date: z.coerce.date({ message: 'Start date is required' }),
    end_date: z.coerce.date().optional().nullable(),
    start_time: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format (24-hour)')
      .optional()
      .nullable(),
    end_time: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format (24-hour)')
      .optional()
      .nullable(),
    individual_timings: z.array(individualTimingSchema).optional().nullable(),
    training_days: z
      .array(trainingDaysEnum, { message: 'Training days are required' })
      .min(1, 'At least one training day must be selected'),
  })
  .refine(
    (data) => {
      // Check if start_date is today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(data.start_date);
      startDate.setHours(0, 0, 0, 0);
      return startDate >= today;
    },
    {
      message: 'Start date cannot be in the past',
      path: ['start_date'],
    }
  )
  .refine(
    (data) => {
      // Must have either common timing (start_time + end_time) OR individual_timings
      const hasCommonTiming = data.start_time && data.end_time;
      const hasIndividualTiming = data.individual_timings && data.individual_timings.length > 0;
      return hasCommonTiming || hasIndividualTiming;
    },
    {
      message: 'Either common timing (start_time and end_time) or individual_timings must be provided',
      path: ['scheduled'],
    }
  )
  .refine(
    (data) => {
      // If common timing is provided, validate end_time > start_time
      if (data.start_time && data.end_time) {
        const [startHour, startMin] = data.start_time.split(':').map(Number);
        const [endHour, endMin] = data.end_time.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        return endTime > startTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  )
  .refine(
    (data) => {
      // If individual_timings is provided, all training days must have timing entries
      if (data.individual_timings && data.individual_timings.length > 0) {
        const timingDays = data.individual_timings.map((t) => t.day);
        return data.training_days.every((day) => timingDays.includes(day));
      }
      return true;
    },
    {
      message: 'All selected training days must have timing entries in individual_timings',
      path: ['individual_timings'],
    }
  )
  .refine(
    (data) => {
      // If end_date is provided, it must be >= start_date
      if (data.end_date) {
        const startDate = new Date(data.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(data.end_date);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= startDate;
      }
      return true;
    },
    {
      message: 'End date must be greater than or equal to start date',
      path: ['end_date'],
    }
  );

// Duration schema
const durationSchema = z.object({
  count: z
    .number({ message: 'Duration count is required' })
    .int('Duration count must be an integer')
    .min(1, 'Duration count must be at least 1')
    .max(1000, 'Duration count cannot exceed 1000'),
  type: durationTypeEnum,
});

// Capacity schema
const capacitySchema = z
  .object({
    min: z
      .number({ message: 'Minimum capacity is required' })
      .int('Minimum capacity must be an integer')
      .min(1, 'Minimum capacity must be at least 1')
      .max(10000, 'Minimum capacity cannot exceed 10000'),
    max: z
      .number({ message: 'Maximum capacity must be a number' })
      .int('Maximum capacity must be an integer')
      .min(1, 'Maximum capacity must be at least 1')
      .max(10000, 'Maximum capacity cannot exceed 10000')
      .nullish(),
  })
  .refine(
    (data) => {
      if (data.max == null || data.max === undefined) return true;
      return data.max >= data.min;
    },
    {
      message: 'Maximum capacity must be greater than or equal to minimum capacity',
      path: ['max'],
    }
  );

// Common batch create schema (used by both admin and academy)
export const batchCreateSchema = z
  .object({
    body: z
      .object({
        userId: z.string().optional(), // Optional - used by academy, ignored by admin
        name: z
          .string()
          .min(1, 'Batch name is required')
          .max(50, 'Batch name cannot exceed 50 characters'),
        description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
        sportId: z.string().min(1, 'Sport ID is required'),
        centerId: z.string().min(1, 'Center ID is required'),
        coach: z.string().optional().nullable(),
        gender: z
          .array(genderEnum, { message: 'Gender is required' })
          .min(1, 'At least one gender must be selected'),
        certificate_issued: z.boolean({ message: 'Certificate issued status is required' }),
        scheduled: scheduledSchema,
        duration: durationSchema,
        capacity: capacitySchema,
        age: ageRangeSchema,
        admission_fee: z
          .number()
          .min(0, 'Admission fee cannot be negative')
          .max(10000000, 'Admission fee cannot exceed ₹1 crore')
          .optional()
          .nullable(),
        base_price: z
          .number({ message: 'Base price is required' })
          .min(0, 'Base price cannot be negative')
          .max(10000000, 'Base price cannot exceed ₹1 crore'),
        discounted_price: z
          .number()
          .min(0, 'Discounted price cannot be negative')
          .max(10000000, 'Discounted price cannot exceed ₹1 crore')
          .optional()
          .nullable(),
        is_allowed_disabled: z.boolean().default(false).optional(),
        status: statusEnum.default('draft'),
      })
      .refine(
        (data) => {
          // Validate discounted_price <= base_price
          if (data.discounted_price !== null && data.discounted_price !== undefined) {
            return data.discounted_price <= data.base_price;
          }
          return true;
        },
        {
          message: 'Discounted price must be less than or equal to base price',
          path: ['discounted_price'],
        }
      )
      .refine(
        (data) => {
          // If duration.type === "day", training_days count must exactly match duration.count
          if (data.duration.type === 'day') {
            return data.scheduled.training_days.length === data.duration.count;
          }
          return true;
        },
        {
          message: 'When duration type is "day", the number of training days must exactly match the duration count',
          path: ['scheduled', 'training_days'],
        }
      )
      .refine(
        (data) => {
          // Validate end_date calculation (±1 day tolerance)
          if (data.scheduled.end_date && data.scheduled.start_date) {
            const startDate = new Date(data.scheduled.start_date);
            const endDate = new Date(data.scheduled.end_date);
            const calculatedEndDate = calculateEndDate(startDate, data.duration.count, data.duration.type);
            
            // Calculate difference in days
            const diffDays = Math.abs(
              Math.floor((endDate.getTime() - calculatedEndDate.getTime()) / (1000 * 60 * 60 * 24))
            );
            return diffDays <= 1; // ±1 day tolerance
          }
          return true;
        },
        {
          message: 'End date should match the calculated end date based on duration (±1 day tolerance)',
          path: ['scheduled', 'end_date'],
        }
      ),
  });

// Helper function to calculate end date
function calculateEndDate(startDate: Date, count: number, type: string): Date {
  const endDate = new Date(startDate);
  
  switch (type) {
    case 'day':
      endDate.setDate(endDate.getDate() + (count - 1)); // start date is day 1
      break;
    case 'week':
      endDate.setDate(endDate.getDate() + count * 7 - 1);
      break;
    case 'month':
      endDate.setMonth(endDate.getMonth() + count);
      endDate.setDate(endDate.getDate() - 1);
      break;
    case 'year':
      endDate.setFullYear(endDate.getFullYear() + count);
      endDate.setDate(endDate.getDate() - 1);
      break;
  }
  
  return endDate;
}

export type BatchCreateInput = z.infer<typeof batchCreateSchema>['body'];

// Type aliases for backward compatibility
export type AdminBatchCreateInput = BatchCreateInput;

// Common batch update schema (used by both admin and academy)
export const batchUpdateSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1, 'Batch name is required')
        .max(50, 'Batch name cannot exceed 50 characters')
        .optional(),
      description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
      sportId: z.string().min(1, 'Sport ID is required').optional(),
      centerId: z.string().min(1, 'Center ID is required').optional(),
      coach: z.string().optional().nullable(),
      gender: z
        .array(genderEnum, { message: 'Gender is required' })
        .min(1, 'At least one gender must be selected')
        .optional(),
      certificate_issued: z.boolean({ message: 'Certificate issued status is required' }).optional(),
      scheduled: scheduledSchema.optional(),
      duration: durationSchema.optional(),
      capacity: capacitySchema.optional(),
      age: ageRangeSchema.optional(),
      admission_fee: z
        .number()
        .min(0, 'Admission fee cannot be negative')
        .max(10000000, 'Admission fee cannot exceed ₹1 crore')
        .optional()
        .nullable(),
      base_price: z
        .number()
        .min(0, 'Base price cannot be negative')
        .max(10000000, 'Base price cannot exceed ₹1 crore')
        .optional(),
      discounted_price: z
        .number()
        .min(0, 'Discounted price cannot be negative')
        .max(10000000, 'Discounted price cannot exceed ₹1 crore')
        .optional()
        .nullable(),
      is_allowed_disabled: z.boolean().optional(),
      status: statusEnum.optional(),
      is_active: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    })
    .refine(
      (data) => {
        // Validate discounted_price <= base_price
        if (data.discounted_price !== null && data.discounted_price !== undefined) {
          const basePrice = data.base_price;
          if (basePrice !== undefined) {
            return data.discounted_price <= basePrice;
          }
        }
        return true;
      },
      {
        message: 'Discounted price must be less than or equal to base price',
        path: ['discounted_price'],
      }
    ),
});

export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>['body'];

// Type aliases for backward compatibility
export type AdminBatchUpdateInput = BatchUpdateInput;

