"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachingCenterUpdateSchema = exports.coachingCenterCreateSchema = exports.adminCoachingCenterUpdateAddedBySchema = exports.adminCoachingCenterUpdateSchema = exports.adminCoachingCenterCreateSchema = exports.academyCoachingCenterUpdateSchema = exports.academyCoachingCenterCreateSchema = void 0;
const zod_1 = require("zod");
const validationMessages_1 = require("../utils/validationMessages");
const string_1 = require("../utils/string");
const gender_enum_1 = require("../enums/gender.enum");
// Mobile number and email validation will be done in superRefine
const ageRangeSchema = zod_1.z.object({
    min: zod_1.z
        .number({ message: validationMessages_1.validationMessages.coachingCenter.age.minRequired() })
        .int(validationMessages_1.validationMessages.coachingCenter.age.minInteger())
        .min(3, validationMessages_1.validationMessages.coachingCenter.age.minRange())
        .max(18, validationMessages_1.validationMessages.coachingCenter.age.minRange()),
    max: zod_1.z
        .number({ message: validationMessages_1.validationMessages.coachingCenter.age.maxRequired() })
        .int(validationMessages_1.validationMessages.coachingCenter.age.maxInteger())
        .min(3, validationMessages_1.validationMessages.coachingCenter.age.maxRange())
        .max(18, validationMessages_1.validationMessages.coachingCenter.age.maxRange()),
}).refine((data) => data.max >= data.min, {
    message: validationMessages_1.validationMessages.coachingCenter.age.maxGreaterThanMin(),
    path: ['max'],
});
const centerAddressSchema = zod_1.z.object({
    line1: zod_1.z.string().max(255).optional().nullable(),
    line2: zod_1.z.string({ message: validationMessages_1.validationMessages.address.line2Required() }).min(1).max(100),
    city: zod_1.z.string({ message: validationMessages_1.validationMessages.address.cityRequired() }).min(1).max(100),
    state: zod_1.z.string({ message: validationMessages_1.validationMessages.address.stateRequired() }).min(1).max(100),
    country: zod_1.z.string().max(100).optional().nullable(),
    pincode: zod_1.z
        .string({ message: validationMessages_1.validationMessages.address.pincodeRequired() })
        .regex(/^\d{6}$/, validationMessages_1.validationMessages.address.pincodeInvalid()),
});
const locationSchema = zod_1.z.object({
    latitude: zod_1.z
        .number({ message: validationMessages_1.validationMessages.coachingCenter.location.latitudeRequired() })
        .min(-90, validationMessages_1.validationMessages.coachingCenter.location.latitudeRange())
        .max(90, validationMessages_1.validationMessages.coachingCenter.location.latitudeRange()),
    longitude: zod_1.z
        .number({ message: validationMessages_1.validationMessages.coachingCenter.location.longitudeRequired() })
        .min(-180, validationMessages_1.validationMessages.coachingCenter.location.longitudeRange())
        .max(180, validationMessages_1.validationMessages.coachingCenter.location.longitudeRange()),
    address: centerAddressSchema,
});
const operatingDaysSchema = zod_1.z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
]);
const operationalTimingSchema = zod_1.z.object({
    operating_days: zod_1.z
        .array(operatingDaysSchema, { message: validationMessages_1.validationMessages.coachingCenter.operationalTiming.operatingDaysRequired() })
        .min(1, validationMessages_1.validationMessages.coachingCenter.operationalTiming.operatingDaysMinOne()),
    opening_time: zod_1.z
        .string({ message: validationMessages_1.validationMessages.coachingCenter.operationalTiming.openingTimeRequired() })
        .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, validationMessages_1.validationMessages.coachingCenter.operationalTiming.openingTimeFormat()),
    closing_time: zod_1.z
        .string({ message: validationMessages_1.validationMessages.coachingCenter.operationalTiming.closingTimeRequired() })
        .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, validationMessages_1.validationMessages.coachingCenter.operationalTiming.closingTimeFormat()),
}).refine((data) => {
    const [openHour, openMin] = data.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = data.closing_time.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    return closeTime > openTime;
}, {
    message: validationMessages_1.validationMessages.coachingCenter.operationalTiming.closingAfterOpening(),
    path: ['closing_time'],
});
// Media item schema (for images and documents)
const mediaItemSchema = zod_1.z.object({
    unique_id: zod_1.z.string().optional(),
    url: zod_1.z.string({ message: validationMessages_1.validationMessages.coachingCenter.media.urlRequired() }).url(validationMessages_1.validationMessages.coachingCenter.media.urlInvalid()),
    is_active: zod_1.z.boolean().default(true),
    is_deleted: zod_1.z.boolean().default(false),
});
// Video item schema (with thumbnail)
const videoItemSchema = zod_1.z.object({
    unique_id: zod_1.z.string().optional(),
    url: zod_1.z.string({ message: validationMessages_1.validationMessages.coachingCenter.media.urlRequired() }).url(validationMessages_1.validationMessages.coachingCenter.media.urlInvalid()),
    thumbnail: zod_1.z.string().url(validationMessages_1.validationMessages.coachingCenter.media.urlInvalid()).optional().nullable(),
    is_active: zod_1.z.boolean().default(true),
    is_deleted: zod_1.z.boolean().default(false),
});
// Sport detail schema (NEW)
const sportDetailSchema = zod_1.z.object({
    sport_id: zod_1.z.string({ message: validationMessages_1.validationMessages.coachingCenter.sports.required() }).min(1),
    description: zod_1.z
        .string({ message: validationMessages_1.validationMessages.coachingCenter.description.required() })
        .min(5, validationMessages_1.validationMessages.coachingCenter.description.minLength())
        .max(2000, validationMessages_1.validationMessages.coachingCenter.description.maxLength()),
    images: zod_1.z.array(mediaItemSchema).default([]),
    videos: zod_1.z.array(videoItemSchema).default([]),
});
// Facility can be array of IDs (strings) or array of objects (for new facilities)
const facilityInputSchema = zod_1.z.array(zod_1.z.union([
    zod_1.z.string(), // Existing facility ID
    zod_1.z.object({
        name: zod_1.z.string().min(1, 'Facility name is required').max(100, 'Facility name must be less than 100 characters'),
    }),
])).optional().nullable();
/**
 * BASE SCHEMAS
 */
