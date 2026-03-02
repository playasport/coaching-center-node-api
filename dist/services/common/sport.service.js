"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSports = void 0;
const sport_model_1 = require("../../models/sport.model");
const logger_1 = require("../../utils/logger");
const getAllSports = async () => {
    try {
        const sports = await sport_model_1.SportModel.find({ is_active: true })
            .select('_id custom_id name logo is_popular')
            .sort({ is_popular: -1, name: 1 })
            .lean();
        return sports.map((sport) => ({
            id: sport._id.toString(),
            name: sport.name,
            logo: sport.logo || null,
            is_popular: sport.is_popular || false,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sports', error);
        throw error;
    }
};
exports.getAllSports = getAllSports;
//# sourceMappingURL=sport.service.js.map