"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptObjectFields = exports.encryptObjectFields = exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
/**
 * Encryption utility for sensitive settings data
 * Uses AES-256-GCM encryption algorithm
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const KEY_LENGTH = 32; // 32 bytes for AES-256
/**
 * Get encryption key from environment variable or generate from JWT secret
 */
const getEncryptionKey = () => {
    const encryptionKey = process.env.SETTINGS_ENCRYPTION_KEY || env_1.config.jwt.secret;
    // If key is shorter than required, derive a proper key using PBKDF2
    if (encryptionKey.length < KEY_LENGTH) {
        return crypto_1.default.pbkdf2Sync(encryptionKey, 'settings-salt', 100000, KEY_LENGTH, 'sha512');
    }
    // If key is longer, use first 32 bytes
    return Buffer.from(encryptionKey).slice(0, KEY_LENGTH);
};
/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string (format: salt:iv:tag:encryptedData)
 */
const encrypt = (text) => {
    try {
        if (!text) {
            return text;
        }
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const salt = crypto_1.default.randomBytes(SALT_LENGTH);
        // Derive key from salt
        const derivedKey = crypto_1.default.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha512');
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, derivedKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        // Return format: salt:iv:tag:encryptedData
        return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.encrypt = encrypt;
/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string (format: salt:iv:tag:encryptedData)
 * @returns Decrypted plain text
 */
const decrypt = (encryptedText) => {
    try {
        if (!encryptedText) {
            return encryptedText;
        }
        // Check if the text is already in encrypted format (contains colons)
        const parts = encryptedText.split(':');
        if (parts.length !== 4) {
            // If not in encrypted format, return as is (backward compatibility)
            return encryptedText;
        }
        const [saltHex, ivHex, tagHex, encrypted] = parts;
        const key = getEncryptionKey();
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        // Derive key from salt
        const derivedKey = crypto_1.default.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha512');
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, derivedKey, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        // If decryption fails, return original (might be plain text or corrupted)
        throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.decrypt = decrypt;
/**
 * Encrypt an object's sensitive fields
 * @param obj - Object to encrypt
 * @param sensitiveFields - Array of field names to encrypt (supports nested paths like 'sms.api_key')
 * @returns Object with encrypted sensitive fields
 */
const encryptObjectFields = (obj, sensitiveFields) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const result = JSON.parse(JSON.stringify(obj)); // Deep clone
    sensitiveFields.forEach((fieldPath) => {
        const keys = fieldPath.split('.');
        let current = result;
        // Navigate to the parent of the target field
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                return; // Field doesn't exist, skip
            }
            current = current[keys[i]];
        }
        const finalKey = keys[keys.length - 1];
        if (current[finalKey] && typeof current[finalKey] === 'string') {
            // Only encrypt if not already encrypted (doesn't contain colons in encrypted format)
            if (!current[finalKey].includes(':') || current[finalKey].split(':').length !== 4) {
                try {
                    current[finalKey] = (0, exports.encrypt)(current[finalKey]);
                }
                catch (error) {
                    // If encryption fails, leave as is
                    console.error(`Failed to encrypt field ${fieldPath}:`, error);
                }
            }
        }
    });
    return result;
};
exports.encryptObjectFields = encryptObjectFields;
/**
 * Decrypt an object's sensitive fields
 * @param obj - Object to decrypt
 * @param sensitiveFields - Array of field names to decrypt (supports nested paths)
 * @returns Object with decrypted sensitive fields
 */
const decryptObjectFields = (obj, sensitiveFields) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const result = JSON.parse(JSON.stringify(obj)); // Deep clone
    sensitiveFields.forEach((fieldPath) => {
        const keys = fieldPath.split('.');
        let current = result;
        // Navigate to the parent of the target field
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                return; // Field doesn't exist, skip
            }
            current = current[keys[i]];
        }
        const finalKey = keys[keys.length - 1];
        if (current[finalKey] && typeof current[finalKey] === 'string') {
            try {
                current[finalKey] = (0, exports.decrypt)(current[finalKey]);
            }
            catch (error) {
                // If decryption fails, might be plain text or corrupted, leave as is
                console.error(`Failed to decrypt field ${fieldPath}:`, error);
            }
        }
    });
    return result;
};
exports.decryptObjectFields = decryptObjectFields;
//# sourceMappingURL=encryption.js.map