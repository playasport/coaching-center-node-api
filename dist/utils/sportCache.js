"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSportObjectIds = exports.getSportObjectId = void 0;
const mongoose_1 = require("mongoose");
const sport_model_1 = require("../models/sport.model");
const logger_1 = require("./logger");
/**
 * Resolve sport ID (ObjectId or UUID/custom_id) to MongoDB ObjectId
 * @param sportId - Sport ID as string (can be ObjectId or UUID/custom_id)
 * @returns MongoDB ObjectId if sport exists, null otherwise
 */
const getSportObjectId = async (sportId) => {
    try {
        if (!sportId || typeof sportId !== 'string') {
            return null;
        }
        // If it's a valid ObjectId, try to find by _id first
        if (mongoose_1.Types.ObjectId.isValid(sportId)) {
            const sport = await sport_model_1.SportModel.findById(sportId).select('_id').lean();
            if (sport) {
                return new mongoose_1.Types.ObjectId(sportId);
            }
        }
        // If not found by ObjectId or not a valid ObjectId, try by custom_id (UUID)
        const sport = await sport_model_1.SportModel.findOne({ custom_id: sportId }).select('_id').lean();
        if (sport) {
            return sport._id;
        }
        return null;
    }
    catch (error) {
        logger_1.logger.error('Failed to resolve sport ObjectId:', {
            sportId,
            error: error instanceof Error ? error.message : error,
        });
        return null;
    }
};
exports.getSportObjectId = getSportObjectId;
/**
 * Resolve multiple sport IDs (ObjectId or UUID/custom_id) to MongoDB ObjectIds
 * @param sportIds - Array of sport IDs as strings (can be ObjectId or UUID/custom_id)
 * @returns Array of MongoDB ObjectIds for existing sports
 */
const getSportObjectIds = async (sportIds) => {
    try {
        if (!sportIds || sportIds.length === 0) {
            return [];
        }
        const objectIds = [];
        // Separate ObjectIds and UUIDs
        const validObjectIds = [];
        const uuids = [];
        for (const id of sportIds) {
            if (mongoose_1.Types.ObjectId.isValid(id)) {
                validObjectIds.push(id);
            }
            else {
                uuids.push(id);
            }
        }
        // Query for ObjectIds
        if (validObjectIds.length > 0) {
            const sportsById = await sport_model_1.SportModel.find({
                _id: { $in: validObjectIds.map(id => new mongoose_1.Types.ObjectId(id)) }
            }).select('_id').lean();
            sportsById.forEach(sport => {
                objectIds.push(sport._id);
            });
        }
        // Query for UUIDs (custom_id)
        if (uuids.length > 0) {
            const sportsByUuid = await sport_model_1.SportModel.find({
                custom_id: { $in: uuids }
            }).select('_id').lean();
            sportsByUuid.forEach(sport => {
                objectIds.push(sport._id);
            });
        }
        return objectIds;
    }
    catch (error) {
        logger_1.logger.error('Failed to resolve sport ObjectIds:', {
            sportIds,
            error: error instanceof Error ? error.message : error,
        });
        return [];
    }
};
exports.getSportObjectIds = getSportObjectIds;
//# sourceMappingURL=sportCache.js.map