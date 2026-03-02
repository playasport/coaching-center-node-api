"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteParticipant = exports.updateParticipant = exports.getParticipantsByUser = exports.getParticipantById = exports.createParticipant = void 0;
const participant_model_1 = require("../models/participant.model");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const userCache_1 = require("../utils/userCache");
const env_1 = require("../config/env");
/**
 * Calculate age from date of birth
 */
const calculateAge = (dob) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};
const createParticipant = async (data, userId) => {
    try {
        // Get user ObjectId from cache or database
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Validate age if date of birth is provided
        if (data.dob) {
            const dobDate = new Date(data.dob);
            const today = new Date();
            // Check if date of birth is in the future
            if (dobDate > today) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('participant.dob.invalid'));
            }
            const age = calculateAge(dobDate);
            if (age < 3) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('participant.age.minRequired'));
            }
            if (age > 18) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('participant.age.maxExceeded'));
            }
        }
        // Prepare participant data
        // Note: isSelf is always set to null for manually created participants
        // Only the system sets isSelf = '1' when creating a user
        const participantData = {
            userId: userObjectId,
            firstName: data.firstName || null,
            lastName: data.lastName || null,
            gender: data.gender !== undefined ? data.gender : null,
            disability: data.disability !== undefined ? data.disability : 0,
            dob: data.dob ? new Date(data.dob) : null,
            schoolName: data.schoolName || null,
            contactNumber: data.contactNumber || null,
            profilePhoto: data.profilePhoto || null,
            address: data.address || null,
            isSelf: null, // Always null for manually created participants
        };
        // Create participant
        const participant = new participant_model_1.ParticipantModel(participantData);
        await participant.save();
        logger_1.logger.info(`Participant created: ${participant._id} by user: ${userId}`);
        // Return the created participant with populated fields
        const populatedParticipant = await participant_model_1.ParticipantModel.findById(participant._id)
            .populate('userId', 'id firstName lastName email')
            .lean();
        return populatedParticipant || participant;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create participant:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userId,
        });
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('participant.create.failed'));
    }
};
exports.createParticipant = createParticipant;
const getParticipantById = async (id, userId) => {
    try {
        // Get user ObjectId from cache or database
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Find participant and ensure it belongs to the user
        const participant = await participant_model_1.ParticipantModel.findOne({
            _id: id,
            userId: userObjectId,
            is_deleted: false,
        })
            .populate('userId', 'id firstName lastName email')
            .lean();
        return participant;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch participant:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('participant.get.failed'));
    }
};
exports.getParticipantById = getParticipantById;
const getParticipantsByUser = async (userId, page = 1, limit = env_1.config.pagination.defaultLimit) => {
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
        // Build query - only get non-deleted participants for the user
        const query = {
            userId: userObjectId,
            is_deleted: false,
        };
        // Get total count
        const total = await participant_model_1.ParticipantModel.countDocuments(query);
        // Get paginated results
        const participants = await participant_model_1.ParticipantModel.find(query)
            .populate('userId', 'id firstName lastName email')
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(pageSize)
            .lean();
        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize);
        logger_1.logger.info('Participants fetched by user', {
            userId,
            page: pageNumber,
            limit: pageSize,
            total,
            totalPages,
        });
        return {
            data: participants,
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
        logger_1.logger.error('Failed to fetch participants:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('participant.list.failed'));
    }
};
exports.getParticipantsByUser = getParticipantsByUser;
const updateParticipant = async (id, data, userId) => {
    try {
        // Get user ObjectId from cache or database
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Check if participant exists and belongs to the user
        const existingParticipant = await participant_model_1.ParticipantModel.findOne({
            _id: id,
            userId: userObjectId,
            is_deleted: false,
        });
        if (!existingParticipant) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('participant.notFound'));
        }
        const updates = {};
        // Update fields if provided
        if (data.firstName !== undefined)
            updates.firstName = data.firstName || null;
        if (data.lastName !== undefined)
            updates.lastName = data.lastName || null;
        if (data.gender !== undefined)
            updates.gender = data.gender !== null ? data.gender : null;
        if (data.disability !== undefined)
            updates.disability = data.disability;
        if (data.dob !== undefined)
            updates.dob = data.dob ? new Date(data.dob) : null;
        if (data.schoolName !== undefined)
            updates.schoolName = data.schoolName || null;
        if (data.contactNumber !== undefined)
            updates.contactNumber = data.contactNumber || null;
        if (data.profilePhoto !== undefined)
            updates.profilePhoto = data.profilePhoto || null;
        if (data.address !== undefined)
            updates.address = data.address || null;
        if (data.isSelf !== undefined)
            updates.isSelf = data.isSelf || null;
        // Update participant
        const updatedParticipant = await participant_model_1.ParticipantModel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
            .populate('userId', 'id firstName lastName email')
            .lean();
        if (!updatedParticipant) {
            throw new ApiError_1.ApiError(500, (0, i18n_1.t)('participant.update.failed'));
        }
        logger_1.logger.info(`Participant updated: ${id} by user: ${userId}`);
        return updatedParticipant;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update participant:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('participant.update.failed'));
    }
};
exports.updateParticipant = updateParticipant;
const deleteParticipant = async (id, userId) => {
    try {
        // Get user ObjectId from cache or database
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, 'User not found');
        }
        // Check if participant exists and belongs to the user
        const existingParticipant = await participant_model_1.ParticipantModel.findOne({
            _id: id,
            userId: userObjectId,
            is_deleted: false,
        });
        if (!existingParticipant) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('participant.notFound'));
        }
        // Soft delete: set is_deleted to true and deletedAt to current date
        await participant_model_1.ParticipantModel.findByIdAndUpdate(id, {
            is_deleted: true,
            deletedAt: new Date(),
        }, { runValidators: true });
        logger_1.logger.info('Participant soft deleted successfully', {
            participantId: id,
            userId,
        });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete participant:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('participant.delete.failed'));
    }
};
exports.deleteParticipant = deleteParticipant;
//# sourceMappingURL=participant.service.js.map