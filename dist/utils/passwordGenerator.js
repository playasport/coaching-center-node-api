"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecurePassword = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a secure random password that meets complexity requirements
 * Requirements: Minimum 8 characters, at least one uppercase, lowercase, number, and special character
 * @param length - Password length (default: 12)
 * @returns Generated password string
 */
const generateSecurePassword = (length = 12) => {
    if (length < 8) {
        length = 8; // Minimum required length
    }
    // Character sets
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '@$!%*?&#';
    const allChars = lowercase + uppercase + numbers + specialChars;
    // Ensure at least one character from each required set
    let password = '';
    password += lowercase[crypto_1.default.randomInt(0, lowercase.length)];
    password += uppercase[crypto_1.default.randomInt(0, uppercase.length)];
    password += numbers[crypto_1.default.randomInt(0, numbers.length)];
    password += specialChars[crypto_1.default.randomInt(0, specialChars.length)];
    // Fill the rest with random characters from all sets
    for (let i = password.length; i < length; i++) {
        password += allChars[crypto_1.default.randomInt(0, allChars.length)];
    }
    // Shuffle the password to avoid predictable patterns
    return password
        .split('')
        .sort(() => crypto_1.default.randomInt(-1, 2))
        .join('');
};
exports.generateSecurePassword = generateSecurePassword;
//# sourceMappingURL=passwordGenerator.js.map