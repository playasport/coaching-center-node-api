import { FacilityModel } from '../../models/facility.model';
import { logger } from '../../utils/logger';
import { Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';

export interface FacilityListItem {
  _id: string;
  custom_id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export const getAllFacilities = async (search?: string): Promise<FacilityListItem[]> => {
  try {
    // Build query
    const query: any = {
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

    const facilities = await FacilityModel.find(query)
      .select('_id custom_id name description icon')
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();
    
    return facilities.map((facility) => ({
      _id: facility._id.toString(),
      custom_id: facility.custom_id,
      name: facility.name,
      description: facility.description || null,
      icon: facility.icon || null,
    })) as FacilityListItem[];
  } catch (error) {
    logger.error('Failed to fetch facilities', error);
    throw error;
  }
};

/**
 * Find or create facility
 * If facility is a string (ID), find by ID
 * If facility is an object (name, description, icon), find by name or create new
 */
export const findOrCreateFacility = async (
  facility: string | { name: string; description?: string | null; icon?: string | null } | null | undefined
): Promise<Types.ObjectId | null> => {
  try {
    if (!facility) {
      return null;
    }

    // If facility is a string (ID), find by ID
    if (typeof facility === 'string') {
      // Check if it's a valid ObjectId
      if (!Types.ObjectId.isValid(facility)) {
        throw new ApiError(400, 'Invalid facility ID format');
      }

      const facilityId = new Types.ObjectId(facility);
      const existingFacility = await FacilityModel.findOne({
        _id: facilityId,
        isDeleted: { $ne: true }, // Exclude soft-deleted facilities
      });

      if (!existingFacility) {
        throw new ApiError(400, 'Facility not found');
      }

      if (!existingFacility.is_active) {
        throw new ApiError(400, 'Facility is not active');
      }

      return facilityId;
    }

    // If facility is an object, find by name or create
    const facilityName = facility.name.trim();
    
    // Check if facility with same name already exists (excluding deleted)
    let existingFacility = await FacilityModel.findOne({
      name: { $regex: new RegExp(`^${facilityName}$`, 'i') }, // Case-insensitive match
      is_active: true,
      isDeleted: { $ne: true }, // Exclude soft-deleted facilities
    });

    if (existingFacility) {
      logger.info('Facility found by name', { name: facilityName, id: existingFacility._id });
      return existingFacility._id as Types.ObjectId;
    }

    // Create new facility
    const newFacility = new FacilityModel({
      name: facilityName,
      description: facility.description || null,
      icon: facility.icon || null,
      is_active: true,
    });

    await newFacility.save();
    logger.info('New facility created', { name: facilityName, id: newFacility._id });

    return newFacility._id as Types.ObjectId;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to find or create facility', error);
    throw new ApiError(500, 'Failed to process facility');
  }
};


