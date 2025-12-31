import { SettingsModel, Settings } from '../../models/settings.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { encryptObjectFields, decryptObjectFields } from '../../utils/encryption';
import { config } from '../../config/env';
import { resetTwilioClient } from '../../utils/twilio';
import { resetEmailTransporter } from './email.service';

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
export const getSettings = async (includeSensitive: boolean = false): Promise<Settings> => {
  try {
    let settings = await SettingsModel.findOne().lean();

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = await createDefaultSettings();
      return defaultSettings;
    }

    const settingsObj = settings as Settings;

    // Decrypt sensitive fields if requested
    if (includeSensitive) {
      return decryptObjectFields(settingsObj, SENSITIVE_FIELDS) as Settings;
    }

    return settingsObj;
  } catch (error) {
    logger.error('Failed to get settings', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get public settings (excludes sensitive data)
 */
export const getPublicSettings = async (): Promise<Settings> => {
  try {
    const settings = await getSettings(false);
    
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
    
    return publicSettings;
  } catch (error) {
    logger.error('Failed to get public settings', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create default settings with values from config
 */
const createDefaultSettings = async (): Promise<Settings> => {
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
      platform_fee: config.booking.platformFee,
      gst_percentage: config.booking.gstPercentage,
      gst_enabled: true,
      currency: 'INR',
    },
    notifications: {
      enabled: config.notification.enabled,
      sms: {
        enabled: config.sms.enabled,
        provider: 'twilio',
        api_key: null,
        api_secret: null,
        from_number: config.twilio.fromPhone,
        sender_id: null,
      },
      email: {
        enabled: config.email.enabled,
        host: config.email.host,
        port: config.email.port,
        username: config.email.username || null,
        password: config.email.password || null,
        from: config.email.from,
        from_name: null,
        secure: config.email.secure,
      },
      whatsapp: {
        enabled: config.notification.whatsapp.enabled,
        provider: 'twilio',
        account_sid: config.twilio.accountSid || null,
        auth_token: config.twilio.authToken || null,
        from_number: config.twilio.fromPhone || null,
        api_key: null,
        api_secret: null,
      },
      push: {
        enabled: config.notification.push.enabled,
      },
    },
    payment: {
      enabled: true,
      gateway: config.payment.gateway,
      razorpay: {
        key_id: config.razorpay.keyId || null,
        key_secret: config.razorpay.keySecret || null,
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
  const encryptedSettings = encryptObjectFields(defaultSettings, SENSITIVE_FIELDS);
  
  const created = await SettingsModel.create(encryptedSettings);
  return created.toObject();
};

/**
 * Deep merge two objects
 */
const deepMerge = (target: any, source: any): any => {
  const output = JSON.parse(JSON.stringify(target));
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
};

const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Update application settings
 * Merges new data with existing settings
 * @param data - Settings data to update
 * @param includeSensitive - Whether the input data includes sensitive fields that need encryption
 */
export const updateSettings = async (
  data: Partial<Settings>,
  includeSensitive: boolean = false
): Promise<Settings> => {
  try {
    // Find existing settings or create new one
    let settings = await SettingsModel.findOne();

    if (!settings) {
      // Create default settings first
      await createDefaultSettings();
      settings = await SettingsModel.findOne();
      if (!settings) {
        throw new ApiError(500, 'Failed to create default settings');
      }
    }

    // Get current settings as plain object for merging
    const currentSettings = settings.toObject();

    // Encrypt sensitive fields in input data if provided
    let dataToMerge = data;
    if (includeSensitive) {
      dataToMerge = encryptObjectFields(data, SENSITIVE_FIELDS);
    }

    // Deep merge with existing settings
    const merged = deepMerge(currentSettings, dataToMerge);

    // Prepare update object - include top-level keys from dataToMerge and their merged values
    // This ensures nested objects are properly included (e.g., if updating payment.razorpay.key_id, include entire merged payment object)
    const updateData: any = {};
    Object.keys(dataToMerge).forEach((key) => {
      if (merged[key] !== undefined && !['_id', 'createdAt', 'updatedAt', '__v'].includes(key)) {
        // Use the merged value to preserve other nested fields
        updateData[key] = merged[key];
      }
    });

    // Use findByIdAndUpdate with $set for reliable nested object updates
    // This ensures Mongoose properly saves nested objects
    const updatedSettings = await SettingsModel.findByIdAndUpdate(
      settings._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSettings) {
      throw new ApiError(500, 'Failed to update settings');
    }

    // Reset cached clients if notification credentials were updated
    const hasSmsSettings = dataToMerge.notifications?.sms !== undefined;
    const hasEmailSettings = dataToMerge.notifications?.email !== undefined;
    
    if (hasSmsSettings) {
      // Reset Twilio client so it reinitializes with new credentials
      resetTwilioClient();
      logger.info('Twilio client reset due to SMS settings update');
    }
    
    if (hasEmailSettings) {
      // Reset email transporter so it reinitializes with new credentials
      resetEmailTransporter();
      logger.info('Email transporter reset due to email settings update');
    }

    // Return decrypted settings if sensitive data was included
    if (includeSensitive) {
      return decryptObjectFields(updatedSettings, SENSITIVE_FIELDS) as Settings;
    }

    return updatedSettings as Settings;
  } catch (error) {
    logger.error('Failed to update settings', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Reset settings to default
 */
export const resetSettings = async (): Promise<Settings> => {
  try {
    await SettingsModel.deleteMany({});
    const defaultSettings = await createDefaultSettings();
    return defaultSettings;
  } catch (error) {
    logger.error('Failed to reset settings', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get specific setting value (for use in services)
 * Returns decrypted value for sensitive fields
 */
export const getSettingValue = async <T = any>(path: string): Promise<T | null> => {
  try {
    const settings = await getSettings(true); // Include sensitive data
    const keys = path.split('.');
    let value: any = settings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value as T;
  } catch (error) {
    logger.error(`Failed to get setting value for path: ${path}`, error);
    return null;
  }
};

/**
 * Get config value with settings priority (Settings first, then ENV fallback)
 * This is the main function to use in services
 */
export const getConfigWithPriority = async <T = any>(
  settingsPath: string,
  envValue: T | null | undefined
): Promise<T | null> => {
  try {
    // Try to get from settings first
    const settingsValue = await getSettingValue<T>(settingsPath);
    
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
  } catch (error) {
    logger.error(`Failed to get config with priority for path: ${settingsPath}`, error);
    // On error, fallback to env
    return envValue ?? null;
  }
};

/**
 * Get Payment Gateway credentials with settings priority
 */
export const getPaymentCredentials = async (): Promise<{
  keyId: string;
  keySecret: string;
}> => {
  const keyId = await getConfigWithPriority<string>('payment.razorpay.key_id', config.razorpay.keyId);
  const keySecret = await getConfigWithPriority<string>('payment.razorpay.key_secret', config.razorpay.keySecret);
  
  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
  };
};

/**
 * Get SMS/Twilio credentials with settings priority
 */
export const getSmsCredentials = async (): Promise<{
  accountSid: string;
  authToken: string;
  fromPhone: string;
}> => {
  // For Twilio, check both sms and whatsapp settings (they use same provider)
  const accountSid = await getConfigWithPriority<string>(
    'notifications.sms.api_key', 
    config.twilio.accountSid
  ) || await getConfigWithPriority<string>(
    'notifications.whatsapp.account_sid',
    config.twilio.accountSid
  );
  
  const authToken = await getConfigWithPriority<string>(
    'notifications.sms.api_secret',
    config.twilio.authToken
  ) || await getConfigWithPriority<string>(
    'notifications.whatsapp.auth_token',
    config.twilio.authToken
  );
  
  const fromPhone = await getConfigWithPriority<string>(
    'notifications.sms.from_number',
    config.twilio.fromPhone
  ) || await getConfigWithPriority<string>(
    'notifications.whatsapp.from_number',
    config.twilio.fromPhone
  );
  
  return {
    accountSid: accountSid || '',
    authToken: authToken || '',
    fromPhone: fromPhone || '',
  };
};

/**
 * Get Email credentials with settings priority
 */
export const getEmailConfig = async (): Promise<{
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  secure: boolean;
}> => {
  const enabled = (await getConfigWithPriority<boolean>('notifications.email.enabled', config.email.enabled)) ?? config.email.enabled;
  const host = (await getConfigWithPriority<string>('notifications.email.host', config.email.host)) || config.email.host;
  const port = (await getConfigWithPriority<number>('notifications.email.port', config.email.port)) ?? config.email.port;
  const username = (await getConfigWithPriority<string>('notifications.email.username', config.email.username)) || config.email.username || '';
  const password = (await getConfigWithPriority<string>('notifications.email.password', config.email.password)) || config.email.password || '';
  const from = (await getConfigWithPriority<string>('notifications.email.from', config.email.from)) || config.email.from || '';
  const secure = (await getConfigWithPriority<boolean>('notifications.email.secure', config.email.secure)) ?? config.email.secure;
  
  return {
    enabled,
    host,
    port,
    username,
    password,
    from,
    secure,
  };
};

/**
 * Get SMS enabled status with settings priority
 */
export const getSmsEnabled = async (): Promise<boolean> => {
  const enabled = await getConfigWithPriority<boolean>('notifications.sms.enabled', config.sms.enabled);
  return enabled ?? config.sms.enabled;
};


