import { Types } from 'mongoose';
import { CoachingCenterModel, CoachingCenter } from '../../models/coachingCenter.model';
import { SportModel } from '../../models/sport.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../../validations/coachingCenter.validation';
import { config } from '../../config/env';
import { getUserObjectId } from '../../utils/userCache';
import * as commonService from '../common/coachingCenterCommon.service';

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

/**
 * Create coaching center for an academy user
 */
export const createCoachingCenter = async (
  data: CoachingCenterCreateInput,
  userId: string
): Promise<CoachingCenter> => {
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) throw new ApiError(404, 'User not found');

  // Validate sports
  const sportIds = data.sports ? data.sports.map((id) => new Types.ObjectId(id)) : [];
  if (sportIds.length > 0) {
    const sportsCount = await SportModel.countDocuments({ _id: { $in: sportIds } });
    if (sportsCount !== (data.sports?.length || 0)) throw new ApiError(400, t('coachingCenter.sports.invalid'));
  }

  // Resolve facilities
  const facilityIds = data.facility ? await commonService.resolveFacilities(data.facility) : [];

  // Prepare data
  const coachingCenterData: any = {
    ...data,
    user: userObjectId,
    sports: sportIds,
    facility: facilityIds,
    sport_details: data.sport_details?.map(sd => ({
      ...sd,
      sport_id: new Types.ObjectId(sd.sport_id)
    }))
  };
  delete coachingCenterData.description;

  // Save
  const coachingCenter = new CoachingCenterModel(coachingCenterData);
  await coachingCenter.save();

  // Move files if published
  if (data.status === 'published') {
    await commonService.moveMediaFilesToPermanent(coachingCenter.toObject());
    await commonService.enqueueThumbnailGenerationForVideos(coachingCenter.toObject());
  }

  return await commonService.getCoachingCenterById(coachingCenter._id.toString()) as CoachingCenter;
};

/**
 * Get coaching centers by user
 */
