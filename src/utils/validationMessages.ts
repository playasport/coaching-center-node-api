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
  },
  coachingName: {
    required: () => getValidationMessage('coachingName.required'),
    mustBeString: () => getValidationMessage('coachingName.mustBeString'),
  },
  firstName: {
    mustBeString: () => getValidationMessage('firstName.mustBeString'),
  },
  lastName: {
    mustBeString: () => getValidationMessage('lastName.mustBeString'),
  },
  mobileNumber: {
    mustBeString: () => getValidationMessage('mobileNumber.mustBeString'),
  },
  contactEmail: {
    invalid: () => getValidationMessage('contactEmail.invalid'),
  },
  contactNumber: {
    mustBeString: () => getValidationMessage('contactNumber.mustBeString'),
  },
};