const coachingCenterBaseSchema = {
    center_name: zod_1.z.string().max(100, validationMessages_1.validationMessages.coachingCenter.centerName.maxLength()).optional(),
    mobile_number: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    rules_regulation: zod_1.z.array(zod_1.z.string().max(500, validationMessages_1.validationMessages.coachingCenter.rulesRegulation.maxLength())).optional().nullable(),
    logo: zod_1.z.string().url(validationMessages_1.validationMessages.coachingCenter.logo.invalidUrl()).optional(),
    sports: zod_1.z.array(zod_1.z.string()).optional(),
    sport_details: zod_1.z.array(sportDetailSchema).optional(),
    age: ageRangeSchema.optional(),
    location: locationSchema.optional(),
    facility: facilityInputSchema.optional().nullable(),
    operational_timing: operationalTimingSchema.optional(),
    documents: zod_1.z.array(mediaItemSchema).optional().default([]),
    status: zod_1.z.enum(['draft', 'published'], { message: validationMessages_1.validationMessages.coachingCenter.status.invalid() }).default('draft'),
    allowed_genders: zod_1.z.array(zod_1.z.nativeEnum(gender_enum_1.Gender)).min(1, 'At least one gender must be selected'),
    allowed_disabled: zod_1.z.boolean(),
    is_only_for_disabled: zod_1.z.boolean(),
    experience: zod_1.z.number().int().min(0),
};
const commonSuperRefine = (data, ctx) => {
    if (data.status === 'published') {
        if (!data.center_name?.trim()) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.centerName.required(), path: ['center_name'] });
        }
        if (!data.mobile_number) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.mobileNumber.required(), path: ['mobile_number'] });
        }
        else if (data.mobile_number.length !== 10 || !/^[6-9]\d{9}$/.test(data.mobile_number)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.mobileNumber.invalidPattern(), path: ['mobile_number'] });
        }
        if (!data.email) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.email.required(), path: ['email'] });
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.email.invalid(), path: ['email'] });
        }
        if (!data.sport_details?.length) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.sports.minOne(), path: ['sport_details'] });
        }
        if (!data.logo) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.logo.required(), path: ['logo'] });
        }
        if (!data.sports?.length) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.sports.minOne(), path: ['sports'] });
        }
        if (!data.age) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.age.minRequired(), path: ['age'] });
        }
        if (!data.location?.latitude || !data.location?.longitude || !data.location?.address?.line2) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.location.latitudeRequired(), path: ['location'] });
        }
        if (!data.operational_timing) {
            ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: validationMessages_1.validationMessages.coachingCenter.operationalTiming.openingTimeRequired(), path: ['operational_timing'] });
        }
    }
};
/**
 * ACADEMY SCHEMAS (Has Bank Info)
 */
exports.academyCoachingCenterCreateSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        ...coachingCenterBaseSchema,
    })
        .superRefine((data, ctx) => {
        commonSuperRefine(data, ctx);
    }),
});
exports.academyCoachingCenterUpdateSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        ...coachingCenterBaseSchema,
        status: zod_1.z.enum(['draft', 'published']).optional(),
    })
        .superRefine((data, ctx) => {
        if (data.status === 'published') {
            commonSuperRefine(data, ctx);
        }
    }),
});
/**
 * ADMIN SCHEMAS (No Bank Info, Always Published, Minimal Validation)
 */
exports.adminCoachingCenterCreateSchema = zod_1.z.object({
    body: zod_1.z.object({
        ...coachingCenterBaseSchema,
        status: zod_1.z.literal('published').default('published'),
        owner_id: zod_1.z.string().optional(),
        academy_owner: zod_1.z.object({
            firstName: zod_1.z.string({ message: 'First name is required' }).min(1).transform((val) => (0, string_1.toTitleCase)(val)),
            middleName: zod_1.z
                .union([zod_1.z.string(), zod_1.z.literal('')])
                .optional()
                .transform((val) => (val && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : undefined)),
            lastName: zod_1.z.string().optional().transform((val) => (val != null && typeof val === 'string' && val.trim() ? (0, string_1.toTitleCase)(val.trim()) : undefined)),
            email: zod_1.z.string({ message: 'Email is required' }).email('Invalid email address'),
            mobile: zod_1.z.string({ message: 'Mobile number is required' }).regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
        }).optional(),
    }).refine((data) => data.owner_id || data.academy_owner, {
        message: 'Either owner_id or academy_owner must be provided',
        path: ['owner_id'],
    })
});
exports.adminCoachingCenterUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        ...coachingCenterBaseSchema,
        status: zod_1.z.literal('published').optional(),
        userId: zod_1.z.string().optional(),
    })
});
/** Body for PATCH /admin/coaching-centers/:id/added-by - update the agent/admin who added the center */
exports.adminCoachingCenterUpdateAddedBySchema = zod_1.z.object({
    body: zod_1.z.object({
        addedById: zod_1.z.string().min(1, 'addedById is required').optional().nullable(),
    }),
});
// Legacy exports for backward compatibility (defaults to academy)
exports.coachingCenterCreateSchema = exports.academyCoachingCenterCreateSchema;
exports.coachingCenterUpdateSchema = exports.academyCoachingCenterUpdateSchema;
//# sourceMappingURL=coachingCenter.validation.js.map