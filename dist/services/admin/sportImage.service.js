"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSportImage = exports.uploadSportImage = void 0;
const ApiError_1 = require("../../utils/ApiError");
const logger_1 = require("../../utils/logger");
const s3_service_1 = require("../common/s3.service");
const sport_model_1 = require("../../models/sport.model");
const mongoose_1 = require("mongoose");
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../../config/env");
/**
 * Generate a filename-safe slug from sport name
 */
const generateSportSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};
/**
 * Upload sport image to S3 with sport name in filename (replaces old image automatically)
 */
const uploadSportImage = async (sportId, file) => {
    try {
        // Find the sport
        const query = mongoose_1.Types.ObjectId.isValid(sportId) ? { _id: sportId } : { custom_id: sportId };
        const sport = await sport_model_1.SportModel.findOne(query);
        if (!sport) {
            throw new ApiError_1.ApiError(404, 'Sport not found');
        }
        const client = (0, s3_service_1.getS3Client)();
        if (!client) {
            throw new ApiError_1.ApiError(500, 'S3 client not configured');
        }
        if (!env_1.config.aws.s3Bucket) {
            throw new ApiError_1.ApiError(500, 'S3 bucket name not configured');
        }
        if (!file || !file.buffer) {
            throw new ApiError_1.ApiError(400, 'File buffer is missing');
        }
        // Generate filename using sport slug or name (this ensures same filename = automatic replacement)
        const sportSlug = sport.slug || generateSportSlug(sport.name);
        const fileExtension = file.originalname.split('.').pop() || 'jpg';
        const fileName = `images/sports/playasport-${sportSlug}.${fileExtension}`;
        // Upload to S3 (will automatically replace if file with same name exists)
        const command = new client_s3_1.PutObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype || 'image/jpeg',
        });
        await client.send(command);
        const imageUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${fileName}`;
        // Update sport with new image URL
        await sport_model_1.SportModel.findOneAndUpdate(query, { $set: { logo: imageUrl } });
        logger_1.logger.info('Sport image uploaded successfully', {
            sportId,
            sportName: sport.name,
            sportSlug,
            fileName,
            imageUrl
        });
        return imageUrl;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to upload sport image', { sportId, error });
        throw new ApiError_1.ApiError(500, 'Failed to upload sport image');
    }
};
exports.uploadSportImage = uploadSportImage;
/**
 * Delete sport image
 */
const deleteSportImage = async (sportId) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(sportId) ? { _id: sportId } : { custom_id: sportId };
        const sport = await sport_model_1.SportModel.findOne(query);
        if (!sport) {
            throw new ApiError_1.ApiError(404, 'Sport not found');
        }
        if (!sport.logo) {
            throw new ApiError_1.ApiError(404, 'Sport image not found');
        }
        // Delete from S3
        await (0, s3_service_1.deleteFileFromS3)(sport.logo);
        // Remove from sport document
        await sport_model_1.SportModel.findOneAndUpdate(query, { $set: { logo: null } });
        logger_1.logger.info('Sport image deleted successfully', { sportId });
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to delete sport image', { sportId, error });
        throw new ApiError_1.ApiError(500, 'Failed to delete sport image');
    }
};
exports.deleteSportImage = deleteSportImage;
//# sourceMappingURL=sportImage.service.js.map