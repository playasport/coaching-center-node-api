"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsEnabled = exports.getEmailConfig = exports.getSmsCredentials = exports.getPaymentCredentials = exports.getConfigWithPriority = exports.getSettingValue = exports.resetSettings = exports.updateSettings = exports.getLimitedPublicSettings = exports.getPublicSettings = exports.getSettings = void 0;
const settings_model_1 = require("../../models/settings.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const encryption_1 = require("../../utils/encryption");
const env_1 = require("../../config/env");
const twilio_1 = require("../../utils/twilio");
const email_service_1 = require("./email.service");
/**
 * List of sensitive fields that should be encrypted/decrypted
 */
const SENSITIVE_FIELDS = [
    'notifications.sms.api_key',
    'notifications.sms.api_secret',
    'notifications.email.username',
    'notifications.email.password',
    'notifications.whatsapp.api_key',
    'notifications.whatsapp.api_secret',
    'notifications.whatsapp.account_sid',
    'notifications.whatsapp.auth_token',
    'payment.razorpay.key_id',
    'payment.razorpay.key_secret',
    'payment.stripe.api_key',
    'payment.stripe.secret_key',
];
/**
 * Get application settings
 * Returns the single settings document (creates default if doesn't exist)
 * @param includeSensitive - Whether to include sensitive data (decrypted). Default: false
 */
const getSettings = async (includeSensitive = false) => {
    try {
        let settings = await settings_model_1.SettingsModel.findOne().lean();
        // If no settings exist, create default settings
        if (!settings) {
            const defaultSettings = await createDefaultSettings();
            return defaultSettings;
        }
        const settingsObj = settings;
        // Decrypt sensitive fields if requested
        if (includeSensitive) {
            return (0, encryption_1.decryptObjectFields)(settingsObj, SENSITIVE_FIELDS);
        }
        return settingsObj;
    }
    catch (error) {
        logger_1.logger.error('Failed to get settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getSettings = getSettings;
/**
 * Get public settings (excludes sensitive data)
 * @deprecated Use getLimitedPublicSettings for public routes
 */
const getPublicSettings = async () => {
    try {
        const settings = await (0, exports.getSettings)(false);
        // Remove sensitive fields from the response
        const publicSettings = JSON.parse(JSON.stringify(settings));
        // Remove sensitive notification fields
        if (publicSettings.notifications?.sms) {
            delete publicSettings.notifications.sms.api_key;
            delete publicSettings.notifications.sms.api_secret;
        }
        if (publicSettings.notifications?.email) {
            delete publicSettings.notifications.email.username;
            delete publicSettings.notifications.email.password;
        }
        if (publicSettings.notifications?.whatsapp) {
            delete publicSettings.notifications.whatsapp.api_key;
            delete publicSettings.notifications.whatsapp.api_secret;
            delete publicSettings.notifications.whatsapp.account_sid;
            delete publicSettings.notifications.whatsapp.auth_token;
        }
        // Remove sensitive payment fields
        if (publicSettings.payment?.razorpay) {
            delete publicSettings.payment.razorpay.key_id;
            delete publicSettings.payment.razorpay.key_secret;
        }
        if (publicSettings.payment?.stripe) {
            delete publicSettings.payment.stripe.api_key;
            delete publicSettings.payment.stripe.secret_key;
        }
        if (publicSettings.general?.ratings_enabled === false) {
            delete publicSettings.general.ratings_enabled;
        }
        return publicSettings;
    }
    catch (error) {
        logger_1.logger.error('Failed to get public settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getPublicSettings = getPublicSettings;
/**
 * Get limited public settings (only essential public-facing data)
 * Returns only: app_name, app_logo, and contact info
 * Excludes: basic_info, fees, notifications details, payment details, and all sensitive data
 */
const getLimitedPublicSettings = async () => {
    try {
        const settings = await (0, exports.getSettings)(false);
        // Create limited public settings object with only safe, public-facing data
        const limitedSettings = {
            app_name: settings.app_name || null,
            app_logo: settings.app_logo || null,
            contact: settings.contact || null,
            general: settings.general || null,
        };
        return limitedSettings;
    }
    catch (error) {
        logger_1.logger.error('Failed to get limited public settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getLimitedPublicSettings = getLimitedPublicSettings;
/**
 * Create default settings with values from config
 */
const createDefaultSettings = async () => {
    const defaultSettings = {
        app_name: 'Play A Sport',
        app_logo: null,
        contact: {
            number: [],
            email: null,
            address: {
                office: null,
                registered: null,
            },
            whatsapp: null,
            instagram: null,
            facebook: null,
            youtube: null,
        },
        fees: {
            platform_fee: env_1.config.booking.platformFee,
            gst_percentage: env_1.config.booking.gstPercentage,
            gst_enabled: true,
            currency: 'INR',
        },
        notifications: {
            enabled: env_1.config.notification.enabled,
            sms: {
                enabled: env_1.config.sms.enabled,
                provider: 'twilio',
                api_key: null,
                api_secret: null,
                from_number: env_1.config.twilio.fromPhone,
                sender_id: null,
            },
            email: {
                enabled: env_1.config.email.enabled,
                host: env_1.config.email.host,
                port: env_1.config.email.port,
                username: env_1.config.email.username || null,
                password: env_1.config.email.password || null,
                from: env_1.config.email.from,
                from_name: env_1.config.email.fromName || null,
                secure: env_1.config.email.secure,
            },
            whatsapp: {
                enabled: env_1.config.notification.whatsapp.enabled,
                provider: 'twilio',
                account_sid: env_1.config.twilio.accountSid || null,
                auth_token: env_1.config.twilio.authToken || null,
                from_number: env_1.config.twilio.fromPhone || null,
                api_key: null,
                api_secret: null,
            },
            push: {
                enabled: env_1.config.notification.push.enabled,
            },
        },
        payment: {
            enabled: true,
            gateway: env_1.config.payment.gateway,
            razorpay: {
                key_id: env_1.config.razorpay.keyId || null,
                key_secret: env_1.config.razorpay.keySecret || null,
                enabled: true,
            },
            stripe: {
                api_key: null,
                secret_key: null,
                enabled: false,
            },
        },
    };
    // Encrypt sensitive fields before saving
    const encryptedSettings = (0, encryption_1.encryptObjectFields)(defaultSettings, SENSITIVE_FIELDS);
    const created = await settings_model_1.SettingsModel.create(encryptedSettings);
    return created.toObject();
};
/**
 * Deep merge two objects
 */
const deepMerge = (target, source) => {
    const output = JSON.parse(JSON.stringify(target));
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach((key) => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                }
                else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            }
            else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
};
const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};
/**
 * Update application settings
 * Merges new data with existing settings
 * @param data - Settings data to update
 * @param includeSensitive - Whether the input data includes sensitive fields that need encryption
 */
const updateSettings = async (data, includeSensitive = false) => {
    try {
        // Find existing settings or create new one
        let settings = await settings_model_1.SettingsModel.findOne();
        if (!settings) {
            // Create default settings first
            await createDefaultSettings();
            settings = await settings_model_1.SettingsModel.findOne();
            if (!settings) {
                throw new ApiError_1.ApiError(500, 'Failed to create default settings');
            }
        }
        // Get current settings as plain object for merging
        const currentSettings = settings.toObject();
        // Encrypt sensitive fields in input data if provided
        let dataToMerge = data;
        if (includeSensitive) {
            dataToMerge = (0, encryption_1.encryptObjectFields)(data, SENSITIVE_FIELDS);
        }
        // Deep merge with existing settings
        const merged = deepMerge(currentSettings, dataToMerge);
        // Prepare update object - include top-level keys from dataToMerge and their merged values
        // This ensures nested objects are properly included (e.g., if updating payment.razorpay.key_id, include entire merged payment object)
        const updateData = {};
        Object.keys(dataToMerge).forEach((key) => {
            if (merged[key] !== undefined && !['_id', 'createdAt', 'updatedAt', '__v'].includes(key)) {
                // Use the merged value to preserve other nested fields
                updateData[key] = merged[key];
            }
        });
        // Use findByIdAndUpdate with $set for reliable nested object updates
        // This ensures Mongoose properly saves nested objects
        const updatedSettings = await settings_model_1.SettingsModel.findByIdAndUpdate(settings._id, { $set: updateData }, { new: true, runValidators: true }).lean();
        if (!updatedSettings) {
            throw new ApiError_1.ApiError(500, 'Failed to update settings');
        }
        // Reset cached clients if notification credentials were updated
        const hasSmsSettings = dataToMerge.notifications?.sms !== undefined;
        const hasEmailSettings = dataToMerge.notifications?.email !== undefined;
        if (hasSmsSettings) {
            // Reset Twilio client so it reinitializes with new credentials
            (0, twilio_1.resetTwilioClient)();
            logger_1.logger.info('Twilio client reset due to SMS settings update');
        }
        if (hasEmailSettings) {
            // Reset email transporter so it reinitializes with new credentials
            (0, email_service_1.resetEmailTransporter)();
            logger_1.logger.info('Email transporter reset due to email settings update');
        }
        // Return decrypted settings if sensitive data was included
        if (includeSensitive) {
            return (0, encryption_1.decryptObjectFields)(updatedSettings, SENSITIVE_FIELDS);
        }
        return updatedSettings;
    }
    catch (error) {
        logger_1.logger.error('Failed to update settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.updateSettings = updateSettings;
/**
 * Reset settings to default
 */
const resetSettings = async () => {
    try {
        await settings_model_1.SettingsModel.deleteMany({});
        const defaultSettings = await createDefaultSettings();
        return defaultSettings;
    }
    catch (error) {
        logger_1.logger.error('Failed to reset settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.resetSettings = resetSettings;
/**
 * Get specific setting value (for use in services)
 * Returns decrypted value for sensitive fields
 */
const getSettingValue = async (path) => {
    try {
        const settings = await (0, exports.getSettings)(true); // Include sensitive data
        const keys = path.split('.');
        let value = settings;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            }
            else {
                return null;
            }
        }
        return value;
    }
    catch (error) {
        logger_1.logger.error(`Failed to get setting value for path: ${path}`, error);
        return null;
    }
};
exports.getSettingValue = getSettingValue;
/**
 * Get config value with settings priority (Settings first, then ENV fallback)
 * This is the main function to use in services
 */
const getConfigWithPriority = async (settingsPath, envValue) => {
    try {
        // Try to get from settings first
        const settingsValue = await (0, exports.getSettingValue)(settingsPath);
        // If settings has a value (not null/undefined), use it
        if (settingsValue !== null && settingsValue !== undefined) {
            // For strings, also check if not empty
            if (typeof settingsValue === 'string' && settingsValue.trim() !== '') {
                return settingsValue;
            }
            // For non-strings, return the value
            if (typeof settingsValue !== 'string') {
                return settingsValue;
            }
        }
        // Fallback to env value
        return envValue ?? null;
    }
    catch (error) {
        logger_1.logger.error(`Failed to get config with priority for path: ${settingsPath}`, error);
        // On error, fallback to env
        return envValue ?? null;
    }
};
exports.getConfigWithPriority = getConfigWithPriority;
/**
 * Get Payment Gateway credentials with settings priority
 */
const getPaymentCredentials = async () => {
    const keyId = await (0, exports.getConfigWithPriority)('payment.razorpay.key_id', env_1.config.razorpay.keyId);
    const keySecret = await (0, exports.getConfigWithPriority)('payment.razorpay.key_secret', env_1.config.razorpay.keySecret);
    const webhookSecret = await (0, exports.getConfigWithPriority)('payment.razorpay.webhook_secret', env_1.config.razorpay.webhookSecret);
    return {
        keyId: keyId || '',
        keySecret: keySecret || '',
        webhookSecret: webhookSecret || '',
    };
};
exports.getPaymentCredentials = getPaymentCredentials;
/**
 * Get SMS/Twilio credentials with settings priority
 */
const getSmsCredentials = async () => {
    // For Twilio, check both sms and whatsapp settings (they use same provider)
    const accountSid = await (0, exports.getConfigWithPriority)('notifications.sms.api_key', env_1.config.twilio.accountSid) || await (0, exports.getConfigWithPriority)('notifications.whatsapp.account_sid', env_1.config.twilio.accountSid);
    const authToken = await (0, exports.getConfigWithPriority)('notifications.sms.api_secret', env_1.config.twilio.authToken) || await (0, exports.getConfigWithPriority)('notifications.whatsapp.auth_token', env_1.config.twilio.authToken);
    const fromPhone = await (0, exports.getConfigWithPriority)('notifications.sms.from_number', env_1.config.twilio.fromPhone) || await (0, exports.getConfigWithPriority)('notifications.whatsapp.from_number', env_1.config.twilio.fromPhone);
    return {
        accountSid: accountSid || '',
        authToken: authToken || '',
        fromPhone: fromPhone || '',
    };
};
exports.getSmsCredentials = getSmsCredentials;
/**
 * Get Email credentials with settings priority
 */
const getEmailConfig = async () => {
    const enabled = (await (0, exports.getConfigWithPriority)('notifications.email.enabled', env_1.config.email.enabled)) ?? env_1.config.email.enabled;
    const host = (await (0, exports.getConfigWithPriority)('notifications.email.host', env_1.config.email.host)) || env_1.config.email.host;
    const port = (await (0, exports.getConfigWithPriority)('notifications.email.port', env_1.config.email.port)) ?? env_1.config.email.port;
    const username = (await (0, exports.getConfigWithPriority)('notifications.email.username', env_1.config.email.username)) || env_1.config.email.username || '';
    const password = (await (0, exports.getConfigWithPriority)('notifications.email.password', env_1.config.email.password)) || env_1.config.email.password || '';
    const from = (await (0, exports.getConfigWithPriority)('notifications.email.from', env_1.config.email.from)) || env_1.config.email.from || '';
    const fromName = (await (0, exports.getConfigWithPriority)('notifications.email.from_name', env_1.config.email.fromName)) || env_1.config.email.fromName || '';
    const secure = (await (0, exports.getConfigWithPriority)('notifications.email.secure', env_1.config.email.secure)) ?? env_1.config.email.secure;
    return {
        enabled,
        host,
        port,
        username,
        password,
        from,
        fromName,
        secure,
    };
};
exports.getEmailConfig = getEmailConfig;
/**
 * Get SMS enabled status with settings priority
 */
const getSmsEnabled = async () => {
    const enabled = await (0, exports.getConfigWithPriority)('notifications.sms.enabled', env_1.config.sms.enabled);
    return enabled ?? env_1.config.sms.enabled;
};
exports.getSmsEnabled = getSmsEnabled;
//# sourceMappingURL=settings.service.js.map