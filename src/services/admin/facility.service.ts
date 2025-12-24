import { FacilityModel } from '../../models/facility.model';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';
import { CreateFacilityInput, UpdateFacilityInput } from '../../validations/facility.validation';

export interface GetAdminFacilitiesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminFacilityListItem {
  _id: string;
  custom_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaginatedFacilitiesResult {
  facilities: AdminFacilityListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Get all facilities for admin with filters and pagination
 */
export const getAllFacilities = async (
  params: GetAdminFacilitiesParams = {}
): Promise<AdminPaginatedFacilitiesResult> => {
  try {
    const query: any = {};

    // Filter by active status if provided
    if (params.isActive !== undefined) {
      query.is_active = params.isActive;
    }

    // Search by name or description
    if (params.search) {
      const searchRegex = new RegExp(params.search, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { custom_id: searchRegex },
      ];
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // Get total count
    const total = await FacilityModel.countDocuments(query);

    // Get facilities
    const facilities = await FacilityModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const transformedFacilities: AdminFacilityListItem[] = facilities.map((facility: any) => ({
      _id: facility._id.toString(),
      custom_id: facility.custom_id,
      name: facility.name,
      description: facility.description || null,
      icon: facility.icon || null,
      is_active: facility.is_active,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      facilities: transformedFacilities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch facilities for admin:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get facility by ID
 */
export const getFacilityById = async (id: string): Promise<AdminFacilityListItem | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id) };
    } else {
      query = { custom_id: id };
    }

    const facility = await FacilityModel.findOne(query).lean();

    if (!facility) {
      return null;
    }

    return {
      _id: facility._id.toString(),
      custom_id: facility.custom_id,
      name: facility.name,
      description: facility.description || null,
      icon: facility.icon || null,
      is_active: facility.is_active,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    };
  } catch (error) {
    logger.error('Failed to fetch facility by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create a new facility
 */
export const createFacility = async (data: CreateFacilityInput): Promise<AdminFacilityListItem> => {
  try {
    // Check if facility with same name already exists
    const existingFacility = await FacilityModel.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
    });

    if (existingFacility) {
      throw new ApiError(400, 'Facility with this name already exists');
    }

    const facility = new FacilityModel({
      name: data.name.trim(),
      description: data.description || null,
      icon: data.icon || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
    });

    await facility.save();

    return {
      _id: facility._id.toString(),
      custom_id: facility.custom_id,
      name: facility.name,
      description: facility.description || null,
      icon: facility.icon || null,
      is_active: facility.is_active,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create facility:', error);
    throw new ApiError(500, 'Failed to create facility');
  }
};

/**
 * Update facility
 */
export const updateFacility = async (
  id: string,
  data: UpdateFacilityInput
): Promise<AdminFacilityListItem | null> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id) };
    } else {
      query = { custom_id: id };
    }

    const existingFacility = await FacilityModel.findOne(query);
    if (!existingFacility) {
      throw new ApiError(404, 'Facility not found');
    }

    // Check if name is being updated and if it conflicts with another facility
    if (data.name && data.name.trim().toLowerCase() !== existingFacility.name.toLowerCase()) {
      const duplicateFacility = await FacilityModel.findOne({
        name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
        _id: { $ne: existingFacility._id },
      });

      if (duplicateFacility) {
        throw new ApiError(400, 'Facility with this name already exists');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }
    if (data.icon !== undefined) {
      updateData.icon = data.icon || null;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const updatedFacility = await FacilityModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedFacility) {
      return null;
    }

    return {
      _id: updatedFacility._id.toString(),
      custom_id: updatedFacility.custom_id,
      name: updatedFacility.name,
      description: updatedFacility.description || null,
      icon: updatedFacility.icon || null,
      is_active: updatedFacility.is_active,
      createdAt: updatedFacility.createdAt,
      updatedAt: updatedFacility.updatedAt,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update facility:', error);
    throw new ApiError(500, 'Failed to update facility');
  }
};

/**
 * Delete facility (soft delete by setting is_active to false)
 * Note: We don't hard delete to maintain referential integrity
 */
export const deleteFacility = async (id: string): Promise<void> => {
  try {
    let query: any;
    if (Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new Types.ObjectId(id) };
    } else {
      query = { custom_id: id };
    }

    const facility = await FacilityModel.findOne(query);
    if (!facility) {
      throw new ApiError(404, 'Facility not found');
    }

    // Soft delete by setting is_active to false
    await FacilityModel.findOneAndUpdate(query, { $set: { is_active: false } });

    logger.info(`Facility soft deleted: ${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete facility:', error);
    throw new ApiError(500, 'Failed to delete facility');
  }
};

