"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateFacility = exports.getAllFacilities = void 0;
const facility_model_1 = require("../../models/facility.model");
const logger_1 = require("../../utils/logger");
const mongoose_1 = require("mongoose");
const ApiError_1 = require("../../utils/ApiError");
const getAllFacilities = async (search) => {
    try {
        // Build query
        const query = {
            is_active: true,
            isDeleted: { $ne: true } // Exclude soft-deleted facilities
        };
        // Add search filter if provided
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { custom_id: searchRegex }
            ];
        }
        const facilities = await facility_model_1.FacilityModel.find(query)
            .select('_id custom_id name description icon')
            .sort({ createdAt: -1 }) // Sort by newest first
            .lean();
        return facilities.map((facility) => ({
            _id: facility._id.toString(),
            custom_id: facility.custom_id,
            name: facility.name,
            description: facility.description || null,
            icon: facility.icon || null,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch facilities', error);
        throw error;
    }
};
exports.getAllFacilities = getAllFacilities;
/**
 * Find or create facility
 * If facility is a string (ID), find by ID
 * If facility is an object (name, description, icon), find by name or create new
 */
const findOrCreateFacility = async (facility) => {
    try {
        if (!facility) {
            return null;
        }
        // If facility is a string (ID), find by ID
        if (typeof facility === 'string') {
            // Check if it's a valid ObjectId
            if (!mongoose_1.Types.ObjectId.isValid(facility)) {
                throw new ApiError_1.ApiError(400, 'Invalid facility ID format');
            }
            const facilityId = new mongoose_1.Types.ObjectId(facility);
            const existingFacility = await facility_model_1.FacilityModel.findOne({
                _id: facilityId,
                isDeleted: { $ne: true }, // Exclude soft-deleted facilities
            });
            if (!existingFacility) {
                throw new ApiError_1.ApiError(400, 'Facility not found');
            }
            if (!existingFacility.is_active) {
                throw new ApiError_1.ApiError(400, 'Facility is not active');
            }
            return facilityId;
        }
        // If facility is an object, find by name or create
        const facilityName = facility.name.trim();
        // Check if facility with same name already exists (excluding deleted)
        let existingFacility = await facility_model_1.FacilityModel.findOne({
            name: { $regex: new RegExp(`^${facilityName}$`, 'i') }, // Case-insensitive match
            is_active: true,
            isDeleted: { $ne: true }, // Exclude soft-deleted facilities
        });
        if (existingFacility) {
            logger_1.logger.info('Facility found by name', { name: facilityName, id: existingFacility._id });
            return existingFacility._id;
        }
        // Create new facility
        const newFacility = new facility_model_1.FacilityModel({
            name: facilityName,
            description: facility.description || null,
            icon: facility.icon || null,
            is_active: true,
        });
        await newFacility.save();
        logger_1.logger.info('New facility created', { name: facilityName, id: newFacility._id });
        return newFacility._id;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to find or create facility', error);
        throw new ApiError_1.ApiError(500, 'Failed to process facility');
    }
};
exports.findOrCreateFacility = findOrCreateFacility;
//# sourceMappingURL=facility.service.js.map