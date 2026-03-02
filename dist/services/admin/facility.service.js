"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreFacility = exports.deleteFacility = exports.updateFacility = exports.createFacility = exports.getFacilityById = exports.getAllFacilities = void 0;
const facility_model_1 = require("../../models/facility.model");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
/**
 * Get all facilities for admin with filters and pagination
 */
const getAllFacilities = async (params = {}) => {
    try {
        const query = {};
        // Exclude soft-deleted facilities by default unless explicitly requested
        if (!params.includeDeleted) {
            query.isDeleted = { $ne: true };
        }
        // Filter by active status if explicitly provided
        // By default, show all facilities (both active and inactive) in admin panel
        if (params.isActive !== undefined) {
            query.is_active = params.isActive;
        }
        // Search by name or description
        if (params.search) {
            const searchRegex = new RegExp(params.search, 'i');
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { custom_id: searchRegex },
            ];
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Sorting
        const sortField = params.sortBy || 'createdAt';
        const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        // Get total count
        const total = await facility_model_1.FacilityModel.countDocuments(query);
        // Get facilities
        const facilities = await facility_model_1.FacilityModel.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const transformedFacilities = facilities.map((facility) => ({
            _id: facility._id.toString(),
            custom_id: facility.custom_id,
            name: facility.name,
            description: facility.description || null,
            icon: facility.icon || null,
            is_active: facility.is_active,
            isDeleted: facility.isDeleted || false,
            deletedAt: facility.deletedAt || null,
            createdAt: facility.createdAt,
            updatedAt: facility.updatedAt,
        }));
        const totalPages = Math.ceil(total / limit);
        return {
            facilities: transformedFacilities,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch facilities for admin:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllFacilities = getAllFacilities;
/**
 * Get facility by ID
 */
const getFacilityById = async (id, includeDeleted = false) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id) };
        }
        else {
            query = { custom_id: id };
        }
        // Exclude soft-deleted facilities unless explicitly requested
        if (!includeDeleted) {
            query.isDeleted = { $ne: true };
        }
        const facility = await facility_model_1.FacilityModel.findOne(query).lean();
        if (!facility) {
            return null;
        }
        return {
            _id: facility._id.toString(),
            custom_id: facility.custom_id,
            name: facility.name,
            description: facility.description || null,
            icon: facility.icon || null,
            is_active: facility.is_active,
            isDeleted: facility.isDeleted || false,
            deletedAt: facility.deletedAt || null,
            createdAt: facility.createdAt,
            updatedAt: facility.updatedAt,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch facility by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getFacilityById = getFacilityById;
/**
 * Create a new facility
 */
const createFacility = async (data) => {
    try {
        // Check if facility with same name already exists (excluding deleted)
        const existingFacility = await facility_model_1.FacilityModel.findOne({
            name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
            isDeleted: { $ne: true },
        });
        if (existingFacility) {
            throw new ApiError_1.ApiError(400, 'Facility with this name already exists');
        }
        const facility = new facility_model_1.FacilityModel({
            name: data.name.trim(),
            description: data.description || null,
            icon: data.icon || null,
            is_active: data.is_active !== undefined ? data.is_active : true,
        });
        await facility.save();
        return {
            _id: facility._id.toString(),
            custom_id: facility.custom_id,
            name: facility.name,
            description: facility.description || null,
            icon: facility.icon || null,
            is_active: facility.is_active,
            isDeleted: facility.isDeleted || false,
            deletedAt: facility.deletedAt || null,
            createdAt: facility.createdAt,
            updatedAt: facility.updatedAt,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create facility:', error);
        throw new ApiError_1.ApiError(500, 'Failed to create facility');
    }
};
exports.createFacility = createFacility;
/**
 * Update facility
 */
const updateFacility = async (id, data) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id) };
        }
        else {
            query = { custom_id: id };
        }
        // Exclude soft-deleted facilities
        query.isDeleted = { $ne: true };
        const existingFacility = await facility_model_1.FacilityModel.findOne(query);
        if (!existingFacility) {
            throw new ApiError_1.ApiError(404, 'Facility not found');
        }
        // Check if name is being updated and if it conflicts with another facility (excluding deleted)
        if (data.name && data.name.trim().toLowerCase() !== existingFacility.name.toLowerCase()) {
            const duplicateFacility = await facility_model_1.FacilityModel.findOne({
                name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
                _id: { $ne: existingFacility._id },
                isDeleted: { $ne: true },
            });
            if (duplicateFacility) {
                throw new ApiError_1.ApiError(400, 'Facility with this name already exists');
            }
        }
        // Prepare update data
        const updateData = {};
        if (data.name !== undefined) {
            updateData.name = data.name.trim();
        }
        if (data.description !== undefined) {
            updateData.description = data.description || null;
        }
        if (data.icon !== undefined) {
            updateData.icon = data.icon || null;
        }
        if (data.is_active !== undefined) {
            updateData.is_active = data.is_active;
        }
        const updatedFacility = await facility_model_1.FacilityModel.findOneAndUpdate(query, { $set: updateData }, { new: true, runValidators: true }).lean();
        if (!updatedFacility) {
            return null;
        }
        return {
            _id: updatedFacility._id.toString(),
            custom_id: updatedFacility.custom_id,
            name: updatedFacility.name,
            description: updatedFacility.description || null,
            icon: updatedFacility.icon || null,
            is_active: updatedFacility.is_active,
            isDeleted: updatedFacility.isDeleted || false,
            deletedAt: updatedFacility.deletedAt || null,
            createdAt: updatedFacility.createdAt,
            updatedAt: updatedFacility.updatedAt,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update facility:', error);
        throw new ApiError_1.ApiError(500, 'Failed to update facility');
    }
};
exports.updateFacility = updateFacility;
/**
 * Delete facility (soft delete)
 * Sets isDeleted to true and deletedAt timestamp
 * Note: We don't hard delete to maintain referential integrity
 */
