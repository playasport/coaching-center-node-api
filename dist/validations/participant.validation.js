"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantUpdateSchema = exports.participantCreateSchema = void 0;
const zod_1 = require("zod");
const gender_enum_1 = require("../enums/gender.enum");
// Address schema for participant (all fields optional to match original SQL schema)
const participantAddressSchema = zod_1.z.object({
    line1: zod_1.z.string().max(255).optional().nullable(),
    line2: zod_1.z.string().max(255).optional().nullable(),
    area: zod_1.z.string().max(255).optional().nullable(),
    city: zod_1.z.string().max(255).optional().nullable(),
    state: zod_1.z.string().max(255).optional().nullable(),
    country: zod_1.z.string().max(255).optional().nullable(),
    pincode: zod_1.z.string().max(191).optional().nullable(),
});
// Participant create schema
exports.participantCreateSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().optional(), // Optional - automatically set from logged-in user
        firstName: zod_1.z.string().max(191, 'First name must be less than 191 characters').optional().nullable(),
        lastName: zod_1.z.string().max(191, 'Last name must be less than 191 characters').optional().nullable(),
        gender: zod_1.z.enum(Object.values(gender_enum_1.Gender)).optional().nullable(),
        disability: zod_1.z.enum(['0', '1']).optional().default('0').transform((val) => parseInt(val)),
        dob: zod_1.z.string().date('Date of birth must be a valid date').optional().nullable(),
        schoolName: zod_1.z.string().max(191, 'School name must be less than 191 characters').optional().nullable(),
        contactNumber: zod_1.z.string().max(255, 'Contact number must be less than 255 characters').optional().nullable(),
        profilePhoto: zod_1.z
            .string()
            .optional()
            .nullable()
            .refine((val) => {
            // If value is provided and not empty, it must be a valid URL
            if (val && val.trim().length > 0) {
                try {
                    new URL(val);
                    return val.length <= 191;
                }
                catch {
                    return false;
                }
            }
            return true; // Empty, null, or undefined is fine (file might be uploaded instead)
        }, { message: 'Profile photo must be a valid URL (max 191 characters) or empty if uploading a file' }),
        // Note: profilePhoto can also be uploaded as a file using multipart/form-data with field name 'profileImage'
        // If both file and URL are provided, the file takes precedence
        address: zod_1.z
            .preprocess((val) => {
            // Handle multipart/form-data: if address is sent as JSON string, parse it
            if (typeof val === 'string') {
                const trimmed = val.trim();
                // If empty string, return null
                if (trimmed.length === 0) {
                    return null;
                }
                // Try to parse as JSON
                try {
                    const parsed = JSON.parse(trimmed);
                    // If parsed result is null or undefined, return as is
                    if (parsed === null || parsed === undefined) {
                        return parsed;
                    }
                    // Ensure parsed result is an object
                    if (typeof parsed === 'object') {
                        return parsed;
                    }
                    // If not an object after parsing, return original (will fail validation)
                    return val;
                }
                catch (error) {
                    // If parsing fails and it's not a JSON string, return the string as is
                    // This allows for future validation to provide a better error message
                    return val;
                }
            }
            // If it's already an object or null/undefined, return as is
            return val === undefined ? undefined : val;
        }, participantAddressSchema.optional().nullable()),
        // isSelf is not allowed in create - it's automatically set to null for manually created participants
        // Only the system sets isSelf = '1' when creating a user
    }),
});
// Participant update schema (all fields optional)
exports.participantUpdateSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().max(191, 'First name must be less than 191 characters').optional().nullable(),
        lastName: zod_1.z.string().max(191, 'Last name must be less than 191 characters').optional().nullable(),
        gender: zod_1.z.enum(Object.values(gender_enum_1.Gender)).optional().nullable(),
        disability: zod_1.z.enum(['0', '1']).optional().transform((val) => val !== undefined ? parseInt(val) : undefined),
        dob: zod_1.z.string().date('Date of birth must be a valid date').optional().nullable(),
        schoolName: zod_1.z.string().max(191, 'School name must be less than 191 characters').optional().nullable(),
        contactNumber: zod_1.z.string().max(255, 'Contact number must be less than 255 characters').optional().nullable(),
        profilePhoto: zod_1.z
            .string()
            .optional()
            .nullable()
            .refine((val) => {
            // If value is provided and not empty, it must be a valid URL
            if (val && val.trim().length > 0) {
                try {
                    new URL(val);
                    return val.length <= 191;
                }
                catch {
                    return false;
                }
            }
            return true; // Empty, null, or undefined is fine (file might be uploaded instead)
        }, { message: 'Profile photo must be a valid URL (max 191 characters) or empty if uploading a file' }),
        // Note: profilePhoto can also be uploaded as a file using multipart/form-data with field name 'profileImage'
        // If both file and URL are provided, the file takes precedence. Old photo will be deleted when updating.
        address: zod_1.z
            .preprocess((val) => {
            // Handle multipart/form-data: if address is sent as JSON string, parse it
            if (typeof val === 'string') {
                const trimmed = val.trim();
                // If empty string, return null
                if (trimmed.length === 0) {
                    return null;
                }
                // Try to parse as JSON
                try {
                    const parsed = JSON.parse(trimmed);
                    // If parsed result is null or undefined, return as is
                    if (parsed === null || parsed === undefined) {
                        return parsed;
                    }
                    // Ensure parsed result is an object
                    if (typeof parsed === 'object') {
                        return parsed;
                    }
                    // If not an object after parsing, return original (will fail validation)
                    return val;
                }
                catch (error) {
                    // If parsing fails and it's not a JSON string, return the string as is
                    // This allows for future validation to provide a better error message
                    return val;
                }
            }
            // If it's already an object or null/undefined, return as is
            return val === undefined ? undefined : val;
        }, participantAddressSchema.optional().nullable()),
        isSelf: zod_1.z.string().max(191, 'isSelf must be less than 191 characters').optional().nullable(),
    }),
});
//# sourceMappingURL=participant.validation.js.map