"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStakeholderSchema = exports.updateKYCDetailsSchema = exports.updateBankDetailsSchema = exports.createPayoutAccountSchema = void 0;
const zod_1 = require("zod");
const academyPayoutAccount_model_1 = require("../models/academyPayoutAccount.model");
// Address schema for KYC
const kycAddressSchema = zod_1.z.object({
    street1: zod_1.z.string().min(1, 'Street address is required').max(100, 'Street address must be less than 100 characters'),
    street2: zod_1.z.string().min(1, 'Street 2 is required').max(100, 'Street 2 must be less than 100 characters'),
    city: zod_1.z.string().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
    state: zod_1.z.string().min(1, 'State is required').max(100, 'State must be less than 100 characters'),
    postal_code: zod_1.z.string().min(6, 'Postal code must be at least 6 characters').max(10, 'Postal code must be less than 10 characters'),
    country: zod_1.z.string().min(2, 'Country code is required').max(2, 'Country code must be 2 characters').default('IN'),
});
// KYC details schema
const kycDetailsSchema = zod_1.z.object({
    legal_business_name: zod_1.z.string().min(1, 'Legal business name is required').max(255, 'Legal business name must be less than 255 characters'),
    business_type: zod_1.z.nativeEnum(academyPayoutAccount_model_1.BusinessType, {
        message: 'Invalid business type',
    }),
    contact_name: zod_1.z.string().min(1, 'Contact name is required').max(100, 'Contact name must be less than 100 characters'),
    email: zod_1.z.string().email('Please provide a valid email address'),
    phone: zod_1.z.string().regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number'),
    pan: zod_1.z
        .string()
        .min(1, 'PAN is required')
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in valid format (e.g., ABCDE1234F)')
        .transform((val) => val.toUpperCase()),
    gst: zod_1.z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'GST must be in valid format')
        .optional()
        .nullable()
        .transform((val) => (val ? val.toUpperCase() : null)),
    address: kycAddressSchema,
});
// Bank information schema
const bankInformationSchema = zod_1.z.object({
    account_number: zod_1.z.string().min(9, 'Account number must be at least 9 digits').max(18, 'Account number must be less than 18 digits').regex(/^\d+$/, 'Account number must contain only digits'),
    ifsc_code: zod_1.z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC code must be in valid format (e.g., SBIN0001234)').transform((val) => val.toUpperCase()),
    account_holder_name: zod_1.z.string().min(1, 'Account holder name is required').max(100, 'Account holder name must be less than 100 characters'),
    bank_name: zod_1.z.string().max(100, 'Bank name must be less than 100 characters').optional().nullable(),
});
// Stakeholder schema (for creating stakeholder)
const stakeholderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Stakeholder name is required').max(100, 'Stakeholder name must be less than 100 characters'),
    email: zod_1.z.string().email('Please provide a valid email address'),
    phone: zod_1.z.string().regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number'),
    relationship: zod_1.z.enum(['director', 'proprietor', 'partner', 'authorised_signatory'], {
        message: 'Invalid relationship type',
    }),
    kyc: zod_1.z.object({
        pan: zod_1.z.string().min(1, 'PAN is required').regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be in valid format (e.g., ABCDE1234F)').transform((val) => val.toUpperCase()),
        aadhaar: zod_1.z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional().nullable(),
    }),
});
/**
 * Create payout account validation schema
 */
exports.createPayoutAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        kyc_details: kycDetailsSchema,
        bank_information: bankInformationSchema.optional(),
        stakeholder: stakeholderSchema.optional(), // Optional - can be added later
    }),
});
/**
 * Update bank details validation schema
 */
exports.updateBankDetailsSchema = zod_1.z.object({
    body: bankInformationSchema,
});
/**
 * Update KYC details validation schema
 */
exports.updateKYCDetailsSchema = zod_1.z.object({
    body: zod_1.z.object({
        kyc_details: kycDetailsSchema.partial(), // Allow partial updates
    }),
});
/**
 * Add stakeholder validation schema
 */
exports.addStakeholderSchema = zod_1.z.object({
    body: stakeholderSchema,
});
//# sourceMappingURL=payoutAccount.validation.js.map