export const getCoachingCentersByUser = async (
  userId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): Promise<PaginatedResult<CoachingCenter>> => {
  try {
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) throw new ApiError(404, 'User not found');

    const query = { user: userObjectId, is_deleted: false };
    const total = await CoachingCenterModel.countDocuments(query);

    const coachingCenters = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .populate('sport_details.sport_id', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .populate({
        path: 'user',
        select: 'id firstName lastName email',
        match: { isDeleted: false },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: coachingCenters as CoachingCenter[],
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
    logger.error('Failed to fetch user coaching centers:', error);
    throw new ApiError(500, t('coachingCenter.list.failed'));
  }
};

/**
 * Re-export common functions for backward compatibility or easier access
 */
export const getCoachingCenterById = commonService.getCoachingCenterById;
export const deleteCoachingCenter = commonService.deleteCoachingCenter;
export const toggleCoachingCenterStatus = commonService.toggleCoachingCenterStatus;

/**
 * Remove media from coaching center (soft delete)
 * Supports: logo, documents, and sport_details media (images, videos)
 */
export const removeMediaFromCoachingCenter = async (
  coachingCenterId: string,
  mediaType: 'logo' | 'document' | 'image' | 'video',
  uniqueId: string,
  sportId?: string // Required for image/video (sport-specific media)
): Promise<void> => {
  try {
    const coachingCenter = await CoachingCenterModel.findById(coachingCenterId);
    if (!coachingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const now = new Date();

    if (mediaType === 'logo') {
      // Soft delete logo
      coachingCenter.logo = null;
      await coachingCenter.save({ validateBeforeSave: false });
      logger.info('Logo soft deleted from coaching center', { coachingCenterId });
      return;
    }

    if (mediaType === 'document') {
      // Soft delete document from general documents array
      const documentIndex = coachingCenter.documents?.findIndex(
        (doc) => doc.unique_id === uniqueId && !doc.is_deleted
      );

      if (documentIndex === -1 || documentIndex === undefined) {
        throw new ApiError(404, t('coachingCenter.media.notFound'));
      }

      if (coachingCenter.documents && coachingCenter.documents[documentIndex]) {
        coachingCenter.documents[documentIndex].is_deleted = true;
        coachingCenter.documents[documentIndex].deletedAt = now;
        coachingCenter.markModified('documents');
        await coachingCenter.save({ validateBeforeSave: false });
        logger.info('Document soft deleted from coaching center', {
          coachingCenterId,
          uniqueId,
        });
      }
      return;
    }

    // For image/video, sportId is required
    if ((mediaType === 'image' || mediaType === 'video') && !sportId) {
      throw new ApiError(400, t('coachingCenter.media.sportIdRequired'));
    }

    // Find sport detail by sport_id
    const sportDetailIndex = coachingCenter.sport_details?.findIndex(
      (detail) => detail.sport_id.toString() === sportId
    );

    if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
      throw new ApiError(404, t('coachingCenter.media.sportDetailNotFound'));
    }

    const sportDetail = coachingCenter.sport_details[sportDetailIndex];

    if (mediaType === 'image') {
      // Soft delete image from sport_details
      const imageIndex = sportDetail.images?.findIndex(
        (img) => img.unique_id === uniqueId && !img.is_deleted
      );

      if (imageIndex === -1 || imageIndex === undefined) {
        throw new ApiError(404, t('coachingCenter.media.notFound'));
      }

      if (sportDetail.images && sportDetail.images[imageIndex]) {
        sportDetail.images[imageIndex].is_deleted = true;
        sportDetail.images[imageIndex].deletedAt = now;
        coachingCenter.markModified(`sport_details.${sportDetailIndex}.images`);
        await coachingCenter.save({ validateBeforeSave: false });
        logger.info('Image soft deleted from coaching center', {
          coachingCenterId,
          sportId,
          uniqueId,
        });
      }
      return;
    }

    if (mediaType === 'video') {
      // Soft delete video from sport_details
      const videoIndex = sportDetail.videos?.findIndex(
        (video) => video.unique_id === uniqueId && !video.is_deleted
      );

      if (videoIndex === -1 || videoIndex === undefined) {
        throw new ApiError(404, t('coachingCenter.media.notFound'));
      }

      if (sportDetail.videos && sportDetail.videos[videoIndex]) {
        sportDetail.videos[videoIndex].is_deleted = true;
        sportDetail.videos[videoIndex].deletedAt = now;
        coachingCenter.markModified(`sport_details.${sportDetailIndex}.videos`);
        await coachingCenter.save({ validateBeforeSave: false });
        logger.info('Video soft deleted from coaching center', {
          coachingCenterId,
          sportId,
          uniqueId,
        });
      }
      return;
    }

    throw new ApiError(400, t('coachingCenter.media.invalidType'));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to remove media from coaching center:', error);
    throw new ApiError(500, t('coachingCenter.media.removeFailed'));
  }
};

/**
 * Update coaching center
 */
export const updateCoachingCenter = async (
  id: string,
  data: CoachingCenterUpdateInput
): Promise<CoachingCenter | null> => {
  try {
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter || existingCenter.is_deleted) throw new ApiError(404, t('coachingCenter.notFound'));

    const updates: any = {};

    if (data.sports !== undefined) {
      const sportIds = data.sports.map(sid => new Types.ObjectId(sid));
      const count = await SportModel.countDocuments({ _id: { $in: sportIds } });
      if (count !== data.sports.length) throw new ApiError(400, t('coachingCenter.sports.invalid'));
      updates.sports = sportIds;
    }

    if (data.facility !== undefined) {
      updates.facility = data.facility ? await commonService.resolveFacilities(data.facility) : [];
    }

    if (data.status === 'published' && existingCenter.status !== 'published') {
      commonService.validatePublishStatus({ ...existingCenter.toObject(), ...data });
    }

    // Handle other fields
    const fields = [
      'email', 'mobile_number', 'center_name', 'rules_regulation', 'logo', 'age', 
      'location', 'operational_timing', 'documents', 'bank_information', 
      'allowed_genders', 'allowed_disabled', 'is_only_for_disabled', 'experience', 'status'
    ];
    fields.forEach(f => { if ((data as any)[f] !== undefined) updates[f] = (data as any)[f]; });

    // Note: sport_details merge logic would go here if needed, keeping it simple for now or using common logic
    // For now using basic update
    if (data.sport_details) {
      updates.sport_details = data.sport_details.map(sd => ({
        ...sd,
        sport_id: new Types.ObjectId(sd.sport_id)
      }));
    }

    const updatedCenter = await CoachingCenterModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (data.status === 'published' && existingCenter.status !== 'published') {
      await commonService.moveMediaFilesToPermanent(updatedCenter as CoachingCenter);
      await commonService.enqueueThumbnailGenerationForVideos(updatedCenter as CoachingCenter);
    }

    return await commonService.getCoachingCenterById(id);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Update failed:', error);
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};
