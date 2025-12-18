import { Types } from 'mongoose';
import { CoachingCenterModel, CoachingCenter } from '../../models/coachingCenter.model';
import { FacilityModel } from '../../models/facility.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import * as mediaService from './coachingCenterMedia.service';
import { findOrCreateFacility } from './facility.service';
import { enqueueThumbnailGeneration } from '../../queue/thumbnailQueue';

/**
 * Helper to get query by ID (supports both MongoDB ObjectId and custom UUID id)
 */
const getQueryById = (id: string) => {
  return Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
};

/**
 * Get coaching center by ID (supports both MongoDB ObjectId and custom UUID id)
 */
export const getCoachingCenterById = async (id: string): Promise<CoachingCenter | null> => {
  try {
    const coachingCenter = await CoachingCenterModel.findOne(getQueryById(id))
      .populate('sports', 'custom_id name logo is_popular')
      .populate('sport_details.sport_id', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .populate({
        path: 'user',
        select: 'id firstName lastName email',
        match: { isDeleted: false },
      })
      .lean();

    return coachingCenter;
  } catch (error) {
    logger.error('Failed to fetch coaching center:', error);
    throw new ApiError(500, t('coachingCenter.get.failed'));
  }
};

/**
 * Soft delete coaching center
 */
export const deleteCoachingCenter = async (id: string): Promise<void> => {
  try {
    const query = getQueryById(id);
    const existingCenter = await CoachingCenterModel.findOne(query);
    if (!existingCenter || existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    await CoachingCenterModel.findOneAndUpdate(
      query,
      {
        is_deleted: true,
        deletedAt: new Date(),
      },
      { runValidators: true }
    );

    logger.info('Coaching center soft deleted successfully', { coachingCenterId: id });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to delete coaching center:', error);
    throw new ApiError(500, t('coachingCenter.delete.failed'));
  }
};

/**
 * Toggle active status
 */
export const toggleCoachingCenterStatus = async (id: string): Promise<CoachingCenter | null> => {
  try {
    const query = getQueryById(id);
    const existingCenter = await CoachingCenterModel.findOne(query);
    if (!existingCenter || existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const newActiveStatus = !existingCenter.is_active;
    const updatedCenter = await CoachingCenterModel.findOneAndUpdate(
      query,
      { is_active: newActiveStatus },
      { new: true, runValidators: true }
    )
      .populate('sports', 'custom_id name logo is_popular')
      .populate('sport_details.sport_id', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .populate({
        path: 'user',
        select: 'id firstName lastName email',
        match: { isDeleted: false },
      })
      .lean();

    if (!updatedCenter) throw new ApiError(404, t('coachingCenter.notFound'));

    logger.info('Coaching center status toggled', { id, newStatus: newActiveStatus });
    return updatedCenter;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to toggle status:', error);
    throw new ApiError(500, t('coachingCenter.toggleStatus.failed'));
  }
};

/**
 * Enqueue thumbnail generation for videos
 */
export const enqueueThumbnailGenerationForVideos = async (coachingCenter: CoachingCenter): Promise<void> => {
  try {
    const coachingCenterId = (coachingCenter as any)._id?.toString() || (coachingCenter as any).id;
    if (!coachingCenterId || !coachingCenter.sport_details) return;

    for (let sportIndex = 0; sportIndex < coachingCenter.sport_details.length; sportIndex++) {
      const sportDetail = coachingCenter.sport_details[sportIndex];
      if (sportDetail.videos) {
        for (let videoIndex = 0; videoIndex < sportDetail.videos.length; videoIndex++) {
          const video = sportDetail.videos[videoIndex];
          if (video.url && !video.is_deleted && !video.thumbnail) {
            await enqueueThumbnailGeneration(coachingCenterId, video.url, {
              videoUniqueId: video.unique_id,
              sportDetailIndex: sportIndex,
              videoIndex: videoIndex,
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error('Failed to enqueue thumbnail generation', { error });
  }
};

/**
 * Move media from temp to permanent
 */
export const moveMediaFilesToPermanent = async (coachingCenter: CoachingCenter): Promise<void> => {
  try {
    const fileUrls: string[] = [];
    const coachingCenterId = (coachingCenter as any)._id || (coachingCenter as any).id;
    if (!coachingCenterId) throw new Error('Coaching center ID required');

    if (coachingCenter.logo) fileUrls.push(coachingCenter.logo);
    
    coachingCenter.sport_details?.forEach(sd => {
      sd.images?.forEach(img => { if (img.url && !img.is_deleted) fileUrls.push(img.url); });
      sd.videos?.forEach(vid => {
        if (vid.url && !vid.is_deleted) fileUrls.push(vid.url);
        if (vid.thumbnail && !vid.is_deleted) fileUrls.push(vid.thumbnail);
      });
    });

    coachingCenter.documents?.forEach(doc => { if (doc.url && !doc.is_deleted) fileUrls.push(doc.url); });

    if (fileUrls.length === 0) return;

    const permanentUrls = await mediaService.moveFilesToPermanent(fileUrls);
    const urlMap = new Map<string, string>();
    fileUrls.forEach((temp, i) => { if (permanentUrls[i]) urlMap.set(temp, permanentUrls[i]); });

    const updateQuery: any = {};
    if (coachingCenter.logo && urlMap.has(coachingCenter.logo)) updateQuery.logo = urlMap.get(coachingCenter.logo);

    if (coachingCenter.sport_details) {
      updateQuery.sport_details = coachingCenter.sport_details.map(sd => ({
        ...sd,
        images: sd.images?.map(img => urlMap.has(img.url) ? { ...img, url: urlMap.get(img.url) } : img),
        videos: sd.videos?.map(vid => ({
          ...vid,
          url: urlMap.has(vid.url) ? urlMap.get(vid.url) : vid.url,
          thumbnail: vid.thumbnail && urlMap.has(vid.thumbnail) ? urlMap.get(vid.thumbnail) : vid.thumbnail
        }))
      }));
    }

    if (coachingCenter.documents) {
      updateQuery.documents = coachingCenter.documents.map(doc => 
        urlMap.has(doc.url) ? { ...doc, url: urlMap.get(doc.url) } : doc
      );
    }

    await CoachingCenterModel.findByIdAndUpdate(coachingCenterId, { $set: updateQuery });
  } catch (error) {
    logger.error('Failed to move media to permanent', { error });
  }
};

/**
 * Validate required fields for publishing
 */
export const validatePublishStatus = (data: any, isAdmin: boolean = false) => {
  if (!data.center_name?.trim()) throw new ApiError(400, t('coachingCenter.centerName.required'));
  if (!data.mobile_number || !/^[6-9]\d{9}$/.test(data.mobile_number)) throw new ApiError(400, t('validation.mobileNumber.required'));
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new ApiError(400, t('validation.email.required'));
  if (!data.logo) throw new ApiError(400, t('coachingCenter.logo.required'));
  if (!data.sports?.length) throw new ApiError(400, t('validation.coachingCenter.sports.minOne'));
  if (!data.sport_details?.length) throw new ApiError(400, t('validation.coachingCenter.sports.minOne'));
  
  data.sport_details.forEach((sd: any, i: number) => {
    if (!sd.sport_id) throw new ApiError(400, `${t('validation.coachingCenter.sports.required')} [${i}]`);
    if (!sd.description?.trim() || sd.description.length < 5) throw new ApiError(400, `${t('coachingCenter.description.minLength')} [${i}]`);
  });

  if (!data.age?.min || !data.age?.max) throw new ApiError(400, t('coachingCenter.age.minRequired'));
  if (!data.location?.latitude || !data.location?.longitude || !data.location?.address) throw new ApiError(400, t('coachingCenter.location.latitudeRequired'));

  // Banking info mandatory for academy, optional for admin
  if (!isAdmin) {
    if (!data.bank_information?.bank_name) throw new ApiError(400, t('coachingCenter.bankInformation.bankNameRequired'));
    if (!data.bank_information?.account_number) throw new ApiError(400, t('coachingCenter.bankInformation.accountNumberRequired'));
    if (!data.bank_information?.ifsc_code) throw new ApiError(400, t('coachingCenter.bankInformation.ifscCodeRequired'));
    if (!data.bank_information?.account_holder_name) throw new ApiError(400, t('coachingCenter.bankInformation.accountHolderNameRequired'));
  }
};

/**
 * Resolve facilities from input
 */
export const resolveFacilities = async (facilityInput: any[]): Promise<Types.ObjectId[]> => {
  const promises = facilityInput.map(async (input) => {
    if (typeof input === 'string') {
      if (!Types.ObjectId.isValid(input)) throw new ApiError(400, t('coachingCenter.facility.invalidId', { id: input }));
      const exists = await FacilityModel.findById(input);
      if (!exists) throw new ApiError(400, t('coachingCenter.facility.notFound', { id: input }));
      return new Types.ObjectId(input);
    }
    const id = await findOrCreateFacility(input);
    if (!id) throw new ApiError(500, t('coachingCenter.facility.createFailed'));
    return id;
  });
  return await Promise.all(promises);
};

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
      await (coachingCenter as any).save({ validateBeforeSave: false });
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
        (coachingCenter as any).markModified('documents');
        await (coachingCenter as any).save({ validateBeforeSave: false });
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
        (coachingCenter as any).markModified(`sport_details.${sportDetailIndex}.images`);
        await (coachingCenter as any).save({ validateBeforeSave: false });
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
        (coachingCenter as any).markModified(`sport_details.${sportDetailIndex}.videos`);
        await (coachingCenter as any).save({ validateBeforeSave: false });
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

