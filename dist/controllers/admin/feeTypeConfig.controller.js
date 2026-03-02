"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeeTypeFormStructure = exports.getAllFeeTypesHandler = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const ApiError_1 = require("../../utils/ApiError");
const feeTypeConfig_model_1 = require("../../models/feeTypeConfig.model");
/**
 * Get all available fee types (admin)
 */
const getAllFeeTypesHandler = async (_req, res, next) => {
    try {
        const feeTypeConfigs = await feeTypeConfig_model_1.FeeTypeConfigModel.find({
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
        const response = new ApiResponse_1.ApiResponse(200, { feeTypes }, 'Fee types retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getAllFeeTypesHandler = getAllFeeTypesHandler;
/**
 * Get form structure for a specific fee type (admin)
 */
const getFeeTypeFormStructure = async (req, res, next) => {
    try {
        const { feeType } = req.params;
        if (!feeType) {
            throw new ApiError_1.ApiError(400, 'Fee type is required');
        }
        const config = await feeTypeConfig_model_1.FeeTypeConfigModel.findOne({
            fee_type: feeType,
            is_active: true,
            is_deleted: false,
        }).lean();
        if (!config) {
            throw new ApiError_1.ApiError(404, 'Fee type not found');
        }
        // Remove internal fields from response
        const { is_active, is_deleted, deletedAt, createdAt, updatedAt, validationRules, ...configResponse } = config;
        const response = new ApiResponse_1.ApiResponse(200, { config: configResponse }, 'Fee type form structure retrieved successfully');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getFeeTypeFormStructure = getFeeTypeFormStructure;
//# sourceMappingURL=feeTypeConfig.controller.js.map