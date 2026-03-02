"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBatch = exports.toggleBatchStatus = exports.updateBatch = exports.getBatchesByCenter = exports.getBatchesByUser = exports.getBatchById = exports.createBatch = void 0;
const mongoose_1 = require("mongoose");
const batch_model_1 = require("../../models/batch.model");
const sport_model_1 = require("../../models/sport.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const employee_model_1 = require("../../models/employee.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const sportCache_1 = require("../../utils/sportCache");
const env_1 = require("../../config/env");
/**
 * Round a number to 2 decimal places to avoid floating-point precision issues
 * Uses Math.round for more accurate rounding than parseFloat(toFixed())
 */
const roundToTwoDecimals = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    // Use Math.round for more precise rounding (handles 500.0 correctly)
    return Math.round(value * 100) / 100;
};
/**
 * Recursively round all numeric values in an object to 2 decimal places
 * This is useful for fee_configuration which may contain various amount/price fields
 */
const roundNumericValues = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'number') {
        return roundToTwoDecimals(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => roundNumericValues(item));
    }
    if (typeof obj === 'object') {
        const rounded = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                rounded[key] = roundNumericValues(obj[key]);
            }
        }
        return rounded;
    }
    return obj;
};
const createBatch = async (data, loggedInUserId) => {
    try {
        // Validate user exists
        const userObjectId = await (0, userCache_1.getUserObjectId)(data.userId || loggedInUserId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Validate sport exists - support both ObjectId and UUID
        const sportObjectId = await (0, sportCache_1.getSportObjectId)(data.sportId);
        if (!sportObjectId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.sportId.invalid'));
        }
        const sport = await sport_model_1.SportModel.findById(sportObjectId);
        if (!sport || !sport.is_active) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.sportNotFound'));
        }
        // Validate center exists
        if (!mongoose_1.Types.ObjectId.isValid(data.centerId)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.centerId.invalid'));
        }
        const center = await coachingCenter_model_1.CoachingCenterModel.findById(data.centerId);
        if (!center || center.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
        }
        // Verify center belongs to logged-in user
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.userNotFound'));
        }
        if (center.user.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('batch.centerNotOwned'));
        }
        // Validate coach exists if provided
        if (data.coach) {
            if (!mongoose_1.Types.ObjectId.isValid(data.coach)) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.coach.invalid'));
            }
            const coach = await employee_model_1.EmployeeModel.findById(data.coach);
            if (!coach || coach.is_deleted) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.coachNotFound'));
            }
            // Verify coach belongs to the same center
            if (coach.center && coach.center.toString() !== data.centerId) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.coachNotInCenter'));
            }
        }
        // Validate age range respects center's age range if available
        if (center.age) {
            if (data.age.min < center.age.min || data.age.max > center.age.max) {
                throw new ApiError_1.ApiError(400, 'Age range must respect the center\'s age range');
            }
        }
        // Validate sport is available for this center
        if (!center.sports || !center.sports.some((s) => s.toString() === sportObjectId.toString())) {
            throw new ApiError_1.ApiError(400, 'Sport is not available for the selected center');
        }
        // Prepare scheduled data
        const scheduledData = {
            start_date: data.scheduled.start_date,
            end_date: data.scheduled.end_date || null,
            training_days: data.scheduled.training_days,
        };
        // Handle timing - either common timing or individual timing
        if (data.scheduled.individual_timings && data.scheduled.individual_timings.length > 0) {
            scheduledData.individual_timings = data.scheduled.individual_timings;
            scheduledData.start_time = null;
            scheduledData.end_time = null;
        }
        else if (data.scheduled.start_time && data.scheduled.end_time) {
            scheduledData.start_time = data.scheduled.start_time;
            scheduledData.end_time = data.scheduled.end_time;
            scheduledData.individual_timings = null;
        }
        // Prepare batch data
        const batchData = {
            user: userObjectId,
            name: data.name,
            description: data.description || null,
            sport: sportObjectId,
            center: new mongoose_1.Types.ObjectId(data.centerId),
            coach: data.coach ? new mongoose_1.Types.ObjectId(data.coach) : null,
            gender: data.gender,
            certificate_issued: data.certificate_issued,
            scheduled: scheduledData,
            duration: {
                count: data.duration.count,
                type: data.duration.type,
            },
            capacity: {
                min: data.capacity.min,
                max: data.capacity.max || null,
            },
            age: {
                min: data.age.min,
                max: data.age.max,
            },
            admission_fee: roundToTwoDecimals(data.admission_fee),
            base_price: roundToTwoDecimals(data.base_price),
            discounted_price: roundToTwoDecimals(data.discounted_price),
            is_allowed_disabled: data.is_allowed_disabled ?? false,
            status: data.status || 'draft',
            is_active: (data.status || 'draft') === 'published', // Set is_active based on status: draft = false, published = true
            is_deleted: false,
        };
        // Create batch
        const batch = new batch_model_1.BatchModel(batchData);
        await batch.save();
        logger_1.logger.info(`Batch created: ${batch._id} (${batch.name})`);
        // Return populated batch
        const populatedBatch = await batch_model_1.BatchModel.findById(batch._id)
            .populate('user', 'id firstName lastName email')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .populate('coach', 'fullName mobileNo email')
            .lean();
        return populatedBatch || batch;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create batch:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.create.failed'));
    }
};
exports.createBatch = createBatch;
const getBatchById = async (id) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.invalidId'));
        }
        const batch = await batch_model_1.BatchModel.findOne({
            _id: id,
            is_deleted: false,
        })
            .populate('user', 'id firstName lastName email')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .populate('coach', 'fullName mobileNo email')
            .lean();
        return batch;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch batch:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.get.failed'));
    }
};
exports.getBatchById = getBatchById;
const getBatchesByUser = async (userId, page = 1, limit = env_1.config.pagination.defaultLimit) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        // Calculate skip
        const skip = (pageNumber - 1) * pageSize;
        // Get user ObjectId from cache or database
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Build query - only get non-deleted batches for the user
        const query = {
            user: userObjectId,
            is_deleted: false,
        };
        // Get total count
        const total = await batch_model_1.BatchModel.countDocuments(query);
        // Get paginated results with populated references
        const batches = await batch_model_1.BatchModel.find(query)
            .populate({
            path: 'user',
            select: 'id firstName lastName email mobile',
            match: { isDeleted: false },
        })
            .populate({
            path: 'sport',
            select: 'custom_id name logo is_popular',
            match: { is_active: true },
        })
            .populate({
            path: 'center',
            select: 'center_name email mobile_number status',
            match: { is_deleted: false },
        })
            .populate({
            path: 'coach',
            select: 'fullName mobileNo email role',
            match: { is_deleted: false },
        })
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(pageSize)
            .lean();
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Batches fetched by user', {
            userId,
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages,
        });
        return {
            data: batches,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch batches:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.list.failed'));
    }
};
exports.getBatchesByUser = getBatchesByUser;
const getBatchesByCenter = async (centerId, userId, page = 1, limit = env_1.config.pagination.defaultLimit) => {
    try {
        // Validate pagination parameters
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        // Calculate skip
        const skip = (pageNumber - 1) * pageSize;
        // Validate center ID
        if (!mongoose_1.Types.ObjectId.isValid(centerId)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.centerId.invalid'));
        }
        // Validate center exists and belongs to user
        const center = await coachingCenter_model_1.CoachingCenterModel.findById(centerId);
        if (!center || center.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
        }
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.userNotFound'));
        }
        if (center.user.toString() !== userObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('batch.centerNotOwned'));
        }
        // Build query
        const query = {
            center: new mongoose_1.Types.ObjectId(centerId),
            is_deleted: false,
        };
        // Get total count
        const total = await batch_model_1.BatchModel.countDocuments(query);
        // Get paginated results
        const batches = await batch_model_1.BatchModel.find(query)
            .populate('user', 'id firstName lastName email')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .populate('coach', 'fullName mobileNo email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        return {
            data: batches,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1,
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to fetch batches by center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.list.failed'));
    }
};
exports.getBatchesByCenter = getBatchesByCenter;
const updateBatch = async (id, data, loggedInUserId) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.invalidId'));
        }
        // Check if batch exists
        const existingBatch = await batch_model_1.BatchModel.findOne({
            _id: id,
            is_deleted: false,
        });
        if (!existingBatch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Get logged-in user ObjectId
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Verify batch belongs to logged-in user
        if (existingBatch.user.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('batch.unauthorizedUpdate'));
        }
        // Validation: If batch is active (is_active = true), details cannot be updated
        // Exception: If updating status from "published" to "draft", is_active will be set to false automatically
        if (existingBatch.is_active === true) {
            const updateFields = Object.keys(data);
            const hasOnlyIsActive = updateFields.length === 1 && updateFields[0] === 'is_active';
            const isSettingInactive = hasOnlyIsActive && data.is_active === false;
            const isChangingToDraft = data.status === 'draft' && existingBatch.status === 'published';
            // Allow if: 1) Only setting is_active to false, or 2) Changing status from published to draft (which sets is_active to false)
            if (!isSettingInactive && !isChangingToDraft) {
                throw new ApiError_1.ApiError(400, 'Cannot update batch details while batch is active. Please deactivate the batch first by setting is_active to false or changing status to draft.');
            }
        }
        // Note: Status can be changed from "published" to "draft" - this will automatically set is_active to false
        // Validate sport if provided - support both ObjectId and UUID
        if (data.sportId) {
            const sportObjectId = await (0, sportCache_1.getSportObjectId)(data.sportId);
            if (!sportObjectId) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.sportId.invalid'));
            }
            const sport = await sport_model_1.SportModel.findById(sportObjectId);
            if (!sport || !sport.is_active) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.sportNotFound'));
            }
        }
        // Validate center if provided
        if (data.centerId) {
            if (!mongoose_1.Types.ObjectId.isValid(data.centerId)) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.centerId.invalid'));
            }
            const center = await coachingCenter_model_1.CoachingCenterModel.findById(data.centerId);
            if (!center || center.is_deleted) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
            }
            // Verify center belongs to logged-in user
            if (center.user.toString() !== loggedInUserObjectId.toString()) {
                throw new ApiError_1.ApiError(403, (0, i18n_1.t)('batch.centerNotOwned'));
            }
        }
        // Validate coach if provided
        if (data.coach !== undefined) {
            if (data.coach) {
                if (!mongoose_1.Types.ObjectId.isValid(data.coach)) {
                    throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.coach.invalid'));
                }
                const coach = await employee_model_1.EmployeeModel.findById(data.coach);
                if (!coach || coach.is_deleted) {
                    throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.coachNotFound'));
                }
                // Verify coach belongs to the center
                const centerId = data.centerId || existingBatch.center.toString();
                if (coach.center && coach.center.toString() !== centerId) {
                    throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.coachNotInCenter'));
                }
            }
        }
        // Prepare update data
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.sportId !== undefined) {
            const sportObjectId = await (0, sportCache_1.getSportObjectId)(data.sportId);
            if (!sportObjectId) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.sportId.invalid'));
            }
            updateData.sport = sportObjectId;
        }
        if (data.centerId !== undefined)
            updateData.center = new mongoose_1.Types.ObjectId(data.centerId);
        if (data.coach !== undefined)
            updateData.coach = data.coach ? new mongoose_1.Types.ObjectId(data.coach) : null;
        if (data.gender !== undefined)
            updateData.gender = data.gender;
        if (data.certificate_issued !== undefined)
            updateData.certificate_issued = data.certificate_issued;
        if (data.scheduled !== undefined) {
            const scheduledData = {
                start_date: data.scheduled.start_date,
                end_date: data.scheduled.end_date || null,
                training_days: data.scheduled.training_days,
            };
            // Handle timing - either common timing or individual timing
            if (data.scheduled.individual_timings && data.scheduled.individual_timings.length > 0) {
                scheduledData.individual_timings = data.scheduled.individual_timings;
                scheduledData.start_time = null;
                scheduledData.end_time = null;
            }
            else if (data.scheduled.start_time && data.scheduled.end_time) {
                scheduledData.start_time = data.scheduled.start_time;
                scheduledData.end_time = data.scheduled.end_time;
                scheduledData.individual_timings = null;
            }
            updateData.scheduled = scheduledData;
        }
        if (data.duration !== undefined) {
            updateData.duration = {
                count: data.duration.count,
                type: data.duration.type,
            };
        }
        if (data.capacity !== undefined) {
            updateData.capacity = {
                min: data.capacity.min,
                max: data.capacity.max || null,
            };
        }
        if (data.age !== undefined) {
            updateData.age = {
                min: data.age.min,
                max: data.age.max,
            };
        }
        if (data.admission_fee !== undefined)
            updateData.admission_fee = roundToTwoDecimals(data.admission_fee);
        if (data.base_price !== undefined)
            updateData.base_price = roundToTwoDecimals(data.base_price);
        if (data.discounted_price !== undefined)
            updateData.discounted_price = roundToTwoDecimals(data.discounted_price);
        if (data.status !== undefined) {
            updateData.status = data.status;
            // Automatically set is_active based on status: draft = false, published = true
            updateData.is_active = data.status === 'published';
        }
        else if (data.is_active !== undefined) {
            // Only allow manual is_active update if status is not being updated
            updateData.is_active = data.is_active;
        }
        // Update batch
        const batch = await batch_model_1.BatchModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
            .populate('user', 'id firstName lastName email')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .populate('coach', 'fullName mobileNo email')
            .lean();
        if (!batch) {
            throw new ApiError_1.ApiError(404, 'Batch not found');
        }
        logger_1.logger.info(`Batch updated: ${id}`);
        return batch;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update batch:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.update.failed'));
    }
};
exports.updateBatch = updateBatch;
const toggleBatchStatus = async (id, loggedInUserId) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.invalidId'));
        }
        // Check if batch exists
        const batch = await batch_model_1.BatchModel.findOne({
            _id: id,
            is_deleted: false,
        });
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Get logged-in user ObjectId
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Verify batch belongs to logged-in user
        if (batch.user.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('batch.unauthorizedToggle'));
        }
        // Toggle is_active status
        const updatedBatch = await batch_model_1.BatchModel.findByIdAndUpdate(id, { $set: { is_active: !batch.is_active } }, { new: true })
            .populate('user', 'id firstName lastName email')
            .populate('sport', 'custom_id name logo')
            .populate('center', 'center_name email mobile_number')
            .populate('coach', 'fullName mobileNo email')
            .lean();
        if (!updatedBatch) {
            throw new ApiError_1.ApiError(404, 'Batch not found');
        }
        logger_1.logger.info(`Batch status toggled: ${id} (is_active: ${updatedBatch.is_active})`);
        return updatedBatch;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to toggle batch status:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.toggleStatus.failed'));
    }
};
exports.toggleBatchStatus = toggleBatchStatus;
const deleteBatch = async (id, loggedInUserId) => {
    try {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.invalidId'));
        }
        // Check if batch exists
        const batch = await batch_model_1.BatchModel.findOne({
            _id: id,
            is_deleted: false,
        });
        if (!batch) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Get logged-in user ObjectId
        const loggedInUserObjectId = await (0, userCache_1.getUserObjectId)(loggedInUserId);
        if (!loggedInUserObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.notFound'));
        }
        // Verify batch belongs to logged-in user
        if (batch.user.toString() !== loggedInUserObjectId.toString()) {
            throw new ApiError_1.ApiError(403, (0, i18n_1.t)('batch.unauthorizedDelete'));
        }
        // Soft delete batch
        await batch_model_1.BatchModel.findByIdAndUpdate(id, {
            $set: {
                is_deleted: true,
                deletedAt: new Date(),
            },
        });
        logger_1.logger.info(`Batch soft deleted: ${id}`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete batch:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.delete.failed'));
    }
};
exports.deleteBatch = deleteBatch;
//# sourceMappingURL=batch.service.js.map