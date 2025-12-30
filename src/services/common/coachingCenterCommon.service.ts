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
 * Filter out deleted media items
 */
const filterDeletedMedia = (items: any[]): any[] => {
  if (!items || !Array.isArray(items)) return items;
  return items.filter(item => !item.is_deleted);
};

/**
 * Sort images so banner images appear first (after filtering deleted)
 */
const sortImagesWithBannerFirst = (images: any[]): any[] => {
  if (!images || !Array.isArray(images)) return images;
  // First filter out deleted images, then sort
  const activeImages = filterDeletedMedia(images);
  return activeImages.sort((a, b) => {
    // Banner images first (is_banner: true comes before false)
    if (a.is_banner && !b.is_banner) return -1;
    if (!a.is_banner && b.is_banner) return 1;
    return 0; // Keep original order for non-banner images
  });
};

/**
 * Sort sport_details images so banner images appear first and filter deleted media
 */
const sortSportDetailsImages = (sportDetails: any[]): any[] => {
  if (!sportDetails || !Array.isArray(sportDetails)) return sportDetails;
  return sportDetails.map((sportDetail) => {
    const filteredDetail: any = { ...sportDetail };
    
    // Filter and sort images
    if (sportDetail.images && Array.isArray(sportDetail.images)) {
      filteredDetail.images = sortImagesWithBannerFirst(sportDetail.images);
    }
    
    // Filter deleted videos
    if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
      filteredDetail.videos = filterDeletedMedia(sportDetail.videos);
    }
    
    return filteredDetail;
  });
};

/**
 * Filter deleted documents from coaching center
 */