const deleteFacility = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id) };
        }
        else {
            query = { custom_id: id };
        }
        // Only allow deletion of non-deleted facilities
        query.isDeleted = { $ne: true };
        const facility = await facility_model_1.FacilityModel.findOne(query);
        if (!facility) {
            throw new ApiError_1.ApiError(404, 'Facility not found');
        }
        // Soft delete by setting isDeleted to true and deletedAt timestamp
        const now = new Date();
        const updatedFacility = await facility_model_1.FacilityModel.findOneAndUpdate(query, {
            $set: {
                isDeleted: true,
                deletedAt: now,
                is_active: false, // Also set is_active to false for consistency
            }
        }, { new: true });
        if (!updatedFacility) {
            throw new ApiError_1.ApiError(500, 'Failed to update facility status');
        }
        logger_1.logger.info(`Facility soft deleted: ${id}`, {
            facilityId: updatedFacility._id,
            isDeleted: updatedFacility.isDeleted,
            deletedAt: updatedFacility.deletedAt
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete facility:', error);
        throw new ApiError_1.ApiError(500, 'Failed to delete facility');
    }
};
exports.deleteFacility = deleteFacility;
/**
 * Restore soft-deleted facility
 * Sets isDeleted to false and clears deletedAt
 */
const restoreFacility = async (id) => {
    try {
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id) && id.length === 24) {
            query = { _id: new mongoose_1.Types.ObjectId(id) };
        }
        else {
            query = { custom_id: id };
        }
        // Only allow restoration of deleted facilities
        query.isDeleted = true;
        const facility = await facility_model_1.FacilityModel.findOne(query);
        if (!facility) {
            throw new ApiError_1.ApiError(404, 'Deleted facility not found');
        }
        // Restore by setting isDeleted to false and clearing deletedAt
        const updatedFacility = await facility_model_1.FacilityModel.findOneAndUpdate(query, {
            $set: {
                isDeleted: false,
                deletedAt: null,
            }
        }, { new: true, runValidators: true }).lean();
        if (!updatedFacility) {
            throw new ApiError_1.ApiError(500, 'Failed to restore facility');
        }
        logger_1.logger.info(`Facility restored: ${id}`, { facilityId: updatedFacility._id });
        return {
            _id: updatedFacility._id.toString(),
            custom_id: updatedFacility.custom_id,
            name: updatedFacility.name,
            description: updatedFacility.description || null,
            icon: updatedFacility.icon || null,
            is_active: updatedFacility.is_active,
            isDeleted: updatedFacility.isDeleted || false,
            deletedAt: updatedFacility.deletedAt || null,
            createdAt: updatedFacility.createdAt,
            updatedAt: updatedFacility.updatedAt,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to restore facility:', error);
        throw new ApiError_1.ApiError(500, 'Failed to restore facility');
    }
};
exports.restoreFacility = restoreFacility;
//# sourceMappingURL=facility.service.js.map