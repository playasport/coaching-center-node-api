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
};

