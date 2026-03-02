import { AcademyPayoutAccount, BusinessType } from '../../models/academyPayoutAccount.model';
export interface CreatePayoutAccountInput {
    kyc_details: {
        legal_business_name: string;
        business_type: BusinessType;
        contact_name: string;
        email: string;
        phone: string;
        pan: string;
        gst?: string | null;
        address: {
            street1: string;
            street2?: string | null;
            city: string;
            state: string;
            postal_code: string;
            country: string;
        };
    };
    bank_information?: {
        account_number: string;
        ifsc_code: string;
        account_holder_name: string;
        bank_name?: string | null;
    } | null;
    stakeholder?: {
        name: string;
        email: string;
        phone: string;
        relationship: 'director' | 'proprietor' | 'partner' | 'authorised_signatory';
        kyc: {
            pan?: string | null;
            aadhaar?: string | null;
        };
    } | null;
}
export interface UpdateBankDetailsInput {
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    bank_name?: string | null;
}
/**
 * Get payout account for an academy user
 */
export declare const getPayoutAccount: (userId: string, options?: {
    syncStatus?: boolean;
}) => Promise<AcademyPayoutAccount | null>;
/**
 * Create payout account for an academy user
 */
export declare const createPayoutAccount: (userId: string, data: CreatePayoutAccountInput, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<AcademyPayoutAccount>;
/**
 * Update bank details for payout account
 */
export declare const updateBankDetails: (userId: string, bankDetails: UpdateBankDetailsInput, options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
}) => Promise<AcademyPayoutAccount>;
/**
 * Check and update account status from Razorpay
 * This can be called via webhook or manual polling
 */
export declare const syncAccountStatus: (accountId: string) => Promise<AcademyPayoutAccount>;
//# sourceMappingURL=payoutAccount.service.d.ts.map