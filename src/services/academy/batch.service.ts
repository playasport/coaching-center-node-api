import { Types } from 'mongoose';
import { BatchModel, Batch } from '../../models/batch.model';
import { SportModel } from '../../models/sport.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { EmployeeModel } from '../../models/employee.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import type { BatchCreateInput, BatchUpdateInput } from '../../validations/batch.validation';
import { getUserObjectId } from '../../utils/userCache';
import { config } from '../../config/env';

/**
 * Round a number to 2 decimal places to avoid floating-point precision issues
 * Uses Math.round for more accurate rounding than parseFloat(toFixed())
 */
const roundToTwoDecimals = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  // Use Math.round for more precise rounding (handles 500.0 correctly)
  return Math.round(value * 100) / 100;
};

/**
 * Recursively round all numeric values in an object to 2 decimal places
 * This is useful for fee_configuration which may contain various amount/price fields
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

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const createBatch = async (data: BatchCreateInput, loggedInUserId: string): Promise<Batch> => {
  try {
    // Validate user exists
    const userObjectId = await getUserObjectId(data.userId || loggedInUserId);
    if (!userObjectId) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Validate sport exists
    if (!Types.ObjectId.isValid(data.sportId)) {
      throw new ApiError(400, t('validation.batch.sportId.invalid'));
    }
    const sport = await SportModel.findById(data.sportId);
    if (!sport || !sport.is_active) {
      throw new ApiError(404, t('batch.sportNotFound'));
    }

    // Validate center exists
    if (!Types.ObjectId.isValid(data.centerId)) {
      throw new ApiError(400, t('validation.batch.centerId.invalid'));
    }
    const center = await CoachingCenterModel.findById(data.centerId);
    if (!center || center.is_deleted) {
      throw new ApiError(404, t('batch.centerNotFound'));
    }

    // Verify center belongs to logged-in user
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, t('batch.userNotFound'));
    }
    if (center.user.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('batch.centerNotOwned'));
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
      if (coach.center && coach.center.toString() !== data.centerId) {
        throw new ApiError(400, t('batch.coachNotInCenter'));
      }
    }

    // Validate age range respects center's age range if available
    if (center.age) {
      if (data.age.min < center.age.min || data.age.max > center.age.max) {
        throw new ApiError(400, 'Age range must respect the center\'s age range');
      }
    }

    // Validate sport is available for this center
    if (!center.sports || !center.sports.some((s: Types.ObjectId) => s.toString() === data.sportId)) {
      throw new ApiError(400, 'Sport is not available for the selected center');
    }

    // Prepare scheduled data
    const scheduledData: any = {
      start_date: data.scheduled.start_date,
      end_date: data.scheduled.end_date || null,
      training_days: data.scheduled.training_days,
    };

    // Handle timing - either common timing or individual timing
    if (data.scheduled.individual_timings && data.scheduled.individual_timings.length > 0) {
      scheduledData.individual_timings = data.scheduled.individual_timings;
      scheduledData.start_time = null;
      scheduledData.end_time = null;
    } else if (data.scheduled.start_time && data.scheduled.end_time) {
      scheduledData.start_time = data.scheduled.start_time;
      scheduledData.end_time = data.scheduled.end_time;
      scheduledData.individual_timings = null;
    }

    // Prepare batch data
    const batchData: any = {
      user: userObjectId,
      name: data.name,
      description: data.description || null,
      sport: new Types.ObjectId(data.sportId),
      center: new Types.ObjectId(data.centerId),
      coach: data.coach ? new Types.ObjectId(data.coach) : null,
      gender: data.gender,
      certificate_issued: data.certificate_issued,
      scheduled: scheduledData,
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
      base_price: roundToTwoDecimals(data.base_price),
      discounted_price: roundToTwoDecimals(data.discounted_price),
      status: data.status || 'draft',
      is_active: (data.status || 'draft') === 'published', // Set is_active based on status: draft = false, published = true
      is_deleted: false,
    };

    // Create batch
    const batch = new BatchModel(batchData);
    await batch.save();

    logger.info(`Batch created: ${batch._id} (${batch.name})`);

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
    logger.error('Failed to create batch:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ApiError(500, t('batch.create.failed'));
  }
};

export const getBatchById = async (id: string): Promise<Batch | null> => {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, t('batch.invalidId'));
    }

    const batch = await BatchModel.findOne({
      _id: id,
      is_deleted: false,
    })
      .populate('user', 'id firstName lastName email')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .populate('coach', 'fullName mobileNo email')
      .lean();

    return batch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch batch:', error);
    throw new ApiError(500, t('batch.get.failed'));
  }
};

export const getBatchesByUser = async (
  userId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): Promise<PaginatedResult<Batch>> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Build query - only get non-deleted batches for the user
    const query = {
      user: userObjectId,
      is_deleted: false,
    };

    // Get total count
    const total = await BatchModel.countDocuments(query);

    // Get paginated results with populated references
    const batches = await BatchModel.find(query)
      .populate({
        path: 'user',
        select: 'id firstName lastName email mobile',
        match: { isDeleted: false },
      })
      .populate({
        path: 'sport',
        select: 'custom_id name logo is_popular',
        match: { is_active: true },
      })
      .populate({
        path: 'center',
        select: 'center_name email mobile_number status',
        match: { is_deleted: false },
      })
      .populate({
        path: 'coach',
        select: 'fullName mobileNo email role',
        match: { is_deleted: false },
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Batches fetched by user', {
      userId,
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
    });

    return {
      data: batches,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch batches:', error);
    throw new ApiError(500, t('batch.list.failed'));
  }
};

export const getBatchesByCenter = async (
  centerId: string,
  userId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): Promise<PaginatedResult<Batch>> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Validate center ID
    if (!Types.ObjectId.isValid(centerId)) {
      throw new ApiError(400, t('validation.batch.centerId.invalid'));
    }

    // Validate center exists and belongs to user
    const center = await CoachingCenterModel.findById(centerId);
    if (!center || center.is_deleted) {
      throw new ApiError(404, t('batch.centerNotFound'));
    }

    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('batch.userNotFound'));
    }
    if (center.user.toString() !== userObjectId.toString()) {
      throw new ApiError(403, t('batch.centerNotOwned'));
    }

    // Build query
    const query = {
      center: new Types.ObjectId(centerId),
      is_deleted: false,
    };

    // Get total count
    const total = await BatchModel.countDocuments(query);

    // Get paginated results
    const batches = await BatchModel.find(query)
      .populate('user', 'id firstName lastName email')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .populate('coach', 'fullName mobileNo email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: batches,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch batches by center:', error);
    throw new ApiError(500, t('batch.list.failed'));
  }
};

export const updateBatch = async (id: string, data: BatchUpdateInput, loggedInUserId: string): Promise<Batch | null> => {
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

    // Get logged-in user ObjectId
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Verify batch belongs to logged-in user
    if (existingBatch.user.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('batch.unauthorizedUpdate'));
    }

    // Validation: If batch is active (is_active = true), details cannot be updated
    // Exception: If updating status from "published" to "draft", is_active will be set to false automatically
    if (existingBatch.is_active === true) {
      const updateFields = Object.keys(data);
      const hasOnlyIsActive = updateFields.length === 1 && updateFields[0] === 'is_active';
      const isSettingInactive = hasOnlyIsActive && data.is_active === false;
      const isChangingToDraft = data.status === 'draft' && existingBatch.status === 'published';

      // Allow if: 1) Only setting is_active to false, or 2) Changing status from published to draft (which sets is_active to false)
      if (!isSettingInactive && !isChangingToDraft) {
        throw new ApiError(400, 'Cannot update batch details while batch is active. Please deactivate the batch first by setting is_active to false or changing status to draft.');
      }
    }

    // Note: Status can be changed from "published" to "draft" - this will automatically set is_active to false

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

    // Validate center if provided
    if (data.centerId) {
      if (!Types.ObjectId.isValid(data.centerId)) {
        throw new ApiError(400, t('validation.batch.centerId.invalid'));
      }
      const center = await CoachingCenterModel.findById(data.centerId);
      if (!center || center.is_deleted) {
        throw new ApiError(404, t('batch.centerNotFound'));
      }
      // Verify center belongs to logged-in user
      if (center.user.toString() !== loggedInUserObjectId.toString()) {
        throw new ApiError(403, t('batch.centerNotOwned'));
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
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sportId !== undefined) updateData.sport = new Types.ObjectId(data.sportId);
    if (data.centerId !== undefined) updateData.center = new Types.ObjectId(data.centerId);
    if (data.coach !== undefined) updateData.coach = data.coach ? new Types.ObjectId(data.coach) : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.certificate_issued !== undefined) updateData.certificate_issued = data.certificate_issued;
    if (data.scheduled !== undefined) {
      const scheduledData: any = {
        start_date: data.scheduled.start_date,
        end_date: data.scheduled.end_date || null,
        training_days: data.scheduled.training_days,
      };
      // Handle timing - either common timing or individual timing
      if (data.scheduled.individual_timings && data.scheduled.individual_timings.length > 0) {
        scheduledData.individual_timings = data.scheduled.individual_timings;
        scheduledData.start_time = null;
        scheduledData.end_time = null;
      } else if (data.scheduled.start_time && data.scheduled.end_time) {
        scheduledData.start_time = data.scheduled.start_time;
        scheduledData.end_time = data.scheduled.end_time;
        scheduledData.individual_timings = null;
      }
      updateData.scheduled = scheduledData;
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
    if (data.admission_fee !== undefined) updateData.admission_fee = roundToTwoDecimals(data.admission_fee);
    if (data.base_price !== undefined) updateData.base_price = roundToTwoDecimals(data.base_price);
    if (data.discounted_price !== undefined) updateData.discounted_price = roundToTwoDecimals(data.discounted_price);
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Automatically set is_active based on status: draft = false, published = true
      updateData.is_active = data.status === 'published';
    } else if (data.is_active !== undefined) {
      // Only allow manual is_active update if status is not being updated
      updateData.is_active = data.is_active;
    }

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

    logger.info(`Batch updated: ${id}`);

    return batch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update batch:', error);
    throw new ApiError(500, t('batch.update.failed'));
  }
};

export const toggleBatchStatus = async (id: string, loggedInUserId: string): Promise<Batch | null> => {
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

    // Get logged-in user ObjectId
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Verify batch belongs to logged-in user
    if (batch.user.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('batch.unauthorizedToggle'));
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

    logger.info(`Batch status toggled: ${id} (is_active: ${updatedBatch.is_active})`);

    return updatedBatch;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to toggle batch status:', error);
    throw new ApiError(500, t('batch.toggleStatus.failed'));
  }
};

export const deleteBatch = async (id: string, loggedInUserId: string): Promise<void> => {
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

    // Get logged-in user ObjectId
    const loggedInUserObjectId = await getUserObjectId(loggedInUserId);
    if (!loggedInUserObjectId) {
      throw new ApiError(404, t('batch.notFound'));
    }

    // Verify batch belongs to logged-in user
    if (batch.user.toString() !== loggedInUserObjectId.toString()) {
      throw new ApiError(403, t('batch.unauthorizedDelete'));
    }

    // Soft delete batch
    await BatchModel.findByIdAndUpdate(id, {
      $set: {
        is_deleted: true,
        deletedAt: new Date(),
      },
    });

    logger.info(`Batch soft deleted: ${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete batch:', error);
    throw new ApiError(500, t('batch.delete.failed'));
  }
};


