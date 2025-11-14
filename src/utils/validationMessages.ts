import { t } from './i18n';

/**
 * Get validation messages from en.json
 */
export const getValidationMessage = (key: string): string => {
  return t(`validation.${key}`);
};

/**
 * Validation message keys mapped to en.json paths
 */
export const validationMessages = {
  email: {
    required: () => getValidationMessage('email.required'),
    invalid: () => getValidationMessage('email.invalid'),
  },
  password: {
    required: () => getValidationMessage('password.required'),
    minLength: () => getValidationMessage('password.minLength'),
    invalidPattern: () => getValidationMessage('password.invalidPattern'),
    sameAsCurrent: () => getValidationMessage('password.sameAsCurrent'),
  },
  coachingName: {
    required: () => getValidationMessage('coachingName.required'),
    mustBeString: () => getValidationMessage('coachingName.mustBeString'),
  },
  firstName: {
    required: () => getValidationMessage('firstName.required'),
    mustBeString: () => getValidationMessage('firstName.mustBeString'),
    invalidFormat: () => getValidationMessage('firstName.invalidFormat'),
  },
  lastName: {
    mustBeString: () => getValidationMessage('lastName.mustBeString'),
    invalidFormat: () => getValidationMessage('lastName.invalidFormat'),
  },
  mobileNumber: {
    required: () => getValidationMessage('mobileNumber.required'),
    mustBeString: () => getValidationMessage('mobileNumber.mustBeString'),
    minLength: () => getValidationMessage('mobileNumber.minLength'),
    invalidPattern: () => getValidationMessage('mobileNumber.invalidPattern'),
  },
  contactEmail: {
    invalid: () => getValidationMessage('contactEmail.invalid'),
  },
  contactNumber: {
    mustBeString: () => getValidationMessage('contactNumber.mustBeString'),
  },
  isVerified: {
    required: () => getValidationMessage('isVerified.required'),
    mustBeTrue: () => getValidationMessage('isVerified.mustBeTrue'),
  },
  otp: {
    required: () => getValidationMessage('otp.required'),
    length: () => getValidationMessage('otp.length'),
  },
  address: {
    line1Required: () => getValidationMessage('address.line1Required'),
    line2Required: () => getValidationMessage('address.line2Required'),
    cityRequired: () => getValidationMessage('address.cityRequired'),
    stateRequired: () => getValidationMessage('address.stateRequired'),
    countryRequired: () => getValidationMessage('address.countryRequired'),
    pincodeRequired: () => getValidationMessage('address.pincodeRequired'),
    pincodeInvalid: () => getValidationMessage('address.pincodeInvalid'),
  },
  profile: {
    noChanges: () => getValidationMessage('profile.noChanges'),
  },
  coachingCenter: {
    centerName: {
      required: () => getValidationMessage('coachingCenter.centerName.required'),
      maxLength: () => getValidationMessage('coachingCenter.centerName.maxLength'),
    },
    description: {
      required: () => getValidationMessage('coachingCenter.description.required'),
      minLength: () => getValidationMessage('coachingCenter.description.minLength'),
      maxLength: () => getValidationMessage('coachingCenter.description.maxLength'),
    },
    rulesRegulation: {
      maxLength: () => getValidationMessage('coachingCenter.rulesRegulation.maxLength'),
    },
    logo: {
      required: () => getValidationMessage('coachingCenter.logo.required'),
      invalidUrl: () => getValidationMessage('coachingCenter.logo.invalidUrl'),
      invalidAspectRatio: () => getValidationMessage('coachingCenter.logo.invalidAspectRatio'),
    },
    sports: {
      required: () => getValidationMessage('coachingCenter.sports.required'),
      minOne: () => getValidationMessage('coachingCenter.sports.minOne'),
    },
    age: {
      minRequired: () => getValidationMessage('coachingCenter.age.minRequired'),
      minInteger: () => getValidationMessage('coachingCenter.age.minInteger'),
      minRange: () => getValidationMessage('coachingCenter.age.minRange'),
      maxRequired: () => getValidationMessage('coachingCenter.age.maxRequired'),
      maxInteger: () => getValidationMessage('coachingCenter.age.maxInteger'),
      maxRange: () => getValidationMessage('coachingCenter.age.maxRange'),
      maxGreaterThanMin: () => getValidationMessage('coachingCenter.age.maxGreaterThanMin'),
    },
    location: {
      latitudeRequired: () => getValidationMessage('coachingCenter.location.latitudeRequired'),
      latitudeRange: () => getValidationMessage('coachingCenter.location.latitudeRange'),
      longitudeRequired: () => getValidationMessage('coachingCenter.location.longitudeRequired'),
      longitudeRange: () => getValidationMessage('coachingCenter.location.longitudeRange'),
    },
    facility: {
      required: () => getValidationMessage('coachingCenter.facility.required'),
      invalid: () => getValidationMessage('coachingCenter.facility.invalid'),
    },
    operationalTiming: {
      operatingDaysRequired: () => getValidationMessage('coachingCenter.operationalTiming.operatingDaysRequired'),
      operatingDaysMinOne: () => getValidationMessage('coachingCenter.operationalTiming.operatingDaysMinOne'),
      openingTimeRequired: () => getValidationMessage('coachingCenter.operationalTiming.openingTimeRequired'),
      openingTimeFormat: () => getValidationMessage('coachingCenter.operationalTiming.openingTimeFormat'),
      closingTimeRequired: () => getValidationMessage('coachingCenter.operationalTiming.closingTimeRequired'),
      closingTimeFormat: () => getValidationMessage('coachingCenter.operationalTiming.closingTimeFormat'),
      closingAfterOpening: () => getValidationMessage('coachingCenter.operationalTiming.closingAfterOpening'),
    },
    media: {
      urlRequired: () => getValidationMessage('coachingCenter.media.urlRequired'),
      urlInvalid: () => getValidationMessage('coachingCenter.media.urlInvalid'),
    },
    bankInformation: {
      bankNameRequired: () => getValidationMessage('coachingCenter.bankInformation.bankNameRequired'),
      bankNameMaxLength: () => getValidationMessage('coachingCenter.bankInformation.bankNameMaxLength'),
      accountNumberRequired: () => getValidationMessage('coachingCenter.bankInformation.accountNumberRequired'),
      accountNumberMinLength: () => getValidationMessage('coachingCenter.bankInformation.accountNumberMinLength'),
      accountNumberMaxLength: () => getValidationMessage('coachingCenter.bankInformation.accountNumberMaxLength'),
      accountNumberDigits: () => getValidationMessage('coachingCenter.bankInformation.accountNumberDigits'),
      ifscCodeRequired: () => getValidationMessage('coachingCenter.bankInformation.ifscCodeRequired'),
      ifscCodeFormat: () => getValidationMessage('coachingCenter.bankInformation.ifscCodeFormat'),
      accountHolderNameRequired: () => getValidationMessage('coachingCenter.bankInformation.accountHolderNameRequired'),
      accountHolderNameMaxLength: () => getValidationMessage('coachingCenter.bankInformation.accountHolderNameMaxLength'),
      gstNumberFormat: () => getValidationMessage('coachingCenter.bankInformation.gstNumberFormat'),
    },
    status: {
      invalid: () => getValidationMessage('coachingCenter.status.invalid'),
    },
  },
};

