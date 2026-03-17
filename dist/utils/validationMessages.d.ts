/**
 * Get validation messages from en.json
 */
export declare const getValidationMessage: (key: string) => string;
/**
 * Validation message keys mapped to en.json paths
 */
export declare const validationMessages: {
    email: {
        required: () => string;
        invalid: () => string;
    };
    password: {
        required: () => string;
        minLength: () => string;
        invalidPattern: () => string;
        sameAsCurrent: () => string;
    };
    coachingName: {
        required: () => string;
        mustBeString: () => string;
    };
    firstName: {
        required: () => string;
        mustBeString: () => string;
        invalidFormat: () => string;
    };
    middleName: {
        mustBeString: () => string;
        invalidFormat: () => string;
    };
    lastName: {
        mustBeString: () => string;
        invalidFormat: () => string;
    };
    mobileNumber: {
        required: () => string;
        mustBeString: () => string;
        minLength: () => string;
        invalidPattern: () => string;
    };
    contactEmail: {
        invalid: () => string;
    };
    contactNumber: {
        mustBeString: () => string;
    };
    isVerified: {
        required: () => string;
        mustBeTrue: () => string;
    };
    otp: {
        required: () => string;
        length: () => string;
    };
    address: {
        line1Required: () => string;
        line2Required: () => string;
        cityRequired: () => string;
        stateRequired: () => string;
        countryRequired: () => string;
        pincodeRequired: () => string;
        pincodeInvalid: () => string;
    };
    profile: {
        noChanges: () => string;
    };
    coachingCenter: {
        centerName: {
            required: () => string;
            maxLength: () => string;
        };
        description: {
            required: () => string;
            minLength: () => string;
            maxLength: () => string;
        };
        rulesRegulation: {
            maxLength: () => string;
        };
        logo: {
            required: () => string;
            invalidUrl: () => string;
            invalidAspectRatio: () => string;
        };
        sports: {
            required: () => string;
            minOne: () => string;
        };
        age: {
            minRequired: () => string;
            minInteger: () => string;
            minRange: () => string;
            maxRequired: () => string;
            maxInteger: () => string;
            maxRange: () => string;
            maxGreaterThanMin: () => string;
        };
        location: {
            latitudeRequired: () => string;
            latitudeRange: () => string;
            longitudeRequired: () => string;
            longitudeRange: () => string;
        };
        facility: {
            required: () => string;
            invalid: () => string;
        };
        operationalTiming: {
            operatingDaysRequired: () => string;
            operatingDaysMinOne: () => string;
            openingTimeRequired: () => string;
            openingTimeFormat: () => string;
            closingTimeRequired: () => string;
            closingTimeFormat: () => string;
            closingAfterOpening: () => string;
        };
        media: {
            urlRequired: () => string;
            urlInvalid: () => string;
        };
        bankInformation: {
            bankNameRequired: () => string;
            bankNameMaxLength: () => string;
            accountNumberRequired: () => string;
            accountNumberMinLength: () => string;
            accountNumberMaxLength: () => string;
            accountNumberDigits: () => string;
            ifscCodeRequired: () => string;
            ifscCodeFormat: () => string;
            accountHolderNameRequired: () => string;
            accountHolderNameMaxLength: () => string;
            gstNumberFormat: () => string;
        };
        status: {
            invalid: () => string;
        };
    };
};
//# sourceMappingURL=validationMessages.d.ts.map