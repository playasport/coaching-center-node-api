"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademyPayoutAccountModel = exports.PayoutAccountBankDetailsStatus = exports.BusinessType = exports.PayoutAccountActivationStatus = void 0;
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
// Activation status enum
var PayoutAccountActivationStatus;
(function (PayoutAccountActivationStatus) {
    PayoutAccountActivationStatus["PENDING"] = "pending";
    PayoutAccountActivationStatus["NEEDS_CLARIFICATION"] = "needs_clarification";
    PayoutAccountActivationStatus["ACTIVATED"] = "activated";
    PayoutAccountActivationStatus["REJECTED"] = "rejected";
})(PayoutAccountActivationStatus || (exports.PayoutAccountActivationStatus = PayoutAccountActivationStatus = {}));
// Business type enum (as per Razorpay requirements)
var BusinessType;
(function (BusinessType) {
    BusinessType["INDIVIDUAL"] = "individual";
    BusinessType["PARTNERSHIP"] = "partnership";
    BusinessType["PRIVATE_LIMITED"] = "private_limited";
    BusinessType["PUBLIC_LIMITED"] = "public_limited";
    BusinessType["LLP"] = "llp";
    BusinessType["NGO"] = "ngo";
    BusinessType["TRUST"] = "trust";
    BusinessType["SOCIETY"] = "society";
    BusinessType["HUF"] = "huf";
})(BusinessType || (exports.BusinessType = BusinessType = {}));
// Bank details status enum
var PayoutAccountBankDetailsStatus;
(function (PayoutAccountBankDetailsStatus) {
    PayoutAccountBankDetailsStatus["PENDING"] = "pending";
    PayoutAccountBankDetailsStatus["SUBMITTED"] = "submitted";
    PayoutAccountBankDetailsStatus["VERIFIED"] = "verified";
})(PayoutAccountBankDetailsStatus || (exports.PayoutAccountBankDetailsStatus = PayoutAccountBankDetailsStatus = {}));
// Sub-schemas
const bankInformationSchema = new mongoose_1.Schema({
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
}, { _id: false });
const kycAddressSchema = new mongoose_1.Schema({
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
}, { _id: false });
const kycDetailsSchema = new mongoose_1.Schema({
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
}, { _id: false });
// Main schema
const academyPayoutAccountSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => (0, uuid_1.v4)(),
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            const result = ret;
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
            const result = ret;
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
});
// Indexes (razorpay_account_id already has unique index from schema)
academyPayoutAccountSchema.index({ user: 1, is_active: 1 });
academyPayoutAccountSchema.index({ activation_status: 1 });
academyPayoutAccountSchema.index({ activation_status: 1, is_active: 1 });
exports.AcademyPayoutAccountModel = (0, mongoose_1.model)('AcademyPayoutAccount', academyPayoutAccountSchema);
//# sourceMappingURL=academyPayoutAccount.model.js.map