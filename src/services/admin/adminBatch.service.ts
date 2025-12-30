import { Types } from 'mongoose';
import { BatchModel, Batch } from '../../models/batch.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { config } from '../../config/env';
import * as batchService from '../academy/batch.service';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';

/**
 * Helper to get center ObjectId from either custom ID (UUID) or MongoDB ObjectId
 */
const getCenterObjectId = async (centerId: string): Promise<Types.ObjectId | null> => {
  try {
    // If it's a valid ObjectId, use it directly
    if (Types.ObjectId.isValid(centerId) && centerId.length === 24) {
      const center = await CoachingCenterModel.findById(centerId).select('_id').lean();
      if (center) {
        return center._id as Types.ObjectId;
      }
    }

    // Otherwise, try to find by custom ID (UUID)
    const center = await CoachingCenterModel.findOne({ id: centerId, is_deleted: false })
      .select('_id')
      .lean();

    return center ? (center._id as Types.ObjectId) : null;
  } catch (error) {
    logger.error('Failed to get center ObjectId:', error);
    return null;
  }
};

export interface AdminPaginatedResult<T> {
  batches: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetAdminBatchesFilters {
  userId?: string;
  centerId?: string;
  sportId?: string;
  status?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Round a number to 2 decimal places to avoid floating-point precision issues
 */
const roundToTwoDecimals = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return parseFloat(value.toFixed(2));
};

/**
 * Recursively round all numeric values in an object to 2 decimal places
 */
const roundNumericValues = (obj: any): any => {
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
    const rounded: any = {};
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
export const createBatchByAdmin = async (data: BatchCreateInput): Promise<Batch> => {
  try {
    const { SportModel } = await import('../../models/sport.model');
    const { EmployeeModel } = await import('../../models/employee.model');

    // Validate center exists - support both custom ID and ObjectId
    const centerObjectId = await getCenterObjectId(data.centerId);
    if (!centerObjectId) {
      throw new ApiError(404, t('batch.centerNotFound'));
    }

    // Get center to extract userId
    const center = await CoachingCenterModel.findById(centerObjectId);
    if (!center || center.is_deleted) {
      throw new ApiError(404, t('batch.centerNotFound'));
    }

    // Get userId from center (admin can create for any center)
    const userObjectId = center.user as Types.ObjectId;
    if (!userObjectId) {
      throw new ApiError(400, t('batch.userNotFound'));
    }

    // Validate sport exists
    if (!Types.ObjectId.isValid(data.sportId)) {
      throw new ApiError(400, t('validation.batch.sportId.invalid'));
    }
    const sport = await SportModel.findById(data.sportId);
    if (!sport || !sport.is_active) {
      throw new ApiError(404, t('batch.sportNotFound'));
    }

    // Validate coach exists if provided
    if (data.coach) {
      if (!Types.ObjectId.isValid(data.coach)) {
        throw new ApiError(400, t('validation.batch.coach.invalid'));
      }
      const coach = await EmployeeModel.findById(data.coach);
      if (!coach || coach.is_deleted) {
        throw new ApiError(404, t('batch.coachNotFound'));
      }
      // Verify coach belongs to the same center
      if (coach.center && coach.center.toString() !== centerObjectId.toString()) {
        throw new ApiError(400, t('batch.coachNotInCenter'));
      }
    }

    // Prepare batch data
    const batchData: any = {
      user: userObjectId,
      name: data.name,
      sport: new Types.ObjectId(data.sportId),
      center: centerObjectId,
      coach: data.coach ? new Types.ObjectId(data.coach) : null,
      scheduled: {
        start_date: data.scheduled.start_date,
        start_time: data.scheduled.start_time,
        end_time: data.scheduled.end_time,
        training_days: data.scheduled.training_days,
      },
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
      fee_structure: data.fee_structure
        ? {
            ...data.fee_structure,
            admission_fee: roundToTwoDecimals(data.fee_structure.admission_fee),
            fee_configuration: roundNumericValues(data.fee_structure.fee_configuration),
          }
        : null,
      status: data.status || 'draft',
      is_active: true,
      is_deleted: false,
    };

    // Create batch
    const batch = new BatchModel(batchData);
    await batch.save();

    logger.info(`Admin created batch: ${batch._id} (${batch.name}) for center: ${centerObjectId}`);

    // Return populated batch
    const populatedBatch = await BatchModel.findById(batch._id)
      .populate('user', 'id firstName lastName email')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .populate('coach', 'fullName mobileNo email')
      .lean();

    return populatedBatch || batch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to create batch:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, t('batch.create.failed'));
  }
};

/**
 * Get all batches for admin view with filters
 */
export const getAllBatches = async (
  page: number = 1,
  limit: number = 10,
  filters: GetAdminBatchesFilters = {}
): Promise<AdminPaginatedResult<Batch>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    const query: any = { is_deleted: false };

    // Apply filters
    if (filters.userId) {
      // Support both custom ID (UUID) and ObjectId
      if (Types.ObjectId.isValid(filters.userId) && filters.userId.length === 24) {
        // If it's a valid ObjectId, use it directly
        query.user = new Types.ObjectId(filters.userId);
      } else {
        // Otherwise, try to get ObjectId from custom ID
        const userObjectId = await getUserObjectId(filters.userId);
        if (userObjectId) {
          query.user = userObjectId;
        }
      }
    }

    if (filters.centerId) {
      const centerObjectId = await getCenterObjectId(filters.centerId);
      if (centerObjectId) {
        query.center = centerObjectId;
      }
    }

    if (filters.sportId) {
      if (Types.ObjectId.isValid(filters.sportId)) {
        query.sport = new Types.ObjectId(filters.sportId);
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
    const sort: any = { [sortField]: sortOrder };

    const [batches, total] = await Promise.all([
      BatchModel.find(query)
        .populate('user', 'id firstName lastName email mobile')
        .populate('sport', 'custom_id name logo')
        .populate('center', 'center_name email mobile_number')
        .populate('coach', 'fullName mobileNo email')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      BatchModel.countDocuments(query),
    ]);

    return {
      batches: batches as Batch[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    logger.error('Admin failed to fetch all batches:', error);
    throw new ApiError(500, t('batch.list.failed'));
  }
};

/**
 * Get batch by ID (admin view)
 */
export const getBatchById = async (id: string): Promise<Batch | null> => {
  try {
    return await batchService.getBatchById(id);
  } catch (error) {
    logger.error('Admin failed to fetch batch:', error);
    throw error;
  }
};

/**
 * Get batches by user ID (admin view)
 */
export const getBatchesByUserId = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<AdminPaginatedResult<Batch>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Support both custom ID (UUID) and ObjectId
    let userObjectId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(userId) && userId.length === 24) {
      // If it's a valid ObjectId, verify user exists
      const { UserModel } = await import('../../models/user.model');
      const user = await UserModel.findById(userId).select('_id').lean();
      if (user) {
        userObjectId = user._id as Types.ObjectId;
      }
    } else {
      // Otherwise, try to get ObjectId from custom ID
      userObjectId = await getUserObjectId(userId);
    }

    if (!userObjectId) {
      throw new ApiError(404, t('batch.userNotFound'));
    }

    const query: any = {
      user: userObjectId,
      is_deleted: false,
    };

    // Handle sorting
    const sortField = sortBy || 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrderValue };

    const [batches, total] = await Promise.all([
      BatchModel.find(query)
        .populate('user', 'id firstName lastName email mobile')
        .populate('sport', 'custom_id name logo')
        .populate('center', 'center_name email mobile_number')
        .populate('coach', 'fullName mobileNo email')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      BatchModel.countDocuments(query),
    ]);

    return {
      batches: batches as Batch[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to fetch batches by user:', error);
    throw new ApiError(500, t('batch.list.failed'));
  }
};

/**
 * Get batches by center ID (admin view)
 */
export const getBatchesByCenterId = async (
  centerId: string,
  page: number = 1,
  limit: number = 10,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<AdminPaginatedResult<Batch>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Support both custom ID (UUID) and ObjectId
    const centerObjectId = await getCenterObjectId(centerId);
    if (!centerObjectId) {
      throw new ApiError(404, t('batch.centerNotFound'));
    }

    const query: any = {
      center: centerObjectId,
      is_deleted: false,
    };

    // Handle sorting
    const sortField = sortBy || 'createdAt';
    const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrderValue };

    const [batches, total] = await Promise.all([
      BatchModel.find(query)
        .populate('user', 'id firstName lastName email mobile')
        .populate('sport', 'custom_id name logo')
        .populate('center', 'center_name email mobile_number')
        .populate('coach', 'fullName mobileNo email')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      BatchModel.countDocuments(query),
    ]);

    return {
      batches: batches as Batch[],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to fetch batches by center:', error);
    throw new ApiError(500, t('batch.list.failed'));
  }
};

/**
 * Update batch (admin - can update any batch)
 */
export const updateBatchByAdmin = async (id: string, data: BatchUpdateInput): Promise<Batch | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('batch.invalidId'));
    }

    // Check if batch exists
    const existingBatch = await BatchModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!existingBatch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Admin can update any batch, so we don't check ownership
    // But we still validate related entities if they're being updated
    const { SportModel } = await import('../../models/sport.model');
    const { CoachingCenterModel } = await import('../../models/coachingCenter.model');
    const { EmployeeModel } = await import('../../models/employee.model');

    // Validate sport if provided
    if (data.sportId) {
      if (!Types.ObjectId.isValid(data.sportId)) {
        throw new ApiError(400, t('validation.batch.sportId.invalid'));
      }
      const sport = await SportModel.findById(data.sportId);
      if (!sport || !sport.is_active) {
        throw new ApiError(404, t('batch.sportNotFound'));
      }
    }

    // Validate center if provided - support both custom ID and ObjectId
    if (data.centerId) {
      const centerObjectId = await getCenterObjectId(data.centerId);
      if (!centerObjectId) {
        throw new ApiError(404, t('batch.centerNotFound'));
      }
      // Verify center exists and is not deleted
      const center = await CoachingCenterModel.findById(centerObjectId);
      if (!center || center.is_deleted) {
        throw new ApiError(404, t('batch.centerNotFound'));
      }
    }

    // Validate coach if provided
    if (data.coach !== undefined) {
      if (data.coach) {
        if (!Types.ObjectId.isValid(data.coach)) {
          throw new ApiError(400, t('validation.batch.coach.invalid'));
        }
        const coach = await EmployeeModel.findById(data.coach);
        if (!coach || coach.is_deleted) {
          throw new ApiError(404, t('batch.coachNotFound'));
        }
        // Verify coach belongs to the center
        const centerId = data.centerId || existingBatch.center.toString();
        if (coach.center && coach.center.toString() !== centerId) {
          throw new ApiError(400, t('batch.coachNotInCenter'));
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sportId !== undefined) updateData.sport = new Types.ObjectId(data.sportId);
    if (data.centerId !== undefined) {
      const centerObjectId = await getCenterObjectId(data.centerId);
      if (!centerObjectId) {
        throw new ApiError(404, t('batch.centerNotFound'));
      }
      updateData.center = centerObjectId;
    }
    if (data.coach !== undefined) updateData.coach = data.coach ? new Types.ObjectId(data.coach) : null;
    if (data.scheduled !== undefined) {
      updateData.scheduled = {
        start_date: data.scheduled.start_date,
        start_time: data.scheduled.start_time,
        end_time: data.scheduled.end_time,
        training_days: data.scheduled.training_days,
      };
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
      const roundToTwoDecimals = (value: number | null | undefined): number | null => {
        if (value === null || value === undefined) return null;
        return parseFloat(value.toFixed(2));
      };
      updateData.admission_fee = roundToTwoDecimals(data.admission_fee);
    }
    if (data.fee_structure !== undefined) {
      const roundNumericValues = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'number') return parseFloat(obj.toFixed(2));
        if (Array.isArray(obj)) return obj.map(item => roundNumericValues(item));
        if (typeof obj === 'object') {
          const rounded: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              rounded[key] = roundNumericValues(obj[key]);
            }
          }
          return rounded;
        }
        return obj;
      };
      updateData.fee_structure = data.fee_structure
        ? {
            ...data.fee_structure,
            admission_fee: data.fee_structure.admission_fee ? parseFloat(data.fee_structure.admission_fee.toFixed(2)) : null,
            fee_configuration: roundNumericValues(data.fee_structure.fee_configuration),
          }
        : null;
    }
    if (data.status !== undefined) updateData.status = data.status;

    // Update batch
    const batch = await BatchModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate('user', 'id firstName lastName email')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .populate('coach', 'fullName mobileNo email')
      .lean();

    if (!batch) {
      throw new ApiError(404, 'Batch not found');
    }

    logger.info(`Admin updated batch: ${id}`);

    return batch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to update batch:', error);
    throw new ApiError(500, t('batch.update.failed'));
  }
};

/**
 * Delete batch (admin - can delete any batch)
 */
export const deleteBatchByAdmin = async (id: string): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('batch.invalidId'));
    }

    // Check if batch exists
    const batch = await BatchModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Soft delete batch
    await BatchModel.findByIdAndUpdate(id, {
      $set: {
        is_deleted: true,
        deletedAt: new Date(),
      },
    });

    logger.info(`Admin soft deleted batch: ${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to delete batch:', error);
    throw new ApiError(500, t('batch.delete.failed'));
  }
};

/**
 * Toggle batch status (admin - can toggle any batch)
 */
export const toggleBatchStatusByAdmin = async (id: string): Promise<Batch | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('batch.invalidId'));
    }

    // Check if batch exists
    const batch = await BatchModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!batch) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Toggle is_active status
    const updatedBatch = await BatchModel.findByIdAndUpdate(
      id,
      { $set: { is_active: !batch.is_active } },
      { new: true }
    )
      .populate('user', 'id firstName lastName email')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .populate('coach', 'fullName mobileNo email')
      .lean();

    if (!updatedBatch) {
      throw new ApiError(404, 'Batch not found');
    }

    logger.info(`Admin toggled batch status: ${id} (is_active: ${updatedBatch.is_active})`);

    return updatedBatch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Admin failed to toggle batch status:', error);
    throw new ApiError(500, t('batch.toggleStatus.failed'));
  }
};
