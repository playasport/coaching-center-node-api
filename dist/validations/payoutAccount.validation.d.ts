import { z } from 'zod';
import { BusinessType } from '../models/academyPayoutAccount.model';
/**
 * Create payout account validation schema
 */
export declare const createPayoutAccountSchema: z.ZodObject<{
    body: z.ZodObject<{
        kyc_details: z.ZodObject<{
            legal_business_name: z.ZodString;
            business_type: z.ZodEnum<typeof BusinessType>;
            contact_name: z.ZodString;
            email: z.ZodString;
            phone: z.ZodString;
            pan: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            gst: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
            address: z.ZodObject<{
                street1: z.ZodString;
                street2: z.ZodString;
                city: z.ZodString;
                state: z.ZodString;
                postal_code: z.ZodString;
                country: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
        bank_information: z.ZodOptional<z.ZodObject<{
            account_number: z.ZodString;
            ifsc_code: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            account_holder_name: z.ZodString;
            bank_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>>;
        stakeholder: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            email: z.ZodString;
            phone: z.ZodString;
            relationship: z.ZodEnum<{
                director: "director";
                proprietor: "proprietor";
                partner: "partner";
                authorised_signatory: "authorised_signatory";
            }>;
            kyc: z.ZodObject<{
                pan: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
                aadhaar: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update bank details validation schema
 */
export declare const updateBankDetailsSchema: z.ZodObject<{
    body: z.ZodObject<{
        account_number: z.ZodString;
        ifsc_code: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        account_holder_name: z.ZodString;
        bank_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Update KYC details validation schema
 */
export declare const updateKYCDetailsSchema: z.ZodObject<{
    body: z.ZodObject<{
        kyc_details: z.ZodObject<{
            legal_business_name: z.ZodOptional<z.ZodString>;
            business_type: z.ZodOptional<z.ZodEnum<typeof BusinessType>>;
            contact_name: z.ZodOptional<z.ZodString>;
            email: z.ZodOptional<z.ZodString>;
            phone: z.ZodOptional<z.ZodString>;
            pan: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            gst: z.ZodOptional<z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>>;
            address: z.ZodOptional<z.ZodObject<{
                street1: z.ZodString;
                street2: z.ZodString;
                city: z.ZodString;
                state: z.ZodString;
                postal_code: z.ZodString;
                country: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Add stakeholder validation schema
 */
export declare const addStakeholderSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodString;
        relationship: z.ZodEnum<{
            director: "director";
            proprietor: "proprietor";
            partner: "partner";
            authorised_signatory: "authorised_signatory";
        }>;
        kyc: z.ZodObject<{
            pan: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            aadhaar: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=payoutAccount.validation.d.ts.map