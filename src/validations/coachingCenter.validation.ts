import { z } from 'zod';
import { validationMessages } from '../utils/validationMessages';

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

const mediaItemSchema = z.object({
  unique_id: z.string().optional(),
  url: z.string({ message: validationMessages.coachingCenter.media.urlRequired() }).url(validationMessages.coachingCenter.media.urlInvalid()),
  is_active: z.boolean().default(true),
  is_deleted: z.boolean().default(false),
});

const mediaSchema = z.object({
  images: z.array(mediaItemSchema).default([]),
  videos: z.array(mediaItemSchema).default([]),
  documents: z.array(mediaItemSchema).default([]),
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

// Main schema with conditional validation based on status
export const coachingCenterCreateSchema = z
  .object({
    body: z
      .object({
        center_name: z.string().max(255, validationMessages.coachingCenter.centerName.maxLength()).optional(),
        mobile_number: z.string().optional(),
        email: z.string().optional(),
        description: z.string().max(2000, validationMessages.coachingCenter.description.maxLength()).optional(),
        rules_regulation: z.string().max(5000, validationMessages.coachingCenter.rulesRegulation.maxLength()).optional().nullable(),
        logo: z.string().url(validationMessages.coachingCenter.logo.invalidUrl()).optional(),
        sports: z.array(z.string()).optional(),
        age: ageRangeSchema.optional(),
        location: locationSchema.optional(),
        facility: facilityInputSchema.optional().nullable(),
        operational_timing: operationalTimingSchema.optional(),
        media: mediaSchema.optional().default({ images: [], videos: [], documents: [] }),
        bank_information: bankInformationSchema.optional(),
        status: z.enum(['draft', 'published'], { message: validationMessages.coachingCenter.status.invalid() }).default('draft'),
      })
      .superRefine((data, ctx) => {
        // If status is 'published', validate all required fields
        if (data.status === 'published') {
          // Center name required
          if (!data.center_name || data.center_name.trim().length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.centerName.required(),
              path: ['center_name'],
            });
          }

          // Mobile number required
          if (!data.mobile_number) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.mobileNumber.required(),
              path: ['mobile_number'],
            });
          } else if (data.mobile_number.length !== 10) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.mobileNumber.minLength(),
              path: ['mobile_number'],
            });
          } else if (!/^[6-9]\d{9}$/.test(data.mobile_number)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.mobileNumber.invalidPattern(),
              path: ['mobile_number'],
            });
          }

          // Email required
          if (!data.email) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.email.required(),
              path: ['email'],
            });
          } else {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: validationMessages.email.invalid(),
                path: ['email'],
              });
            }
          }

          // Description required
          if (!data.description) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.description.required(),
              path: ['description'],
            });
          } else if (data.description.length < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.description.minLength(),
              path: ['description'],
            });
          }

          // Logo required
          if (!data.logo) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.logo.required(),
              path: ['logo'],
            });
          }

          // Sports required
          if (!data.sports || data.sports.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.sports.minOne(),
              path: ['sports'],
            });
          }

          // Age required
          if (!data.age) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.age.minRequired(),
              path: ['age'],
            });
          }

          // Location required
          if (!data.location) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.location.latitudeRequired(),
              path: ['location'],
            });
          } else {
            // Validate location fields if provided
            if (data.location.latitude === undefined || data.location.latitude === null) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: validationMessages.coachingCenter.location.latitudeRequired(),
                path: ['location', 'latitude'],
              });
            }
            if (data.location.longitude === undefined || data.location.longitude === null) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: validationMessages.coachingCenter.location.longitudeRequired(),
                path: ['location', 'longitude'],
              });
            }
            if (!data.location.address) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: validationMessages.address.line2Required(),
                path: ['location', 'address'],
              });
            } else {
              if (!data.location.address.line2) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: validationMessages.address.line2Required(),
                  path: ['location', 'address', 'line2'],
                });
              }
              if (!data.location.address.city) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: validationMessages.address.cityRequired(),
                  path: ['location', 'address', 'city'],
                });
              }
              if (!data.location.address.state) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: validationMessages.address.stateRequired(),
                  path: ['location', 'address', 'state'],
                });
              }
              if (!data.location.address.pincode) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: validationMessages.address.pincodeRequired(),
                  path: ['location', 'address', 'pincode'],
                });
              }
            }
          }

          // Operational timing required
          if (!data.operational_timing) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.operationalTiming.openingTimeRequired(),
              path: ['operational_timing'],
            });
          }

          // Bank information required
          if (!data.bank_information) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.bankInformation.bankNameRequired(),
              path: ['bank_information'],
            });
          }
        }
        // If status is 'draft', all fields are optional (no additional validation needed)
        // But if fields are provided, they should still be validated for format
        if (data.status === 'draft') {
          // Validate mobile number format if provided
          if (data.mobile_number && !/^[6-9]\d{9}$/.test(data.mobile_number)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.mobileNumber.invalidPattern(),
              path: ['mobile_number'],
            });
          }

          // Validate email format if provided
          if (data.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: validationMessages.email.invalid(),
                path: ['email'],
              });
            }
          }

          // Validate description min length if provided
          if (data.description && data.description.length < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: validationMessages.coachingCenter.description.minLength(),
              path: ['description'],
            });
          }
        }
      }),
  });

export type CoachingCenterCreateInput = z.infer<typeof coachingCenterCreateSchema>['body'];

// Update schema - all fields optional, but if provided should be validated
export const coachingCenterUpdateSchema = z.object({
  body: z.object({
    center_name: z.string().max(255, validationMessages.coachingCenter.centerName.maxLength()).optional(),
    mobile_number: z.string().regex(/^[6-9]\d{9}$/, validationMessages.mobileNumber.invalidPattern()).optional(),
    email: z.string().email(validationMessages.email.invalid()).optional(),
    description: z.string().max(2000, validationMessages.coachingCenter.description.maxLength()).optional().nullable(),
    rules_regulation: z.string().max(5000, validationMessages.coachingCenter.rulesRegulation.maxLength()).optional().nullable(),
    logo: z.string().url(validationMessages.coachingCenter.logo.invalidUrl()).optional().nullable(),
    sports: z.array(z.string()).optional(),
    age: ageRangeSchema.optional(),
    location: locationSchema.optional(),
    facility: facilityInputSchema,
    operational_timing: operationalTimingSchema.optional(),
    media: mediaSchema.optional().default({ images: [], videos: [], documents: [] }),
    bank_information: bankInformationSchema.optional(),
    status: z.enum(['draft', 'published'], { message: validationMessages.coachingCenter.status.invalid() }).optional(),
  }).refine((data) => {
    // At least one field should be provided for update
    return Object.keys(data).length > 0;
  }, {
    message: 'At least one field is required for update',
    path: ['body'],
  }),
});

export type CoachingCenterUpdateInput = z.infer<typeof coachingCenterUpdateSchema>['body'];

