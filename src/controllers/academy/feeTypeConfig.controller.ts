import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { FeeTypeConfigModel, FeeType } from '../../models/feeTypeConfig.model';

/**
 * Get all available fee types
 */
export const getAllFeeTypesHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const feeTypeConfigs = await FeeTypeConfigModel.find({
      is_active: true,
      is_deleted: false,
    })
      .select('fee_type label description')
      .sort({ label: 1 })
      .lean();

    const feeTypes = feeTypeConfigs.map((config) => ({
      value: config.fee_type,
      label: config.label,
      description: config.description,
    }));

    const response = new ApiResponse(200, { feeTypes }, 'Fee types retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get form structure for a specific fee type
 */
export const getFeeTypeFormStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { feeType } = req.params;

    if (!feeType) {
      throw new ApiError(400, 'Fee type is required');
    }

    const config = await FeeTypeConfigModel.findOne({
      fee_type: feeType as FeeType,
      is_active: true,
      is_deleted: false,
    }).lean();

    if (!config) {
      throw new ApiError(404, 'Fee type not found');
    }

    // Remove internal fields from response
    const { is_active, is_deleted, deletedAt, createdAt, updatedAt, validationRules, ...configResponse } = config;

    const response = new ApiResponse(
      200,
      { config: configResponse },
      'Fee type form structure retrieved successfully'
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

