/**
 * Encrypt sensitive data
 * @param text - Plain text to encrypt
 * @returns Encrypted string (format: salt:iv:tag:encryptedData)
 */
export declare const encrypt: (text: string) => string;
/**
 * Decrypt sensitive data
 * @param encryptedText - Encrypted string (format: salt:iv:tag:encryptedData)
 * @returns Decrypted plain text
 */
export declare const decrypt: (encryptedText: string) => string;
/**
 * Encrypt an object's sensitive fields
 * @param obj - Object to encrypt
 * @param sensitiveFields - Array of field names to encrypt (supports nested paths like 'sms.api_key')
 * @returns Object with encrypted sensitive fields
 */
export declare const encryptObjectFields: (obj: any, sensitiveFields: string[]) => any;
/**
 * Decrypt an object's sensitive fields
 * @param obj - Object to decrypt
 * @param sensitiveFields - Array of field names to decrypt (supports nested paths)
 * @returns Object with decrypted sensitive fields
 */
export declare const decryptObjectFields: (obj: any, sensitiveFields: string[]) => any;
//# sourceMappingURL=encryption.d.ts.map