import { Types } from 'mongoose';
import { CoachingCenterModel, CoachingCenter } from '../models/coachingCenter.model';
import { SportModel } from '../models/sport.model';
import { FacilityModel } from '../models/facility.model';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../validations/coachingCenter.validation';
import * as mediaService from './coachingCenterMedia.service';
import { findOrCreateFacility } from './facility.service';

export interface CreateCoachingCenterData extends Omit<CoachingCenterCreateInput, 'sports' | 'facility'> {
  sports: Types.ObjectId[];
  facility: Types.ObjectId[];
}

export const createCoachingCenter = async (
  data: CoachingCenterCreateInput
): Promise<CoachingCenter> => {
  try {
    // Validate sports exist
    if (!data.sports || data.sports.length === 0) {
      throw new ApiError(400, t('validation.coachingCenter.sports.minOne'));
    }
    
    const sportIds = data.sports.map((id) => new Types.ObjectId(id));
    const sportsCount = await SportModel.countDocuments({ _id: { $in: sportIds } });
    
    if (sportsCount !== data.sports.length) {
      throw new ApiError(400, t('coachingCenter.sports.invalid'));
    }

    // Handle facilities - can be array of IDs (strings) or array of objects (for new facilities)
    let facilityIds: Types.ObjectId[] = [];
    if (data.facility && Array.isArray(data.facility) && data.facility.length > 0) {
      // Process each facility - can be ID string or object with name
      const facilityPromises = data.facility.map(async (facilityInput) => {
        if (typeof facilityInput === 'string') {
          // Existing facility ID
          if (!Types.ObjectId.isValid(facilityInput)) {
            throw new ApiError(400, t('coachingCenter.facility.invalidId', { id: facilityInput }));
          }
          const facilityId = new Types.ObjectId(facilityInput);
          const facilityExists = await FacilityModel.findById(facilityId);
          if (!facilityExists) {
            throw new ApiError(400, t('coachingCenter.facility.notFound', { id: facilityInput }));
          }
          return facilityId;
        } else {
          // New facility object - create it
          const facilityId = await findOrCreateFacility(facilityInput);
          if (!facilityId) {
            throw new ApiError(500, t('coachingCenter.facility.createFailed'));
          }
          return facilityId;
        }
      });
      
      const resolvedFacilities = await Promise.all(facilityPromises);
      // Filter out any null values (shouldn't happen due to error throwing, but TypeScript needs this)
      facilityIds = resolvedFacilities.filter((id): id is Types.ObjectId => id !== null);
    }

    // Check if email already exists
    const existingCenter = await CoachingCenterModel.findOne({
      email: data.email,
      is_deleted: false,
    });

    if (existingCenter) {
      throw new ApiError(409, t('coachingCenter.emailExists'));
    }

    // Check if mobile number already exists
    const existingMobile = await CoachingCenterModel.findOne({
      mobile_number: data.mobile_number,
      is_deleted: false,
    });

    if (existingMobile) {
      throw new ApiError(409, t('coachingCenter.mobileExists'));
    }

    // Prepare data for insertion
    const coachingCenterData: any = {
      ...data,
      sports: sportIds,
      facility: facilityIds,
    };

    // Create coaching center
    const coachingCenter = new CoachingCenterModel(coachingCenterData);
    await coachingCenter.save();

    // If status is 'published', move all media files from temp to permanent locations
    if (data.status === 'published') {
      logger.info('Moving media files to permanent location for published coaching center', {
        centerId: coachingCenter._id,
        logo: coachingCenter.logo,
        hasMedia: !!coachingCenter.media,
      });
      
      // Convert to plain object for moveMediaFilesToPermanent
      const centerForMove = coachingCenter.toObject ? coachingCenter.toObject() : coachingCenter;
      await moveMediaFilesToPermanent(centerForMove as CoachingCenter);
      
      // Wait a bit to ensure database update is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch to get updated URLs
      const updatedCenter = await CoachingCenterModel.findById(coachingCenter._id)
        .populate('sports', 'custom_id name logo is_popular')
        .populate('facility', 'custom_id name description icon')
        .lean();
      if (updatedCenter) {
        logger.info(`Coaching center created with permanent URLs: ${coachingCenter._id} (${coachingCenter.center_name})`);
        // Verify URLs are permanent
        if (updatedCenter.logo && updatedCenter.logo.includes('temp/')) {
          logger.warn('Logo URL still contains temp/ after move', { logo: updatedCenter.logo });
        }
        if (updatedCenter.media?.images?.[0]?.url?.includes('temp/')) {
          logger.warn('Image URLs still contain temp/ after move', { 
            firstImage: updatedCenter.media.images[0].url 
          });
        }
        return updatedCenter;
      }
    }

    logger.info(`Coaching center created: ${coachingCenter._id} (${coachingCenter.center_name})`);

    return coachingCenter;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create coaching center:', error);
    throw new ApiError(500, t('coachingCenter.create.failed'));
  }
};

export const getCoachingCenterById = async (id: string): Promise<CoachingCenter | null> => {
  try {
    const coachingCenter = await CoachingCenterModel.findById(id)
      .populate('sports', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .lean();

    return coachingCenter;
  } catch (error) {
    logger.error('Failed to fetch coaching center:', error);
    throw new ApiError(500, t('coachingCenter.get.failed'));
  }
};

export const updateCoachingCenter = async (
  id: string,
  data: CoachingCenterUpdateInput
): Promise<CoachingCenter | null> => {
  try {
    // Check if coaching center exists
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    if (existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const updates: any = {};

    // Validate and update sports if provided
    if (data.sports !== undefined) {
      if (data.sports.length === 0) {
        throw new ApiError(400, t('validation.coachingCenter.sports.minOne'));
      }
      const sportIds = data.sports.map((sportId) => new Types.ObjectId(sportId));
      const sportsCount = await SportModel.countDocuments({ _id: { $in: sportIds } });
      
      if (sportsCount !== data.sports.length) {
        throw new ApiError(400, t('coachingCenter.sports.invalid'));
      }
      updates.sports = sportIds;
    }

        // Handle facilities - can be array of IDs (strings) or array of objects (for new facilities)
        if (data.facility !== undefined) {
          if (data.facility && Array.isArray(data.facility) && data.facility.length > 0) {
            // Process each facility - can be ID string or object with name
            const facilityPromises = data.facility.map(async (facilityInput) => {
              if (typeof facilityInput === 'string') {
                // Existing facility ID
                if (!Types.ObjectId.isValid(facilityInput)) {
                  throw new ApiError(400, t('coachingCenter.facility.invalidId', { id: facilityInput }));
                }
                const facilityId = new Types.ObjectId(facilityInput);
                const facilityExists = await FacilityModel.findById(facilityId);
                if (!facilityExists) {
                  throw new ApiError(400, t('coachingCenter.facility.notFound', { id: facilityInput }));
                }
                return facilityId;
              } else {
                // New facility object - create it
                const facilityId = await findOrCreateFacility(facilityInput);
                if (!facilityId) {
                  throw new ApiError(500, t('coachingCenter.facility.createFailed'));
                }
                return facilityId;
              }
            });
            
            const resolvedFacilities = await Promise.all(facilityPromises);
            // Filter out any null values (shouldn't happen due to error throwing, but TypeScript needs this)
            updates.facility = resolvedFacilities.filter((id): id is Types.ObjectId => id !== null);
          } else {
            updates.facility = [];
          }
        }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existingCenter.email) {
      const emailExists = await CoachingCenterModel.findOne({
        email: data.email,
        _id: { $ne: id },
        is_deleted: false,
      });

      if (emailExists) {
        throw new ApiError(409, t('coachingCenter.emailExists'));
      }
      updates.email = data.email;
    }

    // Check mobile number uniqueness if mobile is being updated
    if (data.mobile_number && data.mobile_number !== existingCenter.mobile_number) {
      const mobileExists = await CoachingCenterModel.findOne({
        mobile_number: data.mobile_number,
        _id: { $ne: id },
        is_deleted: false,
      });

      if (mobileExists) {
        throw new ApiError(409, t('coachingCenter.mobileExists'));
      }
      updates.mobile_number = data.mobile_number;
    }

    // Update other fields
    if (data.center_name !== undefined) updates.center_name = data.center_name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.rules_regulation !== undefined) updates.rules_regulation = data.rules_regulation;
    if (data.logo !== undefined) updates.logo = data.logo;
    if (data.age !== undefined) updates.age = data.age;
    if (data.location !== undefined) updates.location = data.location;
    if (data.operational_timing !== undefined) updates.operational_timing = data.operational_timing;
    if (data.media !== undefined) updates.media = data.media;
    if (data.bank_information !== undefined) updates.bank_information = data.bank_information;
    
    // Handle status change
    const previousStatus = existingCenter.status;
    if (data.status !== undefined) {
      updates.status = data.status;
    }

    // Update coaching center
    const updatedCenter = await CoachingCenterModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('sports', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .lean();

    if (!updatedCenter) {
      throw new ApiError(500, t('coachingCenter.update.failed'));
    }

    // If status changed from 'draft' to 'published', move media files to permanent locations
    if (previousStatus === 'draft' && (data.status === 'published' || updatedCenter.status === 'published')) {
      await moveMediaFilesToPermanent(updatedCenter);
      
      // Wait a bit to ensure database update is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch to get updated URLs
      const refreshedCenter = await CoachingCenterModel.findById(id)
        .populate('sports', 'custom_id name logo is_popular')
        .populate('facility', 'custom_id name description icon')
        .lean();
      if (refreshedCenter) {
        logger.info(`Coaching center updated with permanent URLs: ${id} (${updatedCenter.center_name})`);
        // Verify URLs are permanent
        if (refreshedCenter.logo && refreshedCenter.logo.includes('temp/')) {
          logger.warn('Logo URL still contains temp/ after move', { logo: refreshedCenter.logo });
        }
        if (refreshedCenter.media?.images?.[0]?.url?.includes('temp/')) {
          logger.warn('Image URLs still contain temp/ after move', { 
            firstImage: refreshedCenter.media.images[0].url 
          });
        }
        return refreshedCenter;
      }
    }

    logger.info(`Coaching center updated: ${id} (${updatedCenter.center_name})`);

    return updatedCenter;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to update coaching center:', error);
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};

/**
 * Move all media files from temp to permanent locations
 */
const moveMediaFilesToPermanent = async (coachingCenter: CoachingCenter): Promise<void> => {
  try {
    const fileUrls: string[] = [];
    const coachingCenterId = (coachingCenter as any)._id?.toString() || 'unknown';

    logger.info('Starting media file move to permanent location', {
      coachingCenterId,
      hasLogo: !!coachingCenter.logo,
      hasMedia: !!coachingCenter.media,
    });

    // Collect logo URL
    if (coachingCenter.logo) {
      fileUrls.push(coachingCenter.logo);
      logger.info('Added logo URL to move list', { url: coachingCenter.logo });
    }

    // Collect media URLs
    if (coachingCenter.media) {
      if (coachingCenter.media.images && Array.isArray(coachingCenter.media.images)) {
        coachingCenter.media.images.forEach((img) => {
          if (img && img.url && !img.is_deleted) {
            fileUrls.push(img.url);
            logger.info('Added image URL to move list', { url: img.url });
          }
        });
      }
      if (coachingCenter.media.videos && Array.isArray(coachingCenter.media.videos)) {
        coachingCenter.media.videos.forEach((vid) => {
          if (vid && vid.url && !vid.is_deleted) {
            fileUrls.push(vid.url);
            logger.info('Added video URL to move list', { url: vid.url });
          }
        });
      }
      if (coachingCenter.media.documents && Array.isArray(coachingCenter.media.documents)) {
        coachingCenter.media.documents.forEach((doc) => {
          if (doc && doc.url && !doc.is_deleted) {
            fileUrls.push(doc.url);
            logger.info('Added document URL to move list', { url: doc.url });
          }
        });
      }
    }

    if (fileUrls.length === 0) {
      logger.warn('No media files found to move to permanent location', { coachingCenterId });
      return;
    }

    logger.info(`Moving ${fileUrls.length} media files to permanent locations`, {
      coachingCenterId,
      fileUrls,
    });

    // Move all files to permanent locations
    const permanentUrls = await mediaService.moveFilesToPermanent(fileUrls);
    
    // Create a map for quick lookup: tempUrl -> permanentUrl
    const urlMap = new Map<string, string>();
    fileUrls.forEach((tempUrl, index) => {
      if (permanentUrls[index]) {
        urlMap.set(tempUrl, permanentUrls[index]);
        logger.info('URL mapping', {
          tempUrl,
          permanentUrl: permanentUrls[index],
          index,
        });
      } else {
        logger.warn('No permanent URL found for temp URL', { tempUrl, index });
      }
    });
    
    logger.info(`Successfully moved ${permanentUrls.length} files`, {
      coachingCenterId,
      urlMapSize: urlMap.size,
      permanentUrlsCount: permanentUrls.length,
    });

    // Update coaching center with permanent URLs
    const updates: any = {};

    // Update logo using URL map
    if (coachingCenter.logo) {
      const permanentLogoUrl = urlMap.get(coachingCenter.logo);
      if (permanentLogoUrl) {
        logger.info('Updating logo URL', {
          oldUrl: coachingCenter.logo,
          newUrl: permanentLogoUrl,
        });
        updates.logo = permanentLogoUrl;
      } else {
        logger.warn('Logo URL not found in URL map', {
          logoUrl: coachingCenter.logo,
          urlMapKeys: Array.from(urlMap.keys()).slice(0, 3),
        });
      }
    }

    // Update media URLs - preserve entire media structure
    if (coachingCenter.media) {
      const mediaUpdates: any = {
        images: coachingCenter.media.images || [],
        videos: coachingCenter.media.videos || [],
        documents: coachingCenter.media.documents || [],
      };

      // Update images using URL map
      if (Array.isArray(coachingCenter.media.images)) {
        mediaUpdates.images = coachingCenter.media.images.map((img) => {
          if (img && img.url && !img.is_deleted) {
            const permanentUrl = urlMap.get(img.url);
            if (permanentUrl) {
              logger.info('Updating image URL', {
                oldUrl: img.url,
                newUrl: permanentUrl,
              });
              return { ...img, url: permanentUrl };
            } else {
              logger.warn('Image URL not found in URL map', {
                imageUrl: img.url,
              });
            }
          }
          return img;
        });
      }

      // Update videos using URL map
      if (Array.isArray(coachingCenter.media.videos)) {
        mediaUpdates.videos = coachingCenter.media.videos.map((vid) => {
          if (vid && vid.url && !vid.is_deleted) {
            const permanentUrl = urlMap.get(vid.url);
            if (permanentUrl) {
              logger.info('Updating video URL', {
                oldUrl: vid.url,
                newUrl: permanentUrl,
              });
              return { ...vid, url: permanentUrl };
            } else {
              logger.warn('Video URL not found in URL map', {
                videoUrl: vid.url,
              });
            }
          }
          return vid;
        });
      }

      // Update documents using URL map
      if (Array.isArray(coachingCenter.media.documents)) {
        mediaUpdates.documents = coachingCenter.media.documents.map((doc) => {
          if (doc && doc.url && !doc.is_deleted) {
            const permanentUrl = urlMap.get(doc.url);
            if (permanentUrl) {
              logger.info('Updating document URL', {
                oldUrl: doc.url,
                newUrl: permanentUrl,
              });
              return { ...doc, url: permanentUrl };
            } else {
              logger.warn('Document URL not found in URL map', {
                documentUrl: doc.url,
              });
            }
          }
          return doc;
        });
      }

      updates.media = mediaUpdates;
      logger.info('Prepared media updates', {
        imagesCount: mediaUpdates.images.length,
        videosCount: mediaUpdates.videos.length,
        documentsCount: mediaUpdates.documents.length,
      });
    }

    // Update coaching center with permanent URLs
    if (Object.keys(updates).length > 0) {
      const coachingCenterId = (coachingCenter as any)._id;
      if (coachingCenterId) {
        logger.info('Updating coaching center with permanent URLs', {
          coachingCenterId: coachingCenterId.toString(),
          updatesKeys: Object.keys(updates),
          hasLogo: !!updates.logo,
          hasMedia: !!updates.media,
        });
        
        // Use $set to update nested fields properly
        const updateQuery: any = {};
        if (updates.logo) {
          updateQuery['logo'] = updates.logo;
        }
        if (updates.media) {
          // Update entire media object
          updateQuery['media'] = updates.media;
        }
        
        logger.info('Update query prepared', {
          coachingCenterId: coachingCenterId.toString(),
          updateQueryKeys: Object.keys(updateQuery),
          logoUpdate: updateQuery.logo,
          mediaUpdate: {
            imagesCount: updateQuery.media?.images?.length || 0,
            videosCount: updateQuery.media?.videos?.length || 0,
            documentsCount: updateQuery.media?.documents?.length || 0,
            firstImageUrl: updateQuery.media?.images?.[0]?.url || 'none',
            firstImageIsTemp: updateQuery.media?.images?.[0]?.url?.includes('temp/') || false,
          },
        });
        
        // Log what we're updating
        logger.info('URLs mapping', {
          fileUrlsCount: fileUrls.length,
          permanentUrlsCount: permanentUrls.length,
          fileUrls: fileUrls.slice(0, 3), // First 3 for debugging
          permanentUrls: permanentUrls.slice(0, 3), // First 3 for debugging
        });
        
        // Fetch the document and update directly to ensure nested objects are updated correctly
        const doc = await CoachingCenterModel.findById(coachingCenterId);
        
        if (!doc) {
          logger.error('Failed to find coaching center for update', {
            coachingCenterId: coachingCenterId.toString(),
          });
          return;
        }
        
        // Update fields directly on the document
        if (updateQuery.logo) {
          doc.logo = updateQuery.logo;
        }
        if (updateQuery.media) {
          doc.media = updateQuery.media;
          // Mark nested object as modified
          doc.markModified('media');
        }
        
        // Save the document
        await doc.save();
        
        logger.info(`Successfully updated coaching center with permanent URLs`, {
          coachingCenterId: coachingCenterId.toString(),
          filesMoved: permanentUrls.length,
          updatedLogo: !!doc.logo,
          updatedMedia: !!doc.media,
        });
        
        // Convert to plain object for logging
        const updateResultPlain = doc.toObject ? doc.toObject() : doc;
        
        // Verify the update by checking the saved document
        logger.info('Verified update - permanent URLs saved', {
          coachingCenterId: coachingCenterId.toString(),
          logo: updateResultPlain.logo,
          logoIsTemp: updateResultPlain.logo?.includes('temp/') || false,
          mediaImagesCount: updateResultPlain.media?.images?.length || 0,
          mediaVideosCount: updateResultPlain.media?.videos?.length || 0,
          mediaDocumentsCount: updateResultPlain.media?.documents?.length || 0,
          firstImageUrl: updateResultPlain.media?.images?.[0]?.url || 'none',
          firstImageIsTemp: updateResultPlain.media?.images?.[0]?.url?.includes('temp/') || false,
          firstVideoUrl: updateResultPlain.media?.videos?.[0]?.url || 'none',
          firstVideoIsTemp: updateResultPlain.media?.videos?.[0]?.url?.includes('temp/') || false,
          firstDocUrl: updateResultPlain.media?.documents?.[0]?.url || 'none',
          firstDocIsTemp: updateResultPlain.media?.documents?.[0]?.url?.includes('temp/') || false,
        });
        
        // Double-check by fetching fresh from database after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const verifyCenter = await CoachingCenterModel.findById(coachingCenterId).lean();
        if (verifyCenter) {
          const hasTempUrls = 
            (verifyCenter.logo && verifyCenter.logo.includes('temp/')) ||
            verifyCenter.media?.images?.some(img => img.url?.includes('temp/')) ||
            verifyCenter.media?.videos?.some(vid => vid.url?.includes('temp/')) ||
            verifyCenter.media?.documents?.some(doc => doc.url?.includes('temp/'));
          
          if (hasTempUrls) {
            logger.error('CRITICAL: Temp URLs still present after update!', {
              coachingCenterId: coachingCenterId.toString(),
              logo: verifyCenter.logo,
              tempImages: verifyCenter.media?.images?.filter(img => img.url?.includes('temp/')).map(img => img.url),
              tempVideos: verifyCenter.media?.videos?.filter(vid => vid.url?.includes('temp/')).map(vid => vid.url),
              tempDocs: verifyCenter.media?.documents?.filter(doc => doc.url?.includes('temp/')).map(doc => doc.url),
              updateQuery: JSON.stringify(updateQuery, null, 2),
            });
          } else {
            logger.info('✅ All URLs successfully updated to permanent locations', {
              coachingCenterId: coachingCenterId.toString(),
            });
          }
        }
      } else {
        logger.error('Coaching center ID not found', {
          coachingCenter: JSON.stringify(coachingCenter, null, 2),
        });
      }
    } else {
      logger.warn('No updates to apply - updates object is empty', {
        coachingCenterId: (coachingCenter as any)._id?.toString() || 'unknown',
        fileUrls,
        permanentUrls,
        hasLogo: !!coachingCenter.logo,
        hasMedia: !!coachingCenter.media,
      });
    }
  } catch (error) {
    const coachingCenterId = (coachingCenter as any)._id?.toString() || 'unknown';
    logger.error('Failed to move media files to permanent location', {
      coachingCenterId,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw error, just log it - coaching center is already created
    // But we should still try to continue
  }
};

