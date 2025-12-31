import { Types } from 'mongoose';
import { CoachingCenterModel, CoachingCenter } from '../../models/coachingCenter.model';
import { SportModel } from '../../models/sport.model';
import { UserModel } from '../../models/user.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../../validations/coachingCenter.validation';
import { config } from '../../config/env';
import { getUserObjectId } from '../../utils/userCache';
import * as commonService from '../common/coachingCenterCommon.service';
import { DefaultRoles } from '../../models/role.model';
import { AdminApproveStatus } from '../../enums/adminApprove.enum';

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

  // Prepare data - set approval_status to pending_approval by default for academy-created centers
  const coachingCenterData: any = {
    ...data,
    user: userObjectId,
    sports: sportIds,
    facility: facilityIds,
    approval_status: AdminApproveStatus.PENDING_APPROVAL, // Academy-created centers need approval
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

  // Send notifications to admin and super_admin when coaching center is published
  try {
    const { createAndSendNotification } = await import('../common/notification.service');
    const centerName = coachingCenter.center_name || 'Unnamed Academy';
    const creationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Get user info for notifications
    const user = await UserModel.findOne({ _id: userObjectId })
      .select('firstName lastName email')
      .lean();
    
    const ownerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown';

    // Send notification when coaching center is published

      await createAndSendNotification({
        recipientType: 'role',
        roles: [DefaultRoles.ADMIN, DefaultRoles.SUPER_ADMIN],
        title: 'New Academy Published',
        body: `A new academy "${centerName}" has been published by ${ownerName} and requires approval.`,
        channels: ['push'],
        priority: 'medium',
        data: {
          type: 'coaching_center_published',
          coachingCenterId: coachingCenter.id,
          centerName: centerName,
          ownerId: userId,
          ownerName: ownerName,
          approvalStatus: AdminApproveStatus.PENDING_APPROVAL,
          creationDate,
        },
        metadata: {
          source: 'academy_coaching_center_published',
          requiresApproval: true,
        },
      });

  } catch (notificationError) {
    logger.error('Failed to create admin notification for coaching center', { notificationError });
    // Don't throw error - notification failure shouldn't break creation
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

    // Filter deleted media from each coaching center
    const filteredCenters = coachingCenters.map((center: any) => {
      // Filter deleted documents
      if (center.documents && Array.isArray(center.documents)) {
        center.documents = center.documents.filter((doc: any) => !doc.is_deleted);
      }
      
      // Filter deleted images and videos from sport_details
      if (center.sport_details && Array.isArray(center.sport_details)) {
        center.sport_details = center.sport_details.map((sportDetail: any) => {
          const filteredDetail: any = { ...sportDetail };
          if (sportDetail.images && Array.isArray(sportDetail.images)) {
            filteredDetail.images = sportDetail.images.filter((img: any) => !img.is_deleted);
          }
          if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
            filteredDetail.videos = sportDetail.videos.filter((vid: any) => !vid.is_deleted);
          }
          return filteredDetail;
        });
      }
      
      return center;
    });

    return {
      data: filteredCenters as CoachingCenter[],
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
      commonService.validatePublishStatus({ ...existingCenter.toObject(), ...data }, false);
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

    // Handle media file movement and thumbnail generation
    // If status changed to published OR center is already published (checking for new temp files)
    const isNowPublished = data.status === 'published' && existingCenter.status !== 'published';
    const wasAlreadyPublished = existingCenter.status === 'published';
    
    if (isNowPublished || wasAlreadyPublished) {
      // Move temp files to permanent (handles both new status and new media in existing published center)
      try {
        await commonService.moveMediaFilesToPermanent(updatedCenter as CoachingCenter);
      } catch (mediaError) {
        logger.error('Failed to move media files during update:', { 
          error: mediaError instanceof Error ? mediaError.message : mediaError,
          stack: mediaError instanceof Error ? mediaError.stack : undefined,
          coachingCenterId: id
        });
        // Do not re-throw, allow update to succeed even if media movement fails
      }
      
      // Generate thumbnails for videos without thumbnails
      try {
        await commonService.enqueueThumbnailGenerationForVideos(updatedCenter as CoachingCenter);
      } catch (thumbnailError) {
        logger.error('Failed to enqueue thumbnail generation during update:', { 
          error: thumbnailError instanceof Error ? thumbnailError.message : thumbnailError,
          stack: thumbnailError instanceof Error ? thumbnailError.stack : undefined,
          coachingCenterId: id
        });
        // Do not re-throw, allow update to succeed even if thumbnail generation fails
      }
    }

    return await commonService.getCoachingCenterById(id);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Update failed:', error);
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};
