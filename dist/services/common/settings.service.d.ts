import { Settings } from '../../models/settings.model';
/**
 * Get application settings
 * Returns the single settings document (creates default if doesn't exist)
 * @param includeSensitive - Whether to include sensitive data (decrypted). Default: false
 */
export declare const getSettings: (includeSensitive?: boolean) => Promise<Settings>;
/**
 * Get public settings (excludes sensitive data)
 * @deprecated Use getLimitedPublicSettings for public routes
 */
export declare const getPublicSettings: () => Promise<Settings>;
/**
 * Get limited public settings (only essential public-facing data)
 * Returns only: app_name, app_logo, and contact info
 * Excludes: basic_info, fees, notifications details, payment details, and all sensitive data
 */
export declare const getLimitedPublicSettings: () => Promise<Partial<Settings>>;
/**
 * Update application settings
 * Merges new data with existing settings
 * @param data - Settings data to update
 * @param includeSensitive - Whether the input data includes sensitive fields that need encryption
 */
export declare const updateSettings: (data: Partial<Settings>, includeSensitive?: boolean) => Promise<Settings>;
/**
 * Reset settings to default
 */
export declare const resetSettings: () => Promise<Settings>;
/**
 * Get specific setting value (for use in services)
 * Returns decrypted value for sensitive fields
 */
export declare const getSettingValue: <T = any>(path: string) => Promise<T | null>;
/**
 * Get config value with settings priority (Settings first, then ENV fallback)
 * This is the main function to use in services
 */
export declare const getConfigWithPriority: <T = any>(settingsPath: string, envValue: T | null | undefined) => Promise<T | null>;
/**
 * Get Payment Gateway credentials with settings priority
 */
export declare const getPaymentCredentials: () => Promise<{
    keyId: string;
    keySecret: string;
    webhookSecret: string;
}>;
/**
 * Get SMS/Twilio credentials with settings priority
 */
export declare const getSmsCredentials: () => Promise<{
    accountSid: string;
    authToken: string;
    fromPhone: string;
}>;
/**
 * Get Email credentials with settings priority
 */
export declare const getEmailConfig: () => Promise<{
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
    fromName: string;
    secure: boolean;
}>;
/**
 * Get SMS enabled status with settings priority
 */
export declare const getSmsEnabled: () => Promise<boolean>;
//# sourceMappingURL=settings.service.d.ts.map