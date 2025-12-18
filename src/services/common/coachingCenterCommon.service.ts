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
 * Get coaching center by ID with population
 */
export const getCoachingCenterById = async (id: string): Promise<CoachingCenter | null> => {
  try {
    const coachingCenter = await CoachingCenterModel.findById(id)
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
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter || existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    await CoachingCenterModel.findByIdAndUpdate(
      id,
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
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter || existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const newActiveStatus = !existingCenter.is_active;
    const updatedCenter = await CoachingCenterModel.findByIdAndUpdate(
      id,
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
export const validatePublishStatus = (data: any) => {
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
  if (!data.bank_information) throw new ApiError(400, t('coachingCenter.bankInformation.bankNameRequired'));
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

