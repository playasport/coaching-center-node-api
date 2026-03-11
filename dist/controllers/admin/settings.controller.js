"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettings = exports.uploadLogo = exports.togglePayment = exports.updatePaymentConfig = exports.updateNotificationConfig = exports.updateFeeConfig = exports.updateBasicInfo = exports.updateSettings = exports.getSettings = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const settingsService = __importStar(require("../../services/common/settings.service"));
const s3_service_1 = require("../../services/common/s3.service");
const imageCompression_1 = require("../../utils/imageCompression");
const logger_1 = require("../../utils/logger");
/**
 * Get all settings (admin only - includes sensitive data)
 */
const getSettings = async (_req, res, next) => {
    try {
        const settings = await settingsService.getSettings(true); // Include sensitive data
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Settings retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getSettings = getSettings;
/**
 * Update settings (admin only)
 */
const updateSettings = async (req, res, next) => {
    try {
        const settingsData = req.body;
        if (!settingsData || Object.keys(settingsData).length === 0) {
            throw new ApiError_1.ApiError(400, 'Settings data is required');
        }
        // Update settings with sensitive data encryption
        const settings = await settingsService.updateSettings(settingsData, true);
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Settings updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSettings = updateSettings;
/**
 * Update basic information
 */
const updateBasicInfo = async (req, res, next) => {
    try {
        const { app_name, app_logo, about_us, support_email, support_phone, meta_description, meta_keywords, contact } = req.body;
        const updateData = {};
        // Handle top-level fields
        if (app_name !== undefined)
            updateData.app_name = app_name;
        if (app_logo !== undefined)
            updateData.app_logo = app_logo;
        // Handle basic_info fields
        if (about_us !== undefined || support_email !== undefined || support_phone !== undefined || meta_description !== undefined || meta_keywords !== undefined) {
            updateData.basic_info = {};
            if (about_us !== undefined)
                updateData.basic_info.about_us = about_us;
            if (support_email !== undefined)
                updateData.basic_info.support_email = support_email;
            if (support_phone !== undefined)
                updateData.basic_info.support_phone = support_phone;
            if (meta_description !== undefined)
                updateData.basic_info.meta_description = meta_description;
            if (meta_keywords !== undefined)
                updateData.basic_info.meta_keywords = meta_keywords;
        }
        // Handle contact information
        if (contact !== undefined) {
            updateData.contact = {};
            if (contact.number !== undefined)
                updateData.contact.number = contact.number;
            if (contact.email !== undefined)
                updateData.contact.email = contact.email;
            if (contact.whatsapp !== undefined)
                updateData.contact.whatsapp = contact.whatsapp;
            if (contact.instagram !== undefined)
                updateData.contact.instagram = contact.instagram;
            if (contact.facebook !== undefined)
                updateData.contact.facebook = contact.facebook;
            if (contact.youtube !== undefined)
                updateData.contact.youtube = contact.youtube;
            // Handle contact address
            if (contact.address !== undefined) {
                updateData.contact.address = {};
                if (contact.address.office !== undefined)
                    updateData.contact.address.office = contact.address.office;
                if (contact.address.registered !== undefined)
                    updateData.contact.address.registered = contact.address.registered;
            }
        }
        const settings = await settingsService.updateSettings(updateData, false);
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Basic information updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateBasicInfo = updateBasicInfo;
/**
 * Update fee configuration
 */
const updateFeeConfig = async (req, res, next) => {
    try {
        const { platform_fee, gst_percentage, gst_enabled, currency } = req.body;
        const updateData = {
            fees: {},
        };
        if (platform_fee !== undefined)
            updateData.fees.platform_fee = platform_fee;
        if (gst_percentage !== undefined)
            updateData.fees.gst_percentage = gst_percentage;
        if (gst_enabled !== undefined)
            updateData.fees.gst_enabled = gst_enabled;
        if (currency !== undefined)
            updateData.fees.currency = currency;
        const settings = await settingsService.updateSettings(updateData, false);
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Fee configuration updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateFeeConfig = updateFeeConfig;
/**
 * Update notification configuration
 */
const updateNotificationConfig = async (req, res, next) => {
    try {
        const { notifications } = req.body;
        if (!notifications || typeof notifications !== 'object') {
            throw new ApiError_1.ApiError(400, 'Notifications configuration is required');
        }
        const updateData = {
            notifications,
        };
        // Update with sensitive data encryption
        const settings = await settingsService.updateSettings(updateData, true);
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Notification configuration updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateNotificationConfig = updateNotificationConfig;
/**
 * Update payment configuration
 */
const updatePaymentConfig = async (req, res, next) => {
    try {
        const { payment } = req.body;
        if (!payment || typeof payment !== 'object') {
            throw new ApiError_1.ApiError(400, 'Payment configuration is required');
        }
        const updateData = {
            payment,
        };
        // Update with sensitive data encryption
        const settings = await settingsService.updateSettings(updateData, true);
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Payment configuration updated successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePaymentConfig = updatePaymentConfig;
/**
 * Toggle payment gateway enable/disable
 */
const togglePayment = async (req, res, next) => {
    try {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            throw new ApiError_1.ApiError(400, 'Enabled status (true/false) is required');
        }
        const updateData = {
            payment: {
                enabled,
            },
        };
        const settings = await settingsService.updateSettings(updateData, false);
        const response = new ApiResponse_1.ApiResponse(200, { settings }, `Payment gateway ${enabled ? 'enabled' : 'disabled'} successfully`);
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.togglePayment = togglePayment;
/**
 * Upload app logo
 */
const uploadLogo = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError_1.ApiError(400, 'Logo file is required');
        }
        // Compress image if it's an image file
        let fileBuffer = req.file.buffer;
        if ((0, imageCompression_1.isImage)(req.file.mimetype)) {
            try {
                const originalSize = req.file.buffer.length;
                fileBuffer = await (0, imageCompression_1.compressImage)(req.file.buffer, req.file.mimetype);
                logger_1.logger.info('Logo image compressed', {
                    originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
                    compressedSize: `${(fileBuffer.length / 1024).toFixed(2)} KB`,
                    reduction: `${(((originalSize - fileBuffer.length) / originalSize) * 100).toFixed(1)}%`,
                });
            }
            catch (error) {
                logger_1.logger.warn('Logo image compression failed, using original', { error });
                // Continue with original image if compression fails
            }
        }
        // Create a modified file object with compressed buffer
        const compressedFile = {
            ...req.file,
            buffer: fileBuffer,
            size: fileBuffer.length,
        };
        // Upload to S3 in images/logo folder (permanent location)
        const logoUrl = await (0, s3_service_1.uploadFileToS3)({
            file: compressedFile,
            folder: 'images/logo',
        });
        // Update settings with the new logo URL
        const settings = await settingsService.updateSettings({ app_logo: logoUrl }, false);
        const response = new ApiResponse_1.ApiResponse(200, {
            logoUrl,
            settings
        }, 'Logo uploaded successfully');
        res.json(response);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            next(error);
        }
        else {
            logger_1.logger.error('Failed to upload logo:', error);
            next(new ApiError_1.ApiError(500, 'Failed to upload logo'));
        }
    }
};
exports.uploadLogo = uploadLogo;
/**
 * Reset settings to default
 */
const resetSettings = async (_req, res, next) => {
    try {
        const settings = await settingsService.resetSettings();
        const response = new ApiResponse_1.ApiResponse(200, { settings }, 'Settings reset to default successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.resetSettings = resetSettings;
//# sourceMappingURL=settings.controller.js.map