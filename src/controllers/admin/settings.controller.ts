import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as settingsService from '../../services/common/settings.service';

/**
 * Get all settings (admin only - includes sensitive data)
 */
export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.getSettings(true); // Include sensitive data
    const response = new ApiResponse(200, { settings }, 'Settings retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update settings (admin only)
 */
export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settingsData = req.body;

    if (!settingsData || Object.keys(settingsData).length === 0) {
      throw new ApiError(400, 'Settings data is required');
    }

    // Update settings with sensitive data encryption
    const settings = await settingsService.updateSettings(settingsData, true);
    const response = new ApiResponse(200, { settings }, 'Settings updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update basic information
 */
export const updateBasicInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { app_name, app_logo, about_us, support_email, support_phone, meta_description, meta_keywords } = req.body;

    const updateData: any = {};
    if (app_name !== undefined) updateData.app_name = app_name;
    if (app_logo !== undefined) updateData.app_logo = app_logo;
    if (about_us !== undefined || support_email !== undefined || support_phone !== undefined || meta_description !== undefined || meta_keywords !== undefined) {
      updateData.basic_info = {};
      if (about_us !== undefined) updateData.basic_info.about_us = about_us;
      if (support_email !== undefined) updateData.basic_info.support_email = support_email;
      if (support_phone !== undefined) updateData.basic_info.support_phone = support_phone;
      if (meta_description !== undefined) updateData.basic_info.meta_description = meta_description;
      if (meta_keywords !== undefined) updateData.basic_info.meta_keywords = meta_keywords;
    }

    const settings = await settingsService.updateSettings(updateData, false);
    const response = new ApiResponse(200, { settings }, 'Basic information updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update fee configuration
 */
export const updateFeeConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { platform_fee, gst_percentage, gst_enabled, currency } = req.body;

    const updateData: any = {
      fees: {},
    };

    if (platform_fee !== undefined) updateData.fees.platform_fee = platform_fee;
    if (gst_percentage !== undefined) updateData.fees.gst_percentage = gst_percentage;
    if (gst_enabled !== undefined) updateData.fees.gst_enabled = gst_enabled;
    if (currency !== undefined) updateData.fees.currency = currency;

    const settings = await settingsService.updateSettings(updateData, false);
    const response = new ApiResponse(200, { settings }, 'Fee configuration updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update notification configuration
 */
export const updateNotificationConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { notifications } = req.body;

    if (!notifications || typeof notifications !== 'object') {
      throw new ApiError(400, 'Notifications configuration is required');
    }

    const updateData = {
      notifications,
    };

    // Update with sensitive data encryption
    const settings = await settingsService.updateSettings(updateData, true);
    const response = new ApiResponse(200, { settings }, 'Notification configuration updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment configuration
 */
export const updatePaymentConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { payment } = req.body;

    if (!payment || typeof payment !== 'object') {
      throw new ApiError(400, 'Payment configuration is required');
    }

    const updateData = {
      payment,
    };

    // Update with sensitive data encryption
    const settings = await settingsService.updateSettings(updateData, true);
    const response = new ApiResponse(200, { settings }, 'Payment configuration updated successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle payment gateway enable/disable
 */
export const togglePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      throw new ApiError(400, 'Enabled status (true/false) is required');
    }

    const updateData = {
      payment: {
        enabled,
      },
    };

    const settings = await settingsService.updateSettings(updateData, false);
    const response = new ApiResponse(
      200,
      { settings },
      `Payment gateway ${enabled ? 'enabled' : 'disabled'} successfully`
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset settings to default
 */
export const resetSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.resetSettings();
    const response = new ApiResponse(200, { settings }, 'Settings reset to default successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

