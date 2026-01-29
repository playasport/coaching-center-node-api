import { Types } from 'mongoose';
import { SportModel } from '../models/sport.model';
import { logger } from './logger';

/**
 * Resolve sport ID (ObjectId or UUID/custom_id) to MongoDB ObjectId
 * @param sportId - Sport ID as string (can be ObjectId or UUID/custom_id)
 * @returns MongoDB ObjectId if sport exists, null otherwise
 */
export const getSportObjectId = async (sportId: string): Promise<Types.ObjectId | null> => {
  try {
    if (!sportId || typeof sportId !== 'string') {
      return null;
    }

    // If it's a valid ObjectId, try to find by _id first
    if (Types.ObjectId.isValid(sportId)) {
      const sport = await SportModel.findById(sportId).select('_id').lean();
      if (sport) {
        return new Types.ObjectId(sportId);
      }
    }

    // If not found by ObjectId or not a valid ObjectId, try by custom_id (UUID)
    const sport = await SportModel.findOne({ custom_id: sportId }).select('_id').lean();
    if (sport) {
      return sport._id as Types.ObjectId;
    }

    return null;
  } catch (error) {
    logger.error('Failed to resolve sport ObjectId:', {
      sportId,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
};

/**
 * Resolve multiple sport IDs (ObjectId or UUID/custom_id) to MongoDB ObjectIds
 * @param sportIds - Array of sport IDs as strings (can be ObjectId or UUID/custom_id)
 * @returns Array of MongoDB ObjectIds for existing sports
 */
export const getSportObjectIds = async (sportIds: string[]): Promise<Types.ObjectId[]> => {
  try {
    if (!sportIds || sportIds.length === 0) {
      return [];
    }

    const objectIds: Types.ObjectId[] = [];
    
    // Separate ObjectIds and UUIDs
    const validObjectIds: string[] = [];
    const uuids: string[] = [];

    for (const id of sportIds) {
      if (Types.ObjectId.isValid(id)) {
        validObjectIds.push(id);
      } else {
        uuids.push(id);
      }
    }

    // Query for ObjectIds
    if (validObjectIds.length > 0) {
      const sportsById = await SportModel.find({
        _id: { $in: validObjectIds.map(id => new Types.ObjectId(id)) }
      }).select('_id').lean();
      
      sportsById.forEach(sport => {
        objectIds.push(sport._id as Types.ObjectId);
      });
    }

    // Query for UUIDs (custom_id)
    if (uuids.length > 0) {
      const sportsByUuid = await SportModel.find({
        custom_id: { $in: uuids }
      }).select('_id').lean();
      
      sportsByUuid.forEach(sport => {
        objectIds.push(sport._id as Types.ObjectId);
      });
    }

    return objectIds;
  } catch (error) {
    logger.error('Failed to resolve sport ObjectIds:', {
      sportIds,
      error: error instanceof Error ? error.message : error,
    });
    return [];
  }
};
