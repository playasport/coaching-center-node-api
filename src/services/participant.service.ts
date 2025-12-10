import { Types } from 'mongoose';
import { ParticipantModel, Participant } from '../models/participant.model';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import type { ParticipantCreateInput, ParticipantUpdateInput } from '../validations/participant.validation';
import { getUserObjectId } from '../utils/userCache';
import { config } from '../config/env';

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

export const createParticipant = async (
  data: ParticipantCreateInput,
  userId: string
): Promise<Participant> => {
  try {
    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Prepare participant data
    // Note: isSelf is always set to null for manually created participants
    // Only the system sets isSelf = '1' when creating a user
    const participantData: any = {
      userId: userObjectId,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      gender: data.gender !== undefined ? data.gender : null,
      disability: data.disability !== undefined ? data.disability : 0,
      dob: data.dob ? new Date(data.dob) : null,
      schoolName: data.schoolName || null,
      contactNumber: data.contactNumber || null,
      profilePhoto: data.profilePhoto || null,
      address: data.address || null,
      isSelf: null, // Always null for manually created participants
    };

    // Create participant
    const participant = new ParticipantModel(participantData);
    await participant.save();

    logger.info(`Participant created: ${participant._id} by user: ${userId}`);

    // Return the created participant with populated fields
    const populatedParticipant = await ParticipantModel.findById(participant._id)
      .populate('userId', 'id firstName lastName email')
      .lean();

    return populatedParticipant || participant;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create participant:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });
    throw new ApiError(500, t('participant.create.failed'));
  }
};

export const getParticipantById = async (
  id: string,
  userId: string
): Promise<Participant | null> => {
  try {
    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Find participant and ensure it belongs to the user
    const participant = await ParticipantModel.findOne({
      _id: id,
      userId: userObjectId,
      is_deleted: false,
    })
      .populate('userId', 'id firstName lastName email')
      .lean();

    return participant;
  } catch (error) {
    logger.error('Failed to fetch participant:', error);
    throw new ApiError(500, t('participant.get.failed'));
  }
};

export const getParticipantsByUser = async (
  userId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): Promise<PaginatedResult<Participant>> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(
      config.pagination.maxLimit,
      Math.max(1, Math.floor(limit))
    );

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Build query - only get non-deleted participants for the user
    const query = {
      userId: userObjectId,
      is_deleted: false,
    };

    // Get total count
    const total = await ParticipantModel.countDocuments(query);

    // Get paginated results
    const participants = await ParticipantModel.find(query)
      .populate('userId', 'id firstName lastName email')
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Participants fetched by user', {
      userId,
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
    });

    return {
      data: participants,
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
    logger.error('Failed to fetch participants:', error);
    throw new ApiError(500, t('participant.list.failed'));
  }
};

export const updateParticipant = async (
  id: string,
  data: ParticipantUpdateInput,
  userId: string
): Promise<Participant | null> => {
  try {
    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Check if participant exists and belongs to the user
    const existingParticipant = await ParticipantModel.findOne({
      _id: id,
      userId: userObjectId,
      is_deleted: false,
    });

    if (!existingParticipant) {
      throw new ApiError(404, t('participant.notFound'));
    }

    const updates: any = {};

    // Update fields if provided
    if (data.firstName !== undefined) updates.firstName = data.firstName || null;
    if (data.lastName !== undefined) updates.lastName = data.lastName || null;
    if (data.gender !== undefined) updates.gender = data.gender !== null ? data.gender : null;
    if (data.disability !== undefined) updates.disability = data.disability;
    if (data.dob !== undefined) updates.dob = data.dob ? new Date(data.dob) : null;
    if (data.schoolName !== undefined) updates.schoolName = data.schoolName || null;
    if (data.contactNumber !== undefined) updates.contactNumber = data.contactNumber || null;
    if (data.profilePhoto !== undefined) updates.profilePhoto = data.profilePhoto || null;
    if (data.address !== undefined) updates.address = data.address || null;
    if (data.isSelf !== undefined) updates.isSelf = data.isSelf || null;

    // Update participant
    const updatedParticipant = await ParticipantModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('userId', 'id firstName lastName email')
      .lean();

    if (!updatedParticipant) {
      throw new ApiError(500, t('participant.update.failed'));
    }

    logger.info(`Participant updated: ${id} by user: ${userId}`);

    return updatedParticipant;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update participant:', error);
    throw new ApiError(500, t('participant.update.failed'));
  }
};

export const deleteParticipant = async (id: string, userId: string): Promise<void> => {
  try {
    // Get user ObjectId from cache or database
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Check if participant exists and belongs to the user
    const existingParticipant = await ParticipantModel.findOne({
      _id: id,
      userId: userObjectId,
      is_deleted: false,
    });

    if (!existingParticipant) {
      throw new ApiError(404, t('participant.notFound'));
    }

    // Soft delete: set is_deleted to true and deletedAt to current date
    await ParticipantModel.findByIdAndUpdate(
      id,
      {
        is_deleted: true,
        deletedAt: new Date(),
      },
      { runValidators: true }
    );

    logger.info('Participant soft deleted successfully', {
      participantId: id,
      userId,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete participant:', error);
    throw new ApiError(500, t('participant.delete.failed'));
  }
};

