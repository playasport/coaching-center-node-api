import { HydratedDocument, Types } from 'mongoose';
export declare enum PayoutAccountActivationStatus {
    PENDING = "pending",
    NEEDS_CLARIFICATION = "needs_clarification",
    ACTIVATED = "activated",
    REJECTED = "rejected"
}
export declare enum BusinessType {
    INDIVIDUAL = "individual",
    PARTNERSHIP = "partnership",
    PRIVATE_LIMITED = "private_limited",
    PUBLIC_LIMITED = "public_limited",
    LLP = "llp",
    NGO = "ngo",
    TRUST = "trust",
    SOCIETY = "society",
    HUF = "huf"
}
export declare enum PayoutAccountBankDetailsStatus {
    PENDING = "pending",
    SUBMITTED = "submitted",
    VERIFIED = "verified"
}
export interface BankInformation {
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    bank_name?: string | null;
}
export interface KYCDetails {
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
}
export interface AcademyPayoutAccount {
    id: string;
    user: Types.ObjectId;
    razorpay_account_id: string;
    kyc_details: KYCDetails;
    bank_information?: BankInformation | null;
    activation_status: PayoutAccountActivationStatus;
    activation_requirements?: string[] | null;
    stakeholder_id?: string | null;
    product_configuration_id?: string | null;
    ready_for_payout?: 'pending' | 'ready' | null;
    bank_details_status?: 'pending' | 'submitted' | 'verified' | null;
    rejection_reason?: string | null;
    metadata?: Record<string, any> | null;
    is_active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export type AcademyPayoutAccountDocument = HydratedDocument<AcademyPayoutAccount>;
export declare const AcademyPayoutAccountModel: import("mongoose").Model<AcademyPayoutAccount, {}, {}, {}, import("mongoose").Document<unknown, {}, AcademyPayoutAccount, {}, {}> & AcademyPayoutAccount & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=academyPayoutAccount.model.d.ts.map