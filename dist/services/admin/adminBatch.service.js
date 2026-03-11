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
exports.toggleBatchStatusByAdmin = exports.deleteBatchByAdmin = exports.updateBatchByAdmin = exports.getBatchesByCenterId = exports.getBatchesByUserId = exports.getBatchById = exports.getAllBatches = exports.createBatchByAdmin = void 0;
const mongoose_1 = require("mongoose");
const batch_model_1 = require("../../models/batch.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const adminUser_model_1 = require("../../models/adminUser.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const sportCache_1 = require("../../utils/sportCache");
const env_1 = require("../../config/env");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const batchService = __importStar(require("../academy/batch.service"));
/**
 * Helper to get center ObjectId from either custom ID (UUID) or MongoDB ObjectId
 */
const getCenterObjectId = async (centerId) => {
    try {
        // If it's a valid ObjectId, use it directly (exclude deleted centers)
        if (mongoose_1.Types.ObjectId.isValid(centerId) && centerId.length === 24) {
            const center = await coachingCenter_model_1.CoachingCenterModel.findOne({
                _id: centerId,
                is_deleted: false,
            })
                .select('_id')
                .lean();
            if (center) {
                return center._id;
            }
        }
        // Otherwise, try to find by custom ID (UUID)
        const center = await coachingCenter_model_1.CoachingCenterModel.findOne({ id: centerId, is_deleted: false })
            .select('_id')
            .lean();
        return center ? center._id : null;
    }
    catch (error) {
        logger_1.logger.error('Failed to get center ObjectId:', error);
        return null;
    }
};
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
/**
 * Create batch (admin - can create for any center)
 */
const createBatchByAdmin = async (data) => {
    try {
        const { SportModel } = await Promise.resolve().then(() => __importStar(require('../../models/sport.model')));
        const { EmployeeModel } = await Promise.resolve().then(() => __importStar(require('../../models/employee.model')));
        // Validate center exists - support both custom ID and ObjectId
        const centerObjectId = await getCenterObjectId(data.centerId);
        if (!centerObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
        }
        // Get center to extract userId and validate sport availability
        const center = await coachingCenter_model_1.CoachingCenterModel.findById(centerObjectId);
        if (!center || center.is_deleted) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
        }
        // Validate sport exists and is available for this center - support both ObjectId and UUID
        const sportObjectId = await (0, sportCache_1.getSportObjectId)(data.sportId);
        if (!sportObjectId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.sportId.invalid'));
        }
        const sport = await SportModel.findById(sportObjectId);
        if (!sport || !sport.is_active) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.sportNotFound'));
        }
        // Check if sport is available for this center
        if (!center.sports || !center.sports.some((s) => s.toString() === sportObjectId.toString())) {
            throw new ApiError_1.ApiError(400, 'Sport is not available for the selected center');
        }
        // Get userId from center (admin can create for any center)
        const userObjectId = center.user;
        if (!userObjectId) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.userNotFound'));
        }
        // Validate coach exists if provided
        if (data.coach) {
            if (!mongoose_1.Types.ObjectId.isValid(data.coach)) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.coach.invalid'));
            }
            const coach = await EmployeeModel.findById(data.coach);
            if (!coach || coach.is_deleted) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.coachNotFound'));
            }
            // Verify coach belongs to the same center
            if (coach.center && coach.center.toString() !== centerObjectId.toString()) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('batch.coachNotInCenter'));
            }
        }
        // Validate age range respects center's age range if available
        if (center.age) {
            if (data.age.min < center.age.min || data.age.max > center.age.max) {
                throw new ApiError_1.ApiError(400, 'Age range must respect the center\'s age range');
            }
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
            center: centerObjectId,
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
        logger_1.logger.info(`Admin created batch: ${batch._id} (${batch.name}) for center: ${centerObjectId}`);
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
        logger_1.logger.error('Admin failed to create batch:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.create.failed'));
    }
};
exports.createBatchByAdmin = createBatchByAdmin;
/**
 * Get all batches for admin view with filters
 */
const getAllBatches = async (page = 1, limit = 10, filters = {}, currentUserId, currentUserRole) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        const query = { is_deleted: false };
        // If user is an agent, only show batches from centers added by them
        let agentCenterIds = [];
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                // Find all coaching centers added by this agent
                const centers = await coachingCenter_model_1.CoachingCenterModel.find({
                    addedBy: adminUser._id,
                    is_deleted: false,
                }).select('_id').lean();
                agentCenterIds = centers.map((c) => c._id);
                if (agentCenterIds.length === 0) {
                    // Agent has no centers, return empty result
                    return {
                        batches: [],
                        pagination: {
                            page: pageNumber,
                            limit: pageSize,
                            total: 0,
                            totalPages: 0,
                        },
                    };
                }
                logger_1.logger.debug('Filtering batches for agent', {
                    agentId: currentUserId,
                    agentObjectId: adminUser._id.toString(),
                    centersFound: agentCenterIds.length,
                    role: currentUserRole,
                });
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found', { agentId: currentUserId });
                // Return empty result if agent not found
                return {
                    batches: [],
                    pagination: {
                        page: pageNumber,
                        limit: pageSize,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }
        }
        // Apply filters
        if (filters.userId) {
            // Support both custom ID (UUID) and ObjectId
            if (mongoose_1.Types.ObjectId.isValid(filters.userId) && filters.userId.length === 24) {
                // If it's a valid ObjectId, use it directly
                query.user = new mongoose_1.Types.ObjectId(filters.userId);
            }
            else {
                // Otherwise, try to get ObjectId from custom ID
                const userObjectId = await (0, userCache_1.getUserObjectId)(filters.userId);
                if (userObjectId) {
                    query.user = userObjectId;
                }
            }
        }
        if (filters.centerId) {
            const centerObjectId = await getCenterObjectId(filters.centerId);
            if (!centerObjectId) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
            }
            // If agent filtering is active, verify the requested center was added by the agent
            if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId && agentCenterIds.length > 0) {
                if (!agentCenterIds.some(id => id.toString() === centerObjectId.toString())) {
                    // Requested center was not added by this agent, return empty result
                    return {
                        batches: [],
                        pagination: {
                            page: pageNumber,
                            limit: pageSize,
                            total: 0,
                            totalPages: 0,
                        },
                    };
                }
            }
            query.center = centerObjectId;
        }
        else if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId && agentCenterIds.length > 0) {
            // If no centerId filter but agent filtering is active, filter by agent's centers
            query.center = { $in: agentCenterIds };
        }
        else {
            // Exclude batches whose coaching center is deleted
            const nonDeletedCenterIds = await coachingCenter_model_1.CoachingCenterModel.find({ is_deleted: false }).distinct('_id');
            query.center = { $in: nonDeletedCenterIds };
        }
        if (filters.sportId) {
            const sportObjectId = await (0, sportCache_1.getSportObjectId)(filters.sportId);
            if (sportObjectId) {
                query.sport = sportObjectId;
            }
        }
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.isActive !== undefined) {
            query.is_active = filters.isActive;
        }
        if (filters.search) {
            const searchRegex = new RegExp(filters.search, 'i');
            query.$or = [
                { name: searchRegex },
            ];
        }
        // Handle sorting
        const sortField = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };
        const [batches, total] = await Promise.all([
            batch_model_1.BatchModel.find(query)
                .populate('user', 'id firstName lastName email mobile')
                .populate('sport', 'custom_id name logo')
                .populate('center', 'center_name email mobile_number')
                .populate('coach', 'fullName mobileNo email')
                .sort(sort)
                .skip(skip)
                .limit(pageSize)
                .lean(),
            batch_model_1.BatchModel.countDocuments(query),
        ]);
        return {
            batches: batches,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Admin failed to fetch all batches:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.list.failed'));
    }
};
exports.getAllBatches = getAllBatches;
/**
 * Get batch by ID (admin view) with agent filtering
 */
const getBatchById = async (id, currentUserId, currentUserRole) => {
    try {
        // First get the batch to check its center
        const batch = await batchService.getBatchById(id);
        if (!batch) {
            return null;
        }
        // If user is an agent, verify the batch's center was added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                // Check if the batch's center was added by this agent
                const center = await coachingCenter_model_1.CoachingCenterModel.findById(batch.center)
                    .select('addedBy')
                    .lean();
                if (!center || !center.addedBy || center.addedBy.toString() !== adminUser._id.toString()) {
                    // Batch's center was not added by this agent
                    logger_1.logger.debug('Batch center not added by agent', {
                        agentId: currentUserId,
                        batchId: id,
                        centerId: batch.center,
                    });
                    return null;
                }
                logger_1.logger.debug('Batch access allowed for agent', {
                    agentId: currentUserId,
                    batchId: id,
                    role: currentUserRole,
                });
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found for batch view', { agentId: currentUserId, batchId: id });
                return null;
            }
        }
        return batch;
    }
    catch (error) {
        logger_1.logger.error('Admin failed to fetch batch:', error);
        throw error;
    }
};
exports.getBatchById = getBatchById;
/**
 * Get batches by user ID (admin view) with agent filtering
 */
const getBatchesByUserId = async (userId, page = 1, limit = 10, sortBy, sortOrder, _currentUserId, _currentUserRole) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Support both custom ID (UUID) and ObjectId
        let userObjectId = null;
        if (mongoose_1.Types.ObjectId.isValid(userId) && userId.length === 24) {
            // If it's a valid ObjectId, verify user exists
            const { UserModel } = await Promise.resolve().then(() => __importStar(require('../../models/user.model')));
            const user = await UserModel.findById(userId).select('_id').lean();
            if (user) {
                userObjectId = user._id;
            }
        }
        else {
            // Otherwise, try to get ObjectId from custom ID
            userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        }
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.userNotFound'));
        }
        // Only include batches whose coaching center is not deleted
        const nonDeletedCenterIds = await coachingCenter_model_1.CoachingCenterModel.find({ is_deleted: false }).distinct('_id');
        const query = {
            user: userObjectId,
            is_deleted: false,
            center: { $in: nonDeletedCenterIds },
        };
        // Handle sorting
        const sortField = sortBy || 'createdAt';
        const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrderValue };
        const [batches, total] = await Promise.all([
            batch_model_1.BatchModel.find(query)
                .populate('user', 'id firstName lastName email mobile')
                .populate('sport', 'custom_id name logo')
                .populate('center', 'center_name email mobile_number')
                .populate('coach', 'fullName mobileNo email')
                .sort(sort)
                .skip(skip)
                .limit(pageSize)
                .lean(),
            batch_model_1.BatchModel.countDocuments(query),
        ]);
        return {
            batches: batches,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to fetch batches by user:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.list.failed'));
    }
};
exports.getBatchesByUserId = getBatchesByUserId;
/**
 * Get batches by center ID (admin view) with agent filtering
 */
const getBatchesByCenterId = async (centerId, page = 1, limit = 10, sortBy, sortOrder, currentUserId, currentUserRole) => {
    try {
        const pageNumber = Math.max(1, Math.floor(page));
        const pageSize = Math.min(env_1.config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
        const skip = (pageNumber - 1) * pageSize;
        // Support both custom ID (UUID) and ObjectId
        const centerObjectId = await getCenterObjectId(centerId);
        if (!centerObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
        }
        const query = {
            center: centerObjectId,
            is_deleted: false,
        };
        // If user is an agent, verify the center was added by them
        if (currentUserRole === defaultRoles_enum_1.DefaultRoles.AGENT && currentUserId) {
            // Get AdminUser ObjectId since addedBy references AdminUser model
            const adminUser = await adminUser_model_1.AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
                .select('_id')
                .lean();
            if (adminUser && adminUser._id) {
                // Check if the center was added by this agent
                const center = await coachingCenter_model_1.CoachingCenterModel.findById(centerObjectId)
                    .select('addedBy')
                    .lean();
                if (!center || !center.addedBy || center.addedBy.toString() !== adminUser._id.toString()) {
                    // Center was not added by this agent, return empty result
                    logger_1.logger.debug('Center not added by agent', {
                        agentId: currentUserId,
                        centerId,
                    });
                    return {
                        batches: [],
                        pagination: {
                            page: pageNumber,
                            limit: pageSize,
                            total: 0,
                            totalPages: 0,
                        },
                    };
                }
            }
            else {
                logger_1.logger.warn('Agent AdminUser not found', { agentId: currentUserId });
                return {
                    batches: [],
                    pagination: {
                        page: pageNumber,
                        limit: pageSize,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }
        }
        // Handle sorting
        const sortField = sortBy || 'createdAt';
        const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrderValue };
        const [batches, total] = await Promise.all([
            batch_model_1.BatchModel.find(query)
                .populate('user', 'id firstName lastName email mobile')
                .populate('sport', 'custom_id name logo')
                .populate('center', 'center_name email mobile_number')
                .populate('coach', 'fullName mobileNo email')
                .sort(sort)
                .skip(skip)
                .limit(pageSize)
                .lean(),
            batch_model_1.BatchModel.countDocuments(query),
        ]);
        return {
            batches: batches,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to fetch batches by center:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.list.failed'));
    }
};
exports.getBatchesByCenterId = getBatchesByCenterId;
/**
 * Update batch (admin - can update any batch)
 */
const updateBatchByAdmin = async (id, data) => {
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
        // Admin can update any batch, so we don't check ownership
        // But we still validate related entities if they're being updated
        const { SportModel } = await Promise.resolve().then(() => __importStar(require('../../models/sport.model')));
        const { CoachingCenterModel } = await Promise.resolve().then(() => __importStar(require('../../models/coachingCenter.model')));
        const { EmployeeModel } = await Promise.resolve().then(() => __importStar(require('../../models/employee.model')));
        // Validate sport if provided - support both ObjectId and UUID
        if (data.sportId) {
            const sportObjectId = await (0, sportCache_1.getSportObjectId)(data.sportId);
            if (!sportObjectId) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.sportId.invalid'));
            }
            const sport = await SportModel.findById(sportObjectId);
            if (!sport || !sport.is_active) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.sportNotFound'));
            }
        }
        // Validate center if provided - support both custom ID and ObjectId
        if (data.centerId) {
            const centerObjectId = await getCenterObjectId(data.centerId);
            if (!centerObjectId) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
            }
            // Verify center exists and is not deleted
            const center = await CoachingCenterModel.findById(centerObjectId);
            if (!center || center.is_deleted) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
            }
        }
        // Validate coach if provided
        if (data.coach !== undefined) {
            if (data.coach) {
                if (!mongoose_1.Types.ObjectId.isValid(data.coach)) {
                    throw new ApiError_1.ApiError(400, (0, i18n_1.t)('validation.batch.coach.invalid'));
                }
                const coach = await EmployeeModel.findById(data.coach);
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
        if (data.centerId !== undefined) {
            const centerObjectId = await getCenterObjectId(data.centerId);
            if (!centerObjectId) {
                throw new ApiError_1.ApiError(404, (0, i18n_1.t)('batch.centerNotFound'));
            }
            updateData.center = centerObjectId;
        }
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
        if (data.admission_fee !== undefined) {
            updateData.admission_fee = roundToTwoDecimals(data.admission_fee);
        }
        if (data.base_price !== undefined) {
            updateData.base_price = roundToTwoDecimals(data.base_price);
        }
        if (data.discounted_price !== undefined) {
            updateData.discounted_price = roundToTwoDecimals(data.discounted_price);
        }
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
        logger_1.logger.info(`Admin updated batch: ${id}`);
        return batch;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to update batch:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.update.failed'));
    }
};
exports.updateBatchByAdmin = updateBatchByAdmin;
/**
 * Delete batch (admin - can delete any batch)
 */
const deleteBatchByAdmin = async (id) => {
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
        // Soft delete batch
        await batch_model_1.BatchModel.findByIdAndUpdate(id, {
            $set: {
                is_deleted: true,
                deletedAt: new Date(),
            },
        });
        logger_1.logger.info(`Admin soft deleted batch: ${id}`);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to delete batch:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.delete.failed'));
    }
};
exports.deleteBatchByAdmin = deleteBatchByAdmin;
/**
 * Toggle batch status (admin - can toggle any batch)
 */
const toggleBatchStatusByAdmin = async (id) => {
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
        logger_1.logger.info(`Admin toggled batch status: ${id} (is_active: ${updatedBatch.is_active})`);
        return updatedBatch;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Admin failed to toggle batch status:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('batch.toggleStatus.failed'));
    }
};
exports.toggleBatchStatusByAdmin = toggleBatchStatusByAdmin;
//# sourceMappingURL=adminBatch.service.js.map