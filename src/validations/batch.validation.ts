import { z } from 'zod';
import { t } from '../utils/i18n';

// Training days enum
const trainingDaysEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

// Duration type enum
const durationTypeEnum = z.enum(['day', 'month', 'week', 'year']);

// Status enum
const statusEnum = z.enum(['published', 'draft', 'inactive']);

// Fee type enum
const feeTypeEnum = z.enum([
  'monthly',
  'daily',
  'weekly',
  'hourly',
  'per_batch',
  'per_session',
  'age_based',
  'coach_license_based',
  'player_level_based',
  'seasonal',
  'package_based',
  'group_discount',
  'advance_booking',
  'weekend_pricing',
  'peak_hours',
  'membership_based',
  'custom',
]);

// Fee structure schema (flexible based on fee_type)
const feeStructureSchema = z.object({
  fee_type: feeTypeEnum,
  fee_configuration: z.record(z.string(), z.any()), // Dynamic configuration
  admission_fee: z.number().min(0, 'Admission fee cannot be negative').optional().nullable(),
});

// Scheduled schema
const scheduledSchema = z
  .object({
    start_date: z.coerce.date({ message: t('validation.batch.scheduled.startDateRequired') }),
    start_time: z
      .string({ message: t('validation.batch.scheduled.startTimeRequired') })
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, t('validation.batch.scheduled.startTimeFormat')),
    end_time: z
      .string({ message: t('validation.batch.scheduled.endTimeRequired') })
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, t('validation.batch.scheduled.endTimeFormat')),
    training_days: z
      .array(trainingDaysEnum, { message: t('validation.batch.scheduled.trainingDaysRequired') })
      .min(1, t('validation.batch.scheduled.trainingDaysMinOne')),
  })
  .refine(
    (data) => {
      // Check if start_date is today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
      const startDate = new Date(data.start_date);
      startDate.setHours(0, 0, 0, 0); // Set to start of the day for comparison
      return startDate >= today;
    },
    {
      message: t('validation.batch.scheduled.startDateNotPast'),
      path: ['start_date'],
    }
  )
  .refine(
    (data) => {
      const [startHour, startMin] = data.start_time.split(':').map(Number);
      const [endHour, endMin] = data.end_time.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      return endTime > startTime;
    },
    {
      message: t('validation.batch.scheduled.endTimeAfterStart'),
      path: ['end_time'],
    }
  );

// Duration schema
const durationSchema = z.object({
  count: z
    .number({ message: t('validation.batch.duration.countRequired') })
    .int(t('validation.batch.duration.countInteger'))
    .min(1, t('validation.batch.duration.countMin')),
  type: durationTypeEnum,
});

// Capacity schema
const capacitySchema = z
  .object({
    min: z
      .number({ message: t('validation.batch.capacity.minRequired') })
      .int(t('validation.batch.capacity.minInteger'))
      .min(1, t('validation.batch.capacity.minMin')),
    max: z
      .number()
      .int(t('validation.batch.capacity.maxInteger'))
      .min(1, t('validation.batch.capacity.maxMin'))
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.max !== null && data.max !== undefined) {
        return data.max >= data.min;
      }
      return true;
    },
    {
      message: t('validation.batch.capacity.maxGreaterThanMin'),
      path: ['max'],
    }
  );

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

// Batch create schema
export const batchCreateSchema = z.object({
  body: z.object({
    userId: z.string().optional(), // Optional - automatically set from logged-in user
    name: z
      .string()
      .min(1, t('validation.batch.name.required'))
      .max(255, t('validation.batch.name.maxLength')),
    sportId: z.string().min(1, t('validation.batch.sportId.required')),
    centerId: z.string().min(1, t('validation.batch.centerId.required')),
    coach: z.string().optional().nullable(),
    scheduled: scheduledSchema,
    duration: durationSchema,
    capacity: capacitySchema,
    age: ageRangeSchema,
    admission_fee: z.number().min(0, t('validation.batch.admissionFee.invalid')).optional().nullable(),
    fee_structure: feeStructureSchema, // Required
    status: statusEnum.default('draft'),
  }),
});

export type BatchCreateInput = z.infer<typeof batchCreateSchema>['body'];

// Batch update schema
export const batchUpdateSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(1, t('validation.batch.name.required'))
        .max(255, t('validation.batch.name.maxLength'))
        .optional(),
      sportId: z.string().min(1, t('validation.batch.sportId.required')).optional(),
      centerId: z.string().min(1, t('validation.batch.centerId.required')).optional(),
      coach: z.string().optional().nullable(),
      scheduled: scheduledSchema.optional(),
      duration: durationSchema.optional(),
      capacity: capacitySchema.optional(),
      age: ageRangeSchema.optional(),
      admission_fee: z.number().min(0, t('validation.batch.admissionFee.invalid')).optional().nullable(),
      fee_structure: feeStructureSchema.optional().nullable(), // Optional in update
      status: statusEnum.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: t('validation.profile.noChanges'),
    }),
});

export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>['body'];

