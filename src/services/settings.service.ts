import { SettingsModel, Settings } from '../models/settings.model';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';

/**
 * Get application settings
 * Returns the single settings document (creates default if doesn't exist)
 */
export const getSettings = async (): Promise<Settings> => {
  try {
    let settings = await SettingsModel.findOne().lean();

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = await SettingsModel.create({
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
      });
      return defaultSettings.toObject();
    }

    return settings as Settings;
  } catch (error) {
    logger.error('Failed to get settings', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update application settings
 * Merges new data with existing settings
 */
export const updateSettings = async (data: Partial<Settings>): Promise<Settings> => {
  try {
    // Find existing settings or create new one
    let settings = await SettingsModel.findOne();

    if (!settings) {
      // Create new settings document
      settings = await SettingsModel.create(data);
    } else {
      // Merge new data with existing settings (deep merge for nested objects)
      if (data.contact && settings.contact) {
        // Deep merge contact object
        settings.contact = {
          ...settings.contact.toObject(),
          ...data.contact,
          address: {
            ...(settings.contact.address?.toObject() || {}),
            ...(data.contact.address || {}),
          },
        } as any;
      } else if (data.contact) {
        settings.contact = data.contact as any;
      }

      // Update other fields
      if (data.app_name !== undefined) settings.app_name = data.app_name;
      if (data.app_logo !== undefined) settings.app_logo = data.app_logo;

      // Handle any additional dynamic fields
      Object.keys(data).forEach((key) => {
        if (!['app_name', 'app_logo', 'contact', '_id', 'createdAt', 'updatedAt'].includes(key)) {
          (settings as any)[key] = data[key as keyof Settings];
        }
      });

      await settings.save();
    }

    return settings.toObject();
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
    const defaultSettings = await SettingsModel.create({
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
    });
    return defaultSettings.toObject();
  } catch (error) {
    logger.error('Failed to reset settings', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

