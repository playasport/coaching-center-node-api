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
exports.deleteParticipant = exports.updateParticipant = exports.getParticipantsByUser = exports.getParticipantById = exports.createParticipant = void 0;
const participant_model_1 = require("../../models/participant.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const env_1 = require("../../config/env");
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
/**
 * Helper function to clean address object - removes internal fields
 */
const cleanAddressObject = (address) => {
    if (address && typeof address === 'object') {
        const { isDeleted, createdAt, updatedAt, ...cleanAddress } = address;
        return cleanAddress;
    }
    return address;
};
/**
 * Helper function to clean participant object - removes internal fields from address and participant
 */
const cleanParticipantObject = (participant) => {
    if (!participant)
        return participant;
    const { deletedAt, is_deleted, userId, _id, ...cleaned } = { ...participant };
    // Transform _id to id (only if id doesn't already exist)
    const participantId = cleaned.id || (_id ? (typeof _id === 'string' ? _id : _id.toString()) : undefined);
    // Clean address if present
    if (cleaned.address) {
        cleaned.address = cleanAddressObject(cleaned.address);
    }
    // Return object with id first
    if (participantId) {
        return {
            id: participantId,
            ...cleaned,
        };
    }
    return cleaned;
};
const createParticipant = async (data, userId, file) => {
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
        // Handle profile photo file upload if provided
        let profilePhotoUrl = data.profilePhoto || null;
        if (file) {
            try {
                logger_1.logger.info('Starting participant profile photo upload', {
                    userId,
                    fileName: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                });
                const { uploadFileToS3 } = await Promise.resolve().then(() => __importStar(require('../common/s3.service')));
                profilePhotoUrl = await uploadFileToS3({
                    file,
                    folder: 'participants',
                    userId: userId,
                });
                logger_1.logger.info('Participant profile photo uploaded successfully', {
                    imageUrl: profilePhotoUrl,
                    userId,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to upload participant profile photo', {
                    error: error?.message || error,
                    stack: error?.stack,
                    userId,
                    fileName: file?.originalname,
                });
                throw new ApiError_1.ApiError(500, error?.message || 'Failed to upload profile photo');
            }
        }
        // Prepare participant data
        // Note: isSelf is always set to null for manually created participants
        // Only the system sets isSelf = '1' when creating a user
        // Process address - ensure it has required fields or set to null
        // Address model requires: line2, city, state, country, pincode
        let processedAddress = null;
        // Handle case where address might still be a JSON string (defensive check)
        let addressObj = data.address;
        // Type guard: check if address is a string (defensive check for multipart/form-data)
        if (data.address && typeof data.address === 'string') {
            const addressString = data.address.trim();
            if (addressString.length > 0) {
                try {
                    addressObj = JSON.parse(addressString);
                }
                catch (parseError) {
                    logger_1.logger.warn('Failed to parse address JSON string in createParticipant', {
                        userId,
                        addressString: addressString.substring(0, 200),
                        error: parseError,
                    });
                    addressObj = null;
                }
            }
        }
        if (addressObj && typeof addressObj === 'object') {
            // Extract and trim address fields
            const line1 = addressObj.line1 ? String(addressObj.line1).trim() : null;
            const line2 = addressObj.line2 ? String(addressObj.line2).trim() : (line1 || ''); // Use line1 as fallback for line2
            const city = addressObj.city ? String(addressObj.city).trim() : '';
            const state = addressObj.state ? String(addressObj.state).trim() : '';
            const country = addressObj.country ? String(addressObj.country).trim() : 'India';
            const pincode = addressObj.pincode ? String(addressObj.pincode).trim() : '';
            // Only set address if city and state are present (minimum required for a valid address)
            // Provide defaults for other required fields if missing
            if (city && state) {
                processedAddress = {
                    line1: line1,
                    line2: line2 || (line1 || ''), // Use line1 if line2 is empty, or empty string as fallback
                    area: addressObj.area ? String(addressObj.area).trim() : null,
                    city: city,
                    state: state,
                    country: country,
                    pincode: pincode || '', // Allow empty pincode if not provided
                };
            }
        }
        const participantData = {
            userId: userObjectId,
            firstName: data.firstName || null,
            lastName: data.lastName || null,
            gender: data.gender !== undefined ? data.gender : null,
            disability: data.disability !== undefined ? data.disability : 0,
            dob: data.dob ? new Date(data.dob) : null,
            schoolName: data.schoolName || null,
            contactNumber: data.contactNumber || null,
            profilePhoto: profilePhotoUrl,
            address: processedAddress,
            isSelf: null, // Always null for manually created participants
        };
        // Create participant
        const participant = new participant_model_1.ParticipantModel(participantData);
        // Save participant
        const savedParticipant = await participant.save();
        logger_1.logger.info(`Participant created: ${savedParticipant._id} by user: ${userId}`);
        // Build response directly without additional query
        const participantObj = savedParticipant.toObject();
        const cleanedParticipant = cleanParticipantObject(participantObj);
        return cleanedParticipant;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create participant:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            userId,
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                hasAddress: !!data.address,
            },
        });
        // Include the actual error message if it's an Error instance
        const errorMessage = error instanceof Error ? error.message : 'Failed to create participant';
        throw new ApiError_1.ApiError(500, errorMessage);
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
        return cleanParticipantObject(participant);
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
        // Clean address objects in participants list
        const cleanedParticipants = participants.map(participant => cleanParticipantObject(participant));
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
            data: cleanedParticipants,
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
const updateParticipant = async (id, data, userId, file) => {
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
        // Log incoming data for debugging (especially address field)
        logger_1.logger.debug('Update participant data received', {
            participantId: id,
            userId,
            hasFile: !!file,
            addressProvided: data.address !== undefined,
            addressType: data.address !== undefined ? typeof data.address : 'undefined',
            addressValue: data.address !== undefined
                ? (typeof data.address === 'string'
                    ? String(data.address).substring(0, 100)
                    : typeof data.address === 'object'
                        ? JSON.stringify(data.address).substring(0, 100)
                        : String(data.address).substring(0, 100))
                : undefined,
        });
        // Handle profile photo file upload if provided
        if (file) {
            try {
                logger_1.logger.info('Starting participant profile photo upload (update)', {
                    participantId: id,
                    userId,
                    fileName: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                });
                // Delete old profile photo if exists
                if (existingParticipant.profilePhoto) {
                    try {
                        const { deleteFileFromS3 } = await Promise.resolve().then(() => __importStar(require('../common/s3.service')));
                        await deleteFileFromS3(existingParticipant.profilePhoto);
                        logger_1.logger.info('Old participant profile photo deleted', {
                            oldImageUrl: existingParticipant.profilePhoto,
                        });
                    }
                    catch (deleteError) {
                        logger_1.logger.warn('Failed to delete old participant profile photo, continuing with upload', deleteError);
                        // Don't fail the upload if deletion fails
                    }
                }
                // Upload new image to S3
                const { uploadFileToS3 } = await Promise.resolve().then(() => __importStar(require('../common/s3.service')));
                const imageUrl = await uploadFileToS3({
                    file,
                    folder: 'participants',
                    userId: userId,
                });
                updates.profilePhoto = imageUrl;
                logger_1.logger.info('Participant profile photo uploaded successfully', {
                    imageUrl,
                    participantId: id,
                    userId,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to upload participant profile photo', {
                    error: error?.message || error,
                    stack: error?.stack,
                    participantId: id,
                    userId,
                    fileName: file?.originalname,
                });
                throw new ApiError_1.ApiError(500, error?.message || 'Failed to upload profile photo');
            }
        }
        else if (data.profilePhoto !== undefined) {
            // If profilePhoto is explicitly set to null/empty string in request body, update it
            updates.profilePhoto = data.profilePhoto || null;
        }
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
        // Process address - ensure it has required fields or set to null
        // Address model requires: line2, city, state, country, pincode
        if (data.address !== undefined) {
            let processedAddress = null;
            // Handle case where address might still be a JSON string (defensive check)
            let addressObj = data.address;
            const addressValue = data.address;
            if (addressValue && typeof addressValue === 'string' && String(addressValue).trim().length > 0) {
                try {
                    addressObj = JSON.parse(String(addressValue));
                }
                catch (parseError) {
                    logger_1.logger.warn('Failed to parse address JSON string in update', {
                        participantId: id,
                        addressString: String(addressValue).substring(0, 200),
                        error: parseError,
                    });
                    addressObj = null;
                }
            }
            if (addressObj && typeof addressObj === 'object') {
                // Extract and trim address fields
                const line2 = addressObj.line2 ? String(addressObj.line2).trim() : '';
                const city = addressObj.city ? String(addressObj.city).trim() : '';
                const state = addressObj.state ? String(addressObj.state).trim() : '';
                const pincode = addressObj.pincode ? String(addressObj.pincode).trim() : '';
                const country = addressObj.country ? String(addressObj.country).trim() : 'India';
                // Only set address if all required fields are present and non-empty
                if (line2 && city && state && pincode) {
                    processedAddress = {
                        line1: addressObj.line1 ? String(addressObj.line1).trim() : null,
                        line2: line2,
                        area: addressObj.area ? String(addressObj.area).trim() : null,
                        city: city,
                        state: state,
                        country: country,
                        pincode: pincode,
                    };
                }
            }
            updates.address = processedAddress;
        }
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
        return cleanParticipantObject(updatedParticipant);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to update participant:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            participantId: id,
            userId,
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                hasAddress: data.address !== undefined,
                addressType: data.address ? typeof data.address : 'undefined',
            },
        });
        // Include the actual error message if it's an Error instance
        const errorMessage = error instanceof Error ? error.message : 'Failed to update participant';
        throw new ApiError_1.ApiError(500, errorMessage);
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