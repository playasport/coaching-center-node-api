"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationMessages = exports.getValidationMessage = void 0;
const i18n_1 = require("./i18n");
/**
 * Get validation messages from en.json
 */
const getValidationMessage = (key) => {
    return (0, i18n_1.t)(`validation.${key}`);
};
exports.getValidationMessage = getValidationMessage;
/**
 * Validation message keys mapped to en.json paths
 */
exports.validationMessages = {
    email: {
        required: () => (0, exports.getValidationMessage)('email.required'),
        invalid: () => (0, exports.getValidationMessage)('email.invalid'),
    },
    password: {
        required: () => (0, exports.getValidationMessage)('password.required'),
        minLength: () => (0, exports.getValidationMessage)('password.minLength'),
        invalidPattern: () => (0, exports.getValidationMessage)('password.invalidPattern'),
        sameAsCurrent: () => (0, exports.getValidationMessage)('password.sameAsCurrent'),
    },
    coachingName: {
        required: () => (0, exports.getValidationMessage)('coachingName.required'),
        mustBeString: () => (0, exports.getValidationMessage)('coachingName.mustBeString'),
    },
    firstName: {
        required: () => (0, exports.getValidationMessage)('firstName.required'),
        mustBeString: () => (0, exports.getValidationMessage)('firstName.mustBeString'),
        invalidFormat: () => (0, exports.getValidationMessage)('firstName.invalidFormat'),
    },
    lastName: {
        mustBeString: () => (0, exports.getValidationMessage)('lastName.mustBeString'),
        invalidFormat: () => (0, exports.getValidationMessage)('lastName.invalidFormat'),
    },
    mobileNumber: {
        required: () => (0, exports.getValidationMessage)('mobileNumber.required'),
        mustBeString: () => (0, exports.getValidationMessage)('mobileNumber.mustBeString'),
        minLength: () => (0, exports.getValidationMessage)('mobileNumber.minLength'),
        invalidPattern: () => (0, exports.getValidationMessage)('mobileNumber.invalidPattern'),
    },
    contactEmail: {
        invalid: () => (0, exports.getValidationMessage)('contactEmail.invalid'),
    },
    contactNumber: {
        mustBeString: () => (0, exports.getValidationMessage)('contactNumber.mustBeString'),
    },
    isVerified: {
        required: () => (0, exports.getValidationMessage)('isVerified.required'),
        mustBeTrue: () => (0, exports.getValidationMessage)('isVerified.mustBeTrue'),
    },
    otp: {
        required: () => (0, exports.getValidationMessage)('otp.required'),
        length: () => (0, exports.getValidationMessage)('otp.length'),
    },
    address: {
        line1Required: () => (0, exports.getValidationMessage)('address.line1Required'),
        line2Required: () => (0, exports.getValidationMessage)('address.line2Required'),
        cityRequired: () => (0, exports.getValidationMessage)('address.cityRequired'),
        stateRequired: () => (0, exports.getValidationMessage)('address.stateRequired'),
        countryRequired: () => (0, exports.getValidationMessage)('address.countryRequired'),
        pincodeRequired: () => (0, exports.getValidationMessage)('address.pincodeRequired'),
        pincodeInvalid: () => (0, exports.getValidationMessage)('address.pincodeInvalid'),
    },
    profile: {
        noChanges: () => (0, exports.getValidationMessage)('profile.noChanges'),
    },
    coachingCenter: {
        centerName: {
            required: () => (0, exports.getValidationMessage)('coachingCenter.centerName.required'),
            maxLength: () => (0, exports.getValidationMessage)('coachingCenter.centerName.maxLength'),
        },
        description: {
            required: () => (0, exports.getValidationMessage)('coachingCenter.description.required'),
            minLength: () => (0, exports.getValidationMessage)('coachingCenter.description.minLength'),
            maxLength: () => (0, exports.getValidationMessage)('coachingCenter.description.maxLength'),
        },
        rulesRegulation: {
            maxLength: () => (0, exports.getValidationMessage)('coachingCenter.rulesRegulation.maxLength'),
        },
        logo: {
            required: () => (0, exports.getValidationMessage)('coachingCenter.logo.required'),
            invalidUrl: () => (0, exports.getValidationMessage)('coachingCenter.logo.invalidUrl'),
            invalidAspectRatio: () => (0, exports.getValidationMessage)('coachingCenter.logo.invalidAspectRatio'),
        },
        sports: {
            required: () => (0, exports.getValidationMessage)('coachingCenter.sports.required'),
            minOne: () => (0, exports.getValidationMessage)('coachingCenter.sports.minOne'),
        },
        age: {
            minRequired: () => (0, exports.getValidationMessage)('coachingCenter.age.minRequired'),
            minInteger: () => (0, exports.getValidationMessage)('coachingCenter.age.minInteger'),
            minRange: () => (0, exports.getValidationMessage)('coachingCenter.age.minRange'),
            maxRequired: () => (0, exports.getValidationMessage)('coachingCenter.age.maxRequired'),
            maxInteger: () => (0, exports.getValidationMessage)('coachingCenter.age.maxInteger'),
            maxRange: () => (0, exports.getValidationMessage)('coachingCenter.age.maxRange'),
            maxGreaterThanMin: () => (0, exports.getValidationMessage)('coachingCenter.age.maxGreaterThanMin'),
        },
        location: {
            latitudeRequired: () => (0, exports.getValidationMessage)('coachingCenter.location.latitudeRequired'),
            latitudeRange: () => (0, exports.getValidationMessage)('coachingCenter.location.latitudeRange'),
            longitudeRequired: () => (0, exports.getValidationMessage)('coachingCenter.location.longitudeRequired'),
            longitudeRange: () => (0, exports.getValidationMessage)('coachingCenter.location.longitudeRange'),
        },
        facility: {
            required: () => (0, exports.getValidationMessage)('coachingCenter.facility.required'),
            invalid: () => (0, exports.getValidationMessage)('coachingCenter.facility.invalid'),
        },
        operationalTiming: {
            operatingDaysRequired: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.operatingDaysRequired'),
            operatingDaysMinOne: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.operatingDaysMinOne'),
            openingTimeRequired: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.openingTimeRequired'),
            openingTimeFormat: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.openingTimeFormat'),
            closingTimeRequired: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.closingTimeRequired'),
            closingTimeFormat: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.closingTimeFormat'),
            closingAfterOpening: () => (0, exports.getValidationMessage)('coachingCenter.operationalTiming.closingAfterOpening'),
        },
        media: {
            urlRequired: () => (0, exports.getValidationMessage)('coachingCenter.media.urlRequired'),
            urlInvalid: () => (0, exports.getValidationMessage)('coachingCenter.media.urlInvalid'),
        },
        bankInformation: {
            bankNameRequired: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.bankNameRequired'),
            bankNameMaxLength: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.bankNameMaxLength'),
            accountNumberRequired: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.accountNumberRequired'),
            accountNumberMinLength: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.accountNumberMinLength'),
            accountNumberMaxLength: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.accountNumberMaxLength'),
            accountNumberDigits: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.accountNumberDigits'),
            ifscCodeRequired: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.ifscCodeRequired'),
            ifscCodeFormat: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.ifscCodeFormat'),
            accountHolderNameRequired: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.accountHolderNameRequired'),
            accountHolderNameMaxLength: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.accountHolderNameMaxLength'),
            gstNumberFormat: () => (0, exports.getValidationMessage)('coachingCenter.bankInformation.gstNumberFormat'),
        },
        status: {
            invalid: () => (0, exports.getValidationMessage)('coachingCenter.status.invalid'),
        },
    },
};
//# sourceMappingURL=validationMessages.js.map