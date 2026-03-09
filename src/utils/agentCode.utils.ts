import crypto from 'crypto';
import { AdminUserModel } from '../models/adminUser.model';

const PREFIX = 'AG';
const RANDOM_DIGITS = 4;
const MAX_RETRIES = 10;

/**
 * Generate agentCode: "AG" + 4 random digits (e.g. AG2562)
 */
const generateAgentCodeWithRandomDigits = (): string => {
  let suffix = '';
  const randomBytes = crypto.randomBytes(RANDOM_DIGITS);
  for (let i = 0; i < RANDOM_DIGITS; i++) {
    suffix += randomBytes[i]! % 10; // 0-9
  }
  return PREFIX + suffix;
};

/**
 * Generate a unique agentCode for AdminUser (agents).
 * Format: "AG" + 4 random digits (e.g. AG2562)
 * Checks DB for uniqueness; retries on collision.
 */
export const generateUniqueAgentCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateAgentCodeWithRandomDigits();
    const exists = await AdminUserModel.exists({ agentCode: code });
    if (!exists) {
      return code;
    }
  }
  throw new Error(
    `Failed to generate unique agentCode after ${MAX_RETRIES} attempts`
  );
};
