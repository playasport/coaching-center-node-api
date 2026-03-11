"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettings = exports.updateSettings = exports.getSettings = void 0;
const settings_model_1 = require("../models/settings.model");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
/**
 * Get application settings
 * Returns the single settings document (creates default if doesn't exist)
 */
const getSettings = async () => {
    try {
        let settings = await settings_model_1.SettingsModel.findOne().lean();
        // If no settings exist, create default settings
        if (!settings) {
            const defaultSettings = await settings_model_1.SettingsModel.create({
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
        return settings;
    }
    catch (error) {
        logger_1.logger.error('Failed to get settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getSettings = getSettings;
/**
 * Update application settings
 * Merges new data with existing settings
 */
const updateSettings = async (data) => {
    try {
        // Find existing settings or create new one
        let settings = await settings_model_1.SettingsModel.findOne();
        if (!settings) {
            // Create new settings document
            settings = await settings_model_1.SettingsModel.create(data);
        }
        else {
            // Merge new data with existing settings (deep merge for nested objects)
            if (data.contact && settings.contact) {
                // Convert Mongoose subdocument to plain object for merging
                const existingContact = JSON.parse(JSON.stringify(settings.contact));
                const existingAddress = existingContact.address || {};
                // Deep merge contact object
                settings.contact = {
                    ...existingContact,
                    ...data.contact,
                    address: {
                        ...existingAddress,
                        ...(data.contact.address || {}),
                    },
                };
            }
            else if (data.contact) {
                settings.contact = data.contact;
            }
            // Update other fields
            if (data.app_name !== undefined)
                settings.app_name = data.app_name;
            if (data.app_logo !== undefined)
                settings.app_logo = data.app_logo;
            // Handle any additional dynamic fields
            Object.keys(data).forEach((key) => {
                if (!['app_name', 'app_logo', 'contact', '_id', 'createdAt', 'updatedAt'].includes(key)) {
                    settings[key] = data[key];
                }
            });
            await settings.save();
        }
        return settings.toObject();
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
        const defaultSettings = await settings_model_1.SettingsModel.create({
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
    catch (error) {
        logger_1.logger.error('Failed to reset settings', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.resetSettings = resetSettings;
//# sourceMappingURL=settings.service.js.map