import { SportModel, Sport } from '../../models/sport.model';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { CreateSportInput, UpdateSportInput } from '../../validations/sport.validation';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';

export interface AdminPaginatedResult<T> {
  sports: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create a new sport
 */
export const createSport = async (data: CreateSportInput): Promise<Sport> => {
  try {
    const existingSport = await SportModel.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
    if (existingSport) {
      throw new ApiError(400, t('sport.alreadyExists'));
    }

    const sport = new SportModel(data);
    await sport.save();
    return sport.toObject();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to create sport:', error);
    throw new ApiError(500, t('sport.create.failed'));
  }
};

/**
 * Get all sports with pagination and filters
 */
export const getAllSports = async (
  page: number = 1,
  limit: number = 10,
  filters: { search?: string; isActive?: boolean; isPopular?: boolean } = {}
): Promise<AdminPaginatedResult<Sport>> => {
  try {
    const skip = (page - 1) * limit;
    const query: any = {};

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
      SportModel.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SportModel.countDocuments(query),
    ]);

    return {
      sports: sports as Sport[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Failed to fetch sports for admin:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Get sport by ID
 */
export const getSportById = async (id: string): Promise<Sport | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
    const sport = await SportModel.findOne(query).lean();
    return sport as Sport | null;
  } catch (error) {
    logger.error('Failed to fetch sport by ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Update sport
 */
export const updateSport = async (id: string, data: UpdateSportInput): Promise<Sport | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
    const existingSport = await SportModel.findOne(query);
    if (!existingSport) {
      throw new ApiError(404, t('sport.notFound'));
    }

    if (data.name && data.name.toLowerCase() !== existingSport.name.toLowerCase()) {
      const duplicateSport = await SportModel.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') }, _id: { $ne: existingSport._id } });
      if (duplicateSport) {
        throw new ApiError(400, t('sport.alreadyExists'));
      }
    }

    const updatedSport = await SportModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    return updatedSport as Sport | null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to update sport:', error);
    throw new ApiError(500, t('sport.update.failed'));
  }
};

/**
 * Delete sport
 */
export const deleteSport = async (id: string): Promise<void> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
    const sport = await SportModel.findOne(query);
    if (!sport) {
      throw new ApiError(404, t('sport.notFound'));
    }

    // Check if sport is being used in any coaching center before deleting (optional but good practice)
    // For now, we'll just delete it.
    await SportModel.deleteOne(query);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to delete sport:', error);
    throw new ApiError(500, t('sport.delete.failed'));
  }
};

/**
 * Toggle sport active status
 */
export const toggleSportActiveStatus = async (id: string): Promise<Sport | null> => {
  try {
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { custom_id: id };
    const existingSport = await SportModel.findOne(query);
    if (!existingSport) {
      throw new ApiError(404, t('sport.notFound'));
    }

    const newActiveStatus = !existingSport.is_active;
    const updatedSport = await SportModel.findOneAndUpdate(
      query,
      { $set: { is_active: newActiveStatus } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedSport) {
      throw new ApiError(404, t('sport.notFound'));
    }

    logger.info(`Sport status toggled: ${id} (is_active: ${newActiveStatus})`);
    return updatedSport as Sport | null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to toggle sport active status:', error);
    throw new ApiError(500, t('sport.toggleStatus.failed'));
  }
};
