"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleSportActiveStatus = exports.deleteSport = exports.updateSport = exports.getSportById = exports.getAllSports = exports.createSport = void 0;
const sport_model_1 = require("../../models/sport.model");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
/**
 * Create a new sport
 */
const createSport = async (data) => {
    try {
        const existingSport = await sport_model_1.SportModel.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
        if (existingSport) {
            throw new ApiError_1.ApiError(400, (0, i18n_1.t)('sport.alreadyExists'));
        }
        const sport = new sport_model_1.SportModel(data);
        await sport.save();
        return sport.toObject();
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to create sport:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('sport.create.failed'));
    }
};
exports.createSport = createSport;
/**
 * Get all sports with pagination and filters
 */
const getAllSports = async (page = 1, limit = 10, filters = {}) => {
    try {
        const skip = (page - 1) * limit;
        const query = {};
        if (filters.search) {
            query.name = { $regex: filters.search, $options: 'i' };
        }
        if (filters.isActive !== undefined) {
            query.is_active = filters.isActive;
        }
        if (filters.isPopular !== undefined) {
            query.is_popular = filters.isPopular;
        }
        const [sports, total] = await Promise.all([
            sport_model_1.SportModel.find(query)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            sport_model_1.SportModel.countDocuments(query),
        ]);
        return {
            sports: sports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sports for admin:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getAllSports = getAllSports;
/**
 * Get sport by ID
 */
const getSportById = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
        const sport = await sport_model_1.SportModel.findOne(query).lean();
        return sport;
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sport by ID:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('errors.internalServerError'));
    }
};
exports.getSportById = getSportById;
/**
 * Update sport
 */
const updateSport = async (id, data) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
        const existingSport = await sport_model_1.SportModel.findOne(query);
        if (!existingSport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        if (data.name && data.name.toLowerCase() !== existingSport.name.toLowerCase()) {
            const duplicateSport = await sport_model_1.SportModel.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') }, _id: { $ne: existingSport._id } });
            if (duplicateSport) {
                throw new ApiError_1.ApiError(400, (0, i18n_1.t)('sport.alreadyExists'));
            }
        }
        const updatedSport = await sport_model_1.SportModel.findOneAndUpdate(query, { $set: data }, { new: true, runValidators: true }).lean();
        return updatedSport;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to update sport:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('sport.update.failed'));
    }
};
exports.updateSport = updateSport;
/**
 * Delete sport
 */
const deleteSport = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
        const sport = await sport_model_1.SportModel.findOne(query);
        if (!sport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        // Check if sport is being used in any coaching center before deleting (optional but good practice)
        // For now, we'll just delete it.
        await sport_model_1.SportModel.deleteOne(query);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to delete sport:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('sport.delete.failed'));
    }
};
exports.deleteSport = deleteSport;
/**
 * Toggle sport active status
 */
const toggleSportActiveStatus = async (id) => {
    try {
        const query = mongoose_1.Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
        const existingSport = await sport_model_1.SportModel.findOne(query);
        if (!existingSport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        const newActiveStatus = !existingSport.is_active;
        const updatedSport = await sport_model_1.SportModel.findOneAndUpdate(query, { $set: { is_active: newActiveStatus } }, { new: true, runValidators: true }).lean();
        if (!updatedSport) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('sport.notFound'));
        }
        logger_1.logger.info(`Sport status toggled: ${id} (is_active: ${newActiveStatus})`);
        return updatedSport;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError)
            throw error;
        logger_1.logger.error('Failed to toggle sport active status:', error);
        throw new ApiError_1.ApiError(500, (0, i18n_1.t)('sport.toggleStatus.failed'));
    }
};
exports.toggleSportActiveStatus = toggleSportActiveStatus;
//# sourceMappingURL=sport.service.js.map