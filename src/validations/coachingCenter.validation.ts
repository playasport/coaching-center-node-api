import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';
import { Gender } from '../enums/gender.enum';

// Mobile number and email validation will be done in superRefine

const ageRangeSchema = z.object({
  min: z
    .number({ message: validationMessages.coachingCenter.age.minRequired() })
    .int(validationMessages.coachingCenter.age.minInteger())
    .min(3, validationMessages.coachingCenter.age.minRange())
    .max(18, validationMessages.coachingCenter.age.minRange()),
  max: z
    .number({ message: validationMessages.coachingCenter.age.maxRequired() })
    .int(validationMessages.coachingCenter.age.maxInteger())
    .min(3, validationMessages.coachingCenter.age.maxRange())
    .max(18, validationMessages.coachingCenter.age.maxRange()),
}).refine((data) => data.max >= data.min, {
  message: validationMessages.coachingCenter.age.maxGreaterThanMin(),
  path: ['max'],
});

const centerAddressSchema = z.object({
  line1: z.string().max(255).optional().nullable(),
  line2: z.string({ message: validationMessages.address.line2Required() }).min(1).max(255),
  city: z.string({ message: validationMessages.address.cityRequired() }).min(1).max(100),
  state: z.string({ message: validationMessages.address.stateRequired() }).min(1).max(100),
  country: z.string().max(100).optional().nullable(),
  pincode: z
    .string({ message: validationMessages.address.pincodeRequired() })
    .regex(/^\d{6}$/, validationMessages.address.pincodeInvalid()),
});

const locationSchema = z.object({
  latitude: z
    .number({ message: validationMessages.coachingCenter.location.latitudeRequired() })
    .min(-90, validationMessages.coachingCenter.location.latitudeRange())
    .max(90, validationMessages.coachingCenter.location.latitudeRange()),
  longitude: z
    .number({ message: validationMessages.coachingCenter.location.longitudeRequired() })
    .min(-180, validationMessages.coachingCenter.location.longitudeRange())
    .max(180, validationMessages.coachingCenter.location.longitudeRange()),
  address: centerAddressSchema,
});

const operatingDaysSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const operationalTimingSchema = z.object({
  operating_days: z
    .array(operatingDaysSchema, { message: validationMessages.coachingCenter.operationalTiming.operatingDaysRequired() })
    .min(1, validationMessages.coachingCenter.operationalTiming.operatingDaysMinOne()),
  opening_time: z
    .string({ message: validationMessages.coachingCenter.operationalTiming.openingTimeRequired() })
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, validationMessages.coachingCenter.operationalTiming.openingTimeFormat()),
  closing_time: z
    .string({ message: validationMessages.coachingCenter.operationalTiming.closingTimeRequired() })
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, validationMessages.coachingCenter.operationalTiming.closingTimeFormat()),
}).refine(
  (data) => {
    const [openHour, openMin] = data.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = data.closing_time.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    return closeTime > openTime;
  },
  {
    message: validationMessages.coachingCenter.operationalTiming.closingAfterOpening(),
    path: ['closing_time'],
  }
);

// Media item schema (for images and documents)
const mediaItemSchema = z.object({
  unique_id: z.string().optional(),
  url: z.string({ message: validationMessages.coachingCenter.media.urlRequired() }).url(validationMessages.coachingCenter.media.urlInvalid()),
  is_active: z.boolean().default(true),
  is_deleted: z.boolean().default(false),
});

// Video item schema (with thumbnail)
const videoItemSchema = z.object({
  unique_id: z.string().optional(),
  url: z.string({ message: validationMessages.coachingCenter.media.urlRequired() }).url(validationMessages.coachingCenter.media.urlInvalid()),
  thumbnail: z.string().url(validationMessages.coachingCenter.media.urlInvalid()).optional().nullable(),
  is_active: z.boolean().default(true),
  is_deleted: z.boolean().default(false),
});

// Sport detail schema (NEW)
const sportDetailSchema = z.object({
  sport_id: z.string({ message: validationMessages.coachingCenter.sports.required() }).min(1),
  description: z
    .string({ message: validationMessages.coachingCenter.description.required() })
    .min(5, validationMessages.coachingCenter.description.minLength())
    .max(2000, validationMessages.coachingCenter.description.maxLength()),
  images: z.array(mediaItemSchema).default([]),
  videos: z.array(videoItemSchema).default([]),
});


// Facility can be array of IDs (strings) or array of objects (for new facilities)
const facilityInputSchema = z.array(
  z.union([
    z.string(), // Existing facility ID
    z.object({
      name: z.string().min(1, 'Facility name is required').max(100, 'Facility name must be less than 100 characters'),
    }),
  ])
).optional().nullable();

const bankInformationSchema = z.object({
  bank_name: z.string({ message: validationMessages.coachingCenter.bankInformation.bankNameRequired() }).min(1).max(100, validationMessages.coachingCenter.bankInformation.bankNameMaxLength()),
  account_number: z
    .string({ message: validationMessages.coachingCenter.bankInformation.accountNumberRequired() })
    .min(9, validationMessages.coachingCenter.bankInformation.accountNumberMinLength())
    .max(18, validationMessages.coachingCenter.bankInformation.accountNumberMaxLength())
    .regex(/^\d+$/, validationMessages.coachingCenter.bankInformation.accountNumberDigits()),
  ifsc_code: z
    .string({ message: validationMessages.coachingCenter.bankInformation.ifscCodeRequired() })
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, validationMessages.coachingCenter.bankInformation.ifscCodeFormat()),
  account_holder_name: z
    .string({ message: validationMessages.coachingCenter.bankInformation.accountHolderNameRequired() })
    .min(1)
    .max(100, validationMessages.coachingCenter.bankInformation.accountHolderNameMaxLength()),
  gst_number: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, validationMessages.coachingCenter.bankInformation.gstNumberFormat())
    .optional()
    .nullable(),
});

/**
 * BASE SCHEMAS
 */
const coachingCenterBaseSchema = {
  center_name: z.string().max(255, validationMessages.coachingCenter.centerName.maxLength()).optional(),
  mobile_number: z.string().optional(),
  email: z.string().optional(),
  rules_regulation: z.array(z.string().max(500, validationMessages.coachingCenter.rulesRegulation.maxLength())).optional().nullable(),
  logo: z.string().url(validationMessages.coachingCenter.logo.invalidUrl()).optional(),
  sports: z.array(z.string()).optional(),
  sport_details: z.array(sportDetailSchema).optional(),
  age: ageRangeSchema.optional(),
  location: locationSchema.optional(),
  facility: facilityInputSchema.optional().nullable(),
  operational_timing: operationalTimingSchema.optional(),
  documents: z.array(mediaItemSchema).optional().default([]),
  status: z.enum(['draft', 'published'], { message: validationMessages.coachingCenter.status.invalid() }).default('draft'),
  allowed_genders: z.array(z.nativeEnum(Gender)).min(1, 'At least one gender must be selected'),
  allowed_disabled: z.boolean(),
  is_only_for_disabled: z.boolean(),
  experience: z.number().int().min(0),
};

const commonSuperRefine = (data: any, ctx: z.RefinementCtx) => {
  if (data.status === 'published') {
    if (!data.center_name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.centerName.required(), path: ['center_name'] });
    }
    if (!data.mobile_number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.mobileNumber.required(), path: ['mobile_number'] });
    } else if (data.mobile_number.length !== 10 || !/^[6-9]\d{9}$/.test(data.mobile_number)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.mobileNumber.invalidPattern(), path: ['mobile_number'] });
    }
    if (!data.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.email.required(), path: ['email'] });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.email.invalid(), path: ['email'] });
    }
    if (!data.sport_details?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.sports.minOne(), path: ['sport_details'] });
    }
    if (!data.logo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.logo.required(), path: ['logo'] });
    }
    if (!data.sports?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.sports.minOne(), path: ['sports'] });
    }
    if (!data.age) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.age.minRequired(), path: ['age'] });
    }
    if (!data.location?.latitude || !data.location?.longitude || !data.location?.address?.line2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.location.latitudeRequired(), path: ['location'] });
    }
    if (!data.operational_timing) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.operationalTiming.openingTimeRequired(), path: ['operational_timing'] });
    }
  }
};

/**
 * ACADEMY SCHEMAS (Has Bank Info)
 */
export const academyCoachingCenterCreateSchema = z.object({
  body: z.object({
    ...coachingCenterBaseSchema,
    bank_information: bankInformationSchema.optional(),
  }).superRefine((data, ctx) => {
    commonSuperRefine(data, ctx);
    if (data.status === 'published' && !data.bank_information) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.bankInformation.bankNameRequired(), path: ['bank_information'] });
    }
  })
});

export const academyCoachingCenterUpdateSchema = z.object({
  body: z.object({
    ...coachingCenterBaseSchema,
    bank_information: bankInformationSchema.optional(),
    status: z.enum(['draft', 'published']).optional(),
  }).superRefine((data, ctx) => {
    if (data.status === 'published') {
      commonSuperRefine(data, ctx);
      // For update, we might not have all fields in the body, but commonService.validatePublishStatus handles that.
      // Here we just validate what's provided.
      if (data.bank_information === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationMessages.coachingCenter.bankInformation.bankNameRequired(), path: ['bank_information'] });
      }
    }
  })
});

/**
 * ADMIN SCHEMAS (No Bank Info, Always Published, Minimal Validation)
 */
export const adminCoachingCenterCreateSchema = z.object({
  body: z.object({
    ...coachingCenterBaseSchema,
    status: z.literal('published').default('published'),
    academy_owner: z.object({
      firstName: z.string({ message: 'First name is required' }).min(1),
      lastName: z.string().optional(),
      email: z.string({ message: 'Email is required' }).email('Invalid email address'),
      mobile: z.string({ message: 'Mobile number is required' }).regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
    }),
  })
});

export const adminCoachingCenterUpdateSchema = z.object({
  body: z.object({
    ...coachingCenterBaseSchema,
    status: z.literal('published').optional(),
    userId: z.string().optional(),
  })
});

// Legacy exports for backward compatibility (defaults to academy)
export const coachingCenterCreateSchema = academyCoachingCenterCreateSchema;
export const coachingCenterUpdateSchema = academyCoachingCenterUpdateSchema;

export type CoachingCenterCreateInput = z.infer<typeof coachingCenterCreateSchema>['body'];
export type CoachingCenterUpdateInput = z.infer<typeof coachingCenterUpdateSchema>['body'];
export type AdminCoachingCenterCreateInput = z.infer<typeof adminCoachingCenterCreateSchema>['body'];
export type AdminCoachingCenterUpdateInput = z.infer<typeof adminCoachingCenterUpdateSchema>['body'];
