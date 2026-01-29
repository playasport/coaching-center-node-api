import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Activation status enum
export enum PayoutAccountActivationStatus {
  PENDING = 'pending',
  NEEDS_CLARIFICATION = 'needs_clarification',
  ACTIVATED = 'activated',
  REJECTED = 'rejected',
}

// Business type enum (as per Razorpay requirements)
export enum BusinessType {
  INDIVIDUAL = 'individual',
  PARTNERSHIP = 'partnership',
  PRIVATE_LIMITED = 'private_limited',
  PUBLIC_LIMITED = 'public_limited',
  LLP = 'llp',
  NGO = 'ngo',
  TRUST = 'trust',
  SOCIETY = 'society',
  HUF = 'huf',
}

// Bank details status enum
export enum PayoutAccountBankDetailsStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
}

// Bank information interface
export interface BankInformation {
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  bank_name?: string | null;
}

// KYC details interface
export interface KYCDetails {
  legal_business_name: string;
  business_type: BusinessType;
  contact_name: string;
  email: string;
  phone: string;
  pan: string; // Required - mandatory for all business types (needed for stakeholder creation)
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

// Main Academy Payout Account interface
export interface AcademyPayoutAccount {
  id: string;
  user: Types.ObjectId; // Reference to User model (_id) - the academy owner
  razorpay_account_id: string; // Razorpay Linked Account ID (account_id from Route API)
  kyc_details: KYCDetails;
  bank_information?: BankInformation | null;
  activation_status: PayoutAccountActivationStatus;
  activation_requirements?: string[] | null; // Requirements from Razorpay if needs_clarification
  stakeholder_id?: string | null; // Razorpay stakeholder ID
  product_configuration_id?: string | null; // Razorpay product configuration ID (acc_prd_xxx)
  ready_for_payout?: 'pending' | 'ready' | null; // Route product configuration status - ready for payouts
  bank_details_status?: 'pending' | 'submitted' | 'verified' | null;
  rejection_reason?: string | null;
  metadata?: Record<string, any> | null; // Additional metadata
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AcademyPayoutAccountDocument = HydratedDocument<AcademyPayoutAccount>;

// Sub-schemas
const bankInformationSchema = new Schema<BankInformation>(
  {
    account_number: {
      type: String,
      required: true,
      trim: true,
    },
    ifsc_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{4}0[A-Z0-9]{6}$/, // IFSC format validation
    },
    account_holder_name: {
      type: String,
      required: true,
      trim: true,
    },
    bank_name: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const kycAddressSchema = new Schema<KYCDetails['address']>(
  {
    street1: {
      type: String,
      required: true,
      trim: true,
    },
    street2: {
      type: String,
      default: null,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postal_code: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      default: 'IN',
      trim: true,
    },
  },
  { _id: false }
);

const kycDetailsSchema = new Schema<KYCDetails>(
  {
    legal_business_name: {
      type: String,
      required: true,
      trim: true,
    },
    business_type: {
      type: String,
      enum: Object.values(BusinessType),
      required: true,
    },
    contact_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Email validation
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/, // Indian mobile number validation
    },
    pan: {
      type: String,
      required: true, // Required - mandatory for all business types (needed for stakeholder creation)
      trim: true,
      uppercase: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, // PAN format validation
    },
    gst: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
      match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, // GST format validation
    },
    address: {
      type: kycAddressSchema,
      required: true,
    },
  },
  { _id: false }
);

// Main schema
const academyPayoutAccountSchema = new Schema<AcademyPayoutAccount>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true, // One account per academy user
    },
    razorpay_account_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    kyc_details: {
      type: kycDetailsSchema,
      required: true,
    },
    bank_information: {
      type: bankInformationSchema,
      default: null,
    },
    activation_status: {
      type: String,
      enum: Object.values(PayoutAccountActivationStatus),
      required: true,
      default: PayoutAccountActivationStatus.PENDING,
    },
    activation_requirements: {
      type: [String],
      default: null,
    },
    stakeholder_id: {
      type: String,
      default: null,
      trim: true,
    },
    product_configuration_id: {
      type: String,
      default: null,
      trim: true,
    },
    ready_for_payout: {
      type: String,
      enum: ['pending', 'ready', null],
      default: null,
    },
    bank_details_status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', null],
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        // Mask sensitive bank information in JSON output
        if (result.bank_information?.account_number) {
          const accNum = result.bank_information.account_number;
          if (accNum.length > 4) {
            result.bank_information.account_number = `****${accNum.slice(-4)}`;
          }
        }
      },
    },
    toObject: {
      transform(_doc, ret) {
        const result = ret as any;
        result.id = result.id ?? result._id;
        delete result._id;
        // Mask sensitive bank information in object output
        if (result.bank_information?.account_number) {
          const accNum = result.bank_information.account_number;
          if (accNum.length > 4) {
            result.bank_information.account_number = `****${accNum.slice(-4)}`;
          }
        }
      },
    },
  }
);

// Indexes (razorpay_account_id already has unique index from schema)
academyPayoutAccountSchema.index({ user: 1, is_active: 1 });
academyPayoutAccountSchema.index({ activation_status: 1 });
academyPayoutAccountSchema.index({ activation_status: 1, is_active: 1 });

export const AcademyPayoutAccountModel = model<AcademyPayoutAccount>(
  'AcademyPayoutAccount',
  academyPayoutAccountSchema
);