const filterDeletedDocuments = (documents: any[]): any[] => {
  if (!documents || !Array.isArray(documents)) return documents;
  return filterDeletedMedia(documents);
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

    if (coachingCenter) {
      // Filter deleted documents
      if (coachingCenter.documents && Array.isArray(coachingCenter.documents)) {
        (coachingCenter as any).documents = filterDeletedDocuments(coachingCenter.documents);
      }
      
      // Sort images so banner images appear first and filter deleted media
      if (coachingCenter.sport_details) {
        (coachingCenter as any).sport_details = sortSportDetailsImages(coachingCenter.sport_details);
      }
    }

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

    // Filter deleted documents and sort images so banner images appear first
    if (updatedCenter) {
      // Filter deleted documents
      if (updatedCenter.documents && Array.isArray(updatedCenter.documents)) {
        (updatedCenter as any).documents = filterDeletedDocuments(updatedCenter.documents);
      }
      
      // Sort images so banner images appear first and filter deleted media
      if (updatedCenter.sport_details) {
        (updatedCenter as any).sport_details = sortSportDetailsImages(updatedCenter.sport_details);
      }
    }

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
    if (!coachingCenterId) {
      logger.error('Coaching center ID required for moving media files');
      throw new Error('Coaching center ID required');
    }

    logger.info('Starting media file move to permanent location', { 
      coachingCenterId: coachingCenterId.toString(),
      hasLogo: !!coachingCenter.logo,
      sportDetailsCount: coachingCenter.sport_details?.length || 0,
      documentsCount: coachingCenter.documents?.length || 0
    });

    if (coachingCenter.logo) fileUrls.push(coachingCenter.logo);
    
    coachingCenter.sport_details?.forEach(sd => {
      sd.images?.forEach(img => { if (img.url && !img.is_deleted) fileUrls.push(img.url); });
      sd.videos?.forEach(vid => {
        if (vid.url && !vid.is_deleted) fileUrls.push(vid.url);
        if (vid.thumbnail && !vid.is_deleted) fileUrls.push(vid.thumbnail);
      });
    });

    coachingCenter.documents?.forEach(doc => { if (doc.url && !doc.is_deleted) fileUrls.push(doc.url); });

    if (fileUrls.length === 0) {
      logger.info('No media files to move', { coachingCenterId: coachingCenterId.toString() });
      return;
    }

    logger.info('Moving files to permanent location', { 
      coachingCenterId: coachingCenterId.toString(),
      fileCount: fileUrls.length,
      files: fileUrls
    });

    const permanentUrls = await mediaService.moveFilesToPermanent(fileUrls);
    const urlMap = new Map<string, string>();
    fileUrls.forEach((temp, i) => { 
      if (permanentUrls[i] && permanentUrls[i] !== temp) {
        urlMap.set(temp, permanentUrls[i]);
        logger.info('File moved successfully', { temp, permanent: permanentUrls[i] });
      }
    });

    logger.info('File move results', { 
      coachingCenterId: coachingCenterId.toString(),
      totalFiles: fileUrls.length,
      movedFiles: urlMap.size,
      urlMap: Object.fromEntries(urlMap)
    });

    const updateQuery: any = {};
    let hasUpdates = false;
    
    // Update logo if it was moved
    if (coachingCenter.logo) {
      logger.info('Checking logo URL', { logo: coachingCenter.logo, urlMapHasLogo: urlMap.has(coachingCenter.logo) });
      if (urlMap.has(coachingCenter.logo)) {
        const newLogoUrl = urlMap.get(coachingCenter.logo);
        // Only update if URL actually changed (not a blob URL or already permanent)
        if (newLogoUrl && newLogoUrl !== coachingCenter.logo && !newLogoUrl.startsWith('blob:')) {
          updateQuery.logo = newLogoUrl;
          hasUpdates = true;
          logger.info('Logo URL updated', { old: coachingCenter.logo, new: newLogoUrl });
        }
      } else {
        logger.warn('Logo URL not found in urlMap', { logo: coachingCenter.logo, urlMapKeys: Array.from(urlMap.keys()) });
      }
    }

    // Update sport_details with new URLs and regenerate unique_ids
    if (coachingCenter.sport_details) {
      let sportDetailsHasUpdates = false;
      const updatedSportDetails = coachingCenter.sport_details.map((sd, sdIndex) => {
        // Handle sport_id - extract the actual ID value
        let sportId: Types.ObjectId | string;
        
        if (sd.sport_id instanceof Types.ObjectId) {
          sportId = sd.sport_id;
        } else if (typeof sd.sport_id === 'string') {
          // If it's a string, convert to ObjectId for MongoDB
          if (Types.ObjectId.isValid(sd.sport_id)) {
            sportId = new Types.ObjectId(sd.sport_id);
          } else {
            logger.error('Invalid sport_id string format', { sport_id: sd.sport_id, sportDetailIndex: sdIndex });
            throw new Error(`Invalid sport_id format at index ${sdIndex}: ${sd.sport_id}`);
          }
        } else if (sd.sport_id && typeof sd.sport_id === 'object' && (sd.sport_id as any)._id) {
          // If it's a populated object, extract the _id
          const idValue = (sd.sport_id as any)._id;
          sportId = idValue instanceof Types.ObjectId ? idValue : new Types.ObjectId(String(idValue));
        } else {
          logger.error('Unexpected sport_id format', { sport_id: sd.sport_id, sportDetailIndex: sdIndex, type: typeof sd.sport_id });
          throw new Error(`Unexpected sport_id format at index ${sdIndex}`);
        }
        
        return {
        ...sd,
          sport_id: sportId,
          images: sd.images?.map((img, imgIndex) => {
            logger.info('Checking image URL', { 
              sportIndex: sdIndex, 
              imageIndex: imgIndex,
              imageUrl: img.url, 
              urlMapHasUrl: urlMap.has(img.url),
              urlMapKeys: Array.from(urlMap.keys()).slice(0, 3) // Log first 3 keys for debugging
            });
            
            if (urlMap.has(img.url)) {
              const newUrl = urlMap.get(img.url);
              // Only update if URL actually changed (not a blob URL or already permanent)
              if (newUrl && newUrl !== img.url && !newUrl.startsWith('blob:')) {
                hasUpdates = true;
                sportDetailsHasUpdates = true;
                logger.info('Image URL updated', { 
                  sportIndex: sdIndex, 
                  imageIndex: imgIndex,
                  old: img.url, 
                  new: newUrl,
                  uniqueId: img.unique_id
                });
                return { ...img, url: newUrl };
              } else {
                logger.warn('Image URL not updated - conditions not met', { 
                  sportIndex: sdIndex, 
                  imageIndex: imgIndex,
                  old: img.url, 
                  new: newUrl,
                  isBlob: newUrl?.startsWith('blob:'),
                  isSame: newUrl === img.url
                });
              }
            } else {
              logger.warn('Image URL not found in urlMap', { 
                sportIndex: sdIndex, 
                imageIndex: imgIndex,
                imageUrl: img.url
              });
            }
            
            return img;
          }),
          videos: sd.videos?.map((vid, vidIndex) => {
            const updates: any = { ...vid };
            
            logger.info('Checking video URL', { 
              sportIndex: sdIndex, 
              videoIndex: vidIndex,
              videoUrl: vid.url, 
              urlMapHasUrl: urlMap.has(vid.url)
            });
            
            // Update video URL if moved
            if (urlMap.has(vid.url)) {
              const newUrl = urlMap.get(vid.url);
              if (newUrl && newUrl !== vid.url && !newUrl.startsWith('blob:')) {
                updates.url = newUrl;
                hasUpdates = true;
                sportDetailsHasUpdates = true;
                logger.info('Video URL updated', { 
                  sportIndex: sdIndex, 
                  videoIndex: vidIndex,
                  old: vid.url, 
                  new: newUrl
                });
              } else {
                logger.warn('Video URL not updated - conditions not met', { 
                  sportIndex: sdIndex, 
                  videoIndex: vidIndex,
                  old: vid.url, 
                  new: newUrl,
                  isBlob: newUrl?.startsWith('blob:'),
                  isSame: newUrl === vid.url
                });
              }
            } else {
              logger.warn('Video URL not found in urlMap', { 
                sportIndex: sdIndex, 
                videoIndex: vidIndex,
                videoUrl: vid.url
              });
            }
            
            // Update thumbnail URL if moved
            if (vid.thumbnail && urlMap.has(vid.thumbnail)) {
              const newThumbnailUrl = urlMap.get(vid.thumbnail);
              if (newThumbnailUrl && newThumbnailUrl !== vid.thumbnail && !newThumbnailUrl.startsWith('blob:')) {
                updates.thumbnail = newThumbnailUrl;
                hasUpdates = true;
                sportDetailsHasUpdates = true;
                logger.info('Video thumbnail URL updated', { 
                  sportIndex: sdIndex, 
                  videoIndex: vidIndex,
                  old: vid.thumbnail, 
                  new: newThumbnailUrl
                });
              }
            }
            
            return updates;
          })
        };
      });
      
      // Always set sport_details in updateQuery if there were any updates
      if (sportDetailsHasUpdates) {
        updateQuery.sport_details = updatedSportDetails;
        logger.info('Sport details will be updated', { 
          sportDetailsCount: updatedSportDetails.length,
          sportDetailsHasUpdates
        });
      } else {
        logger.info('Sport details unchanged, skipping update');
      }
    }

    // Update documents with new URLs and regenerate unique_ids
    if (coachingCenter.documents) {
      updateQuery.documents = coachingCenter.documents.map((doc, docIndex) => {
        if (urlMap.has(doc.url)) {
          const newUrl = urlMap.get(doc.url);
          // Only update if URL changed and it's not a blob URL
          if (newUrl && newUrl !== doc.url && !newUrl.startsWith('blob:')) {
            hasUpdates = true;
            logger.info('Document URL updated', { 
              docIndex,
              old: doc.url, 
              new: newUrl,
              uniqueId: doc.unique_id
            });
            return { ...doc, url: newUrl };
          }
        }
        return doc;
      });
    }

    if (!hasUpdates) {
      logger.warn('No updates to apply after moving media files', { 
        coachingCenterId: coachingCenterId.toString(),
        urlMapSize: urlMap.size
      });
      return;
    }

    logger.info('Updating coaching center with moved media files', { 
      coachingCenterId: coachingCenterId.toString(),
      updateQuery: JSON.stringify(updateQuery)
    });

    // Use getQueryById helper to handle both ObjectId and UUID string
    const query = getQueryById(coachingCenterId.toString());
    const result = await CoachingCenterModel.findOneAndUpdate(
      query, 
      { $set: updateQuery },
      { new: true }
    );

    if (!result) {
      logger.error('Failed to update coaching center - document not found', { 
        coachingCenterId: coachingCenterId.toString()
      });
      throw new Error(`Coaching center with ID ${coachingCenterId} not found`);
    }

    logger.info('Successfully moved media files to permanent location', { 
      coachingCenterId: coachingCenterId.toString(),
      updatedFields: Object.keys(updateQuery)
    });
  } catch (error) {
    logger.error('Failed to move media to permanent', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      coachingCenterId: (coachingCenter as any)?._id || (coachingCenter as any)?.id
    });
    // Re-throw the error so the caller knows it failed
    throw error;
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
    const query = getQueryById(coachingCenterId);
    const coachingCenter = await CoachingCenterModel.findOne(query);
    if (!coachingCenter || coachingCenter.is_deleted) {
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

/**
 * Set an image as banner for coaching center
 * Only one image can be banner at a time - unsets all other banner flags
 */
export const setBannerImage = async (
  coachingCenterId: string,
  sportId: string,
  imageUniqueId: string
): Promise<CoachingCenter> => {
  try {
    const query = getQueryById(coachingCenterId);
    const coachingCenter = await CoachingCenterModel.findOne(query);
    
    if (!coachingCenter || coachingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    // Find sport detail by sport_id
    const sportDetailIndex = coachingCenter.sport_details?.findIndex(
      (detail) => detail.sport_id.toString() === sportId
    );

    if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
      throw new ApiError(404, t('coachingCenter.media.sportDetailNotFound'));
    }

    const sportDetail = coachingCenter.sport_details[sportDetailIndex];
    
    // Find the image
    const imageIndex = sportDetail.images?.findIndex(
      (img) => img.unique_id === imageUniqueId && !img.is_deleted
    );

    if (imageIndex === -1 || imageIndex === undefined) {
      throw new ApiError(404, t('coachingCenter.media.notFound'));
    }

    // Unset all other banner flags across all sport_details
    if (coachingCenter.sport_details) {
      let hasChanges = false;
      coachingCenter.sport_details.forEach((sd, sdIdx) => {
        if (sd.images) {
          sd.images.forEach((img, imgIdx) => {
            if (img.is_banner && !(sdIdx === sportDetailIndex && imgIdx === imageIndex)) {
              img.is_banner = false;
              hasChanges = true;
            }
          });
        }
      });
      if (hasChanges) {
        (coachingCenter as any).markModified('sport_details');
      }
    }

    // Set the selected image as banner
    sportDetail.images[imageIndex].is_banner = true;
    (coachingCenter as any).markModified('sport_details');
    
    await (coachingCenter as any).save({ validateBeforeSave: false });

    logger.info('Banner image set for coaching center', {
      coachingCenterId: coachingCenterId.toString(),
      sportId,
      imageUniqueId,
    });

    return await getCoachingCenterById(coachingCenterId) as CoachingCenter;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to set banner image', { error, coachingCenterId, sportId, imageUniqueId });
    throw new ApiError(500, t('coachingCenter.media.setBannerFailed'));
  }
};

/**
 * Upload thumbnail file to S3
 */
export const uploadThumbnailFile = async (file: Express.Multer.File): Promise<string> => {
  try {
    const thumbnailUrl = await mediaService.uploadMediaFile({
      file,
      mediaType: 'image', // Thumbnails are images
    });
    return thumbnailUrl;
  } catch (error) {
    logger.error('Failed to upload thumbnail file', { error });
    throw new ApiError(500, 'Failed to upload thumbnail file');
  }
};

/**
 * Upload and set video thumbnail
 */
export const uploadVideoThumbnail = async (
  coachingCenterId: string,
  sportId: string,
  videoUniqueId: string,
  thumbnailUrl: string
): Promise<CoachingCenter> => {
  try {
    const query = getQueryById(coachingCenterId);
    const coachingCenter = await CoachingCenterModel.findOne(query);
    
    if (!coachingCenter || coachingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    // Find sport detail by sport_id
    const sportDetailIndex = coachingCenter.sport_details?.findIndex(
      (detail) => detail.sport_id.toString() === sportId
    );

    if (sportDetailIndex === -1 || sportDetailIndex === undefined) {
      throw new ApiError(404, t('coachingCenter.media.sportDetailNotFound'));
    }

    const sportDetail = coachingCenter.sport_details[sportDetailIndex];
    
    // Find the video
    const videoIndex = sportDetail.videos?.findIndex(
      (vid) => vid.unique_id === videoUniqueId && !vid.is_deleted
    );

    if (videoIndex === -1 || videoIndex === undefined) {
      throw new ApiError(404, t('coachingCenter.media.notFound'));
    }

    // Update thumbnail URL
    sportDetail.videos[videoIndex].thumbnail = thumbnailUrl;
    (coachingCenter as any).markModified(`sport_details.${sportDetailIndex}.videos`);
    
    await (coachingCenter as any).save({ validateBeforeSave: false });

    logger.info('Video thumbnail uploaded for coaching center', {
      coachingCenterId: coachingCenterId.toString(),
      sportId,
      videoUniqueId,
      thumbnailUrl,
    });

    return await getCoachingCenterById(coachingCenterId) as CoachingCenter;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to upload video thumbnail', { error, coachingCenterId, sportId, videoUniqueId });
    throw new ApiError(500, t('coachingCenter.media.uploadThumbnailFailed'));
  }
};

