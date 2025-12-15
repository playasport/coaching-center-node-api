import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CoachingCenterModel, CoachingCenter } from '../models/coachingCenter.model';
import { SportModel } from '../models/sport.model';
import { FacilityModel } from '../models/facility.model';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import type { CoachingCenterCreateInput, CoachingCenterUpdateInput } from '../validations/coachingCenter.validation';
import * as mediaService from './coachingCenterMedia.service';
import { findOrCreateFacility } from './facility.service';
import { enqueueThumbnailGeneration } from '../queue/thumbnailQueue';
import { config } from '../config/env';
import { getUserObjectId } from '../utils/userCache';

export interface CreateCoachingCenterData extends Omit<CoachingCenterCreateInput, 'sports' | 'facility'> {
  sports: Types.ObjectId[];
  facility: Types.ObjectId[];
}

export const createCoachingCenter = async (
  data: CoachingCenterCreateInput,
  userId?: string
): Promise<CoachingCenter> => {
  // ============================================
  // STEP 1: ALL VALIDATIONS FIRST (BEFORE ANY SAVE OR FILE OPERATIONS)
  // ============================================
  
  // Validate user ID is provided
  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }

  // Get user ObjectId from cache or database (optimized with Redis caching)
  const userObjectId = await getUserObjectId(userId);
  if (!userObjectId) {
    throw new ApiError(404, 'User not found');
  }

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

  // Process sport_details - convert sport_id strings to ObjectIds
  let sportDetails: any[] = [];
  if (data.sport_details && Array.isArray(data.sport_details) && data.sport_details.length > 0) {
    sportDetails = data.sport_details.map((detail) => ({
      ...detail,
      sport_id: new Types.ObjectId(detail.sport_id),
    }));
  }

  // ============================================
  // STEP 2: PREPARE DATA (ALL VALIDATIONS PASSED)
  // ============================================
  
  // Prepare data for insertion
  const coachingCenterData: any = {
    ...data,
    user: userObjectId,
    sports: sportIds,
    sport_details: sportDetails,
    facility: facilityIds,
  };
  
  // Remove description if it exists (no longer in schema)
  delete coachingCenterData.description;

  // ============================================
  // STEP 3: SAVE COACHING CENTER (ONLY AFTER ALL VALIDATIONS PASS)
  // ============================================
  
  let coachingCenter: any;
  try {
    // Create and save coaching center
    coachingCenter = new CoachingCenterModel(coachingCenterData);
    await coachingCenter.save();

    logger.info(`Coaching center saved successfully: ${coachingCenter._id} (${coachingCenter.center_name})`);
  } catch (saveError) {
    logger.error('Failed to save coaching center after validations passed', {
      error: saveError instanceof Error ? saveError.message : saveError,
      stack: saveError instanceof Error ? saveError.stack : undefined,
      data: {
        center_name: data.center_name,
        email: data.email,
        mobile_number: data.mobile_number,
      },
    });
    throw new ApiError(500, t('coachingCenter.create.failed'));
  }

  // ============================================
  // STEP 4: MOVE FILES ONLY AFTER SUCCESSFUL SAVE
  // ============================================
  
  // Only move files if status is 'published' AND coaching center was saved successfully
  if (data.status === 'published' && coachingCenter && coachingCenter._id) {
    try {
      logger.info('Moving media files to permanent location for published coaching center', {
        centerId: coachingCenter._id,
        logo: coachingCenter.logo,
        hasDocuments: !!coachingCenter.documents && coachingCenter.documents.length > 0,
      });
      
      // Refetch the coaching center from database to ensure we have the latest data
      const freshCenter = await CoachingCenterModel.findById(coachingCenter._id).lean();
      if (!freshCenter) {
        throw new ApiError(404, 'Coaching center not found after save');
      }
      
      // Convert to CoachingCenter type with proper _id
      const centerForMove: CoachingCenter = {
        ...freshCenter,
        id: freshCenter.id || (freshCenter as any)._id?.toString() || '',
      } as CoachingCenter;
      
      // Move files from temp to permanent - this will also update the database
      await moveMediaFilesToPermanent(centerForMove);
      
      // Wait a bit to ensure database update is complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refetch to get updated URLs with permanent paths
      const updatedCenter = await CoachingCenterModel.findById(coachingCenter._id)
        .populate('sports', 'custom_id name logo is_popular')
        .populate('facility', 'custom_id name description icon')
        .populate({
          path: 'user',
          select: 'id firstName lastName email',
          match: { isDeleted: false },
        })
        .lean();
      
      if (updatedCenter) {
        logger.info(`Coaching center created with permanent URLs: ${coachingCenter._id} (${coachingCenter.center_name})`);
        
        // Verify URLs are permanent
        if (updatedCenter.logo && updatedCenter.logo.includes('temp/')) {
          logger.warn('Logo URL still contains temp/ after move', { logo: updatedCenter.logo });
        }
        
        // Check sport_details for temp URLs
        if (updatedCenter.sport_details && Array.isArray(updatedCenter.sport_details) && updatedCenter.sport_details.length > 0) {
          const firstSportDetail = updatedCenter.sport_details[0];
          if (firstSportDetail.images?.[0]?.url?.includes('temp/')) {
            logger.warn('Image URLs still contain temp/ after move', { 
              firstImage: firstSportDetail.images[0].url 
            });
          }
        }
        
        // Enqueue thumbnail generation for all videos (non-blocking)
        // Don't let thumbnail generation errors break the create flow
        try {
          await enqueueThumbnailGenerationForVideos(updatedCenter);
        } catch (thumbnailError) {
          logger.error('Failed to enqueue thumbnail generation, but coaching center was created', {
            centerId: coachingCenter._id,
            error: thumbnailError instanceof Error ? thumbnailError.message : thumbnailError,
          });
          // Continue - thumbnail generation is non-critical
        }
        
        return updatedCenter;
      } else {
        logger.warn('Could not refetch coaching center after media move, returning original', {
          centerId: coachingCenter._id,
        });
      }
    } catch (postProcessError) {
      logger.error('Error during file moving for published center', {
        centerId: coachingCenter._id,
        error: postProcessError instanceof Error ? postProcessError.message : postProcessError,
        stack: postProcessError instanceof Error ? postProcessError.stack : undefined,
      });
      // Don't fail the entire creation if file moving fails
      // Return the created center with basic population (files remain in temp)
    }
  }

  // ============================================
  // STEP 5: RETURN POPULATED COACHING CENTER
  // ============================================
  
  // Return the created center with populated fields
  try {
    const populatedCenter = await CoachingCenterModel.findById(coachingCenter._id)
      .populate('sports', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .populate({
        path: 'user',
        select: 'id firstName lastName email',
        match: { isDeleted: false },
      })
      .lean();

    return populatedCenter || coachingCenter;
  } catch (populateError) {
    logger.warn('Failed to populate coaching center, returning basic object', {
      centerId: coachingCenter._id,
      error: populateError instanceof Error ? populateError.message : populateError,
    });
    return coachingCenter;
  }
};

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

export const getCoachingCentersByUser = async (
  userId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): Promise<PaginatedResult<CoachingCenter>> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(
      config.pagination.maxLimit,
      Math.max(1, Math.floor(limit))
    );

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Get user ObjectId from cache or database (optimized with Redis caching)
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, 'User not found');
    }

    // Build query - only get non-deleted centers for the user
    const query = {
      user: userObjectId,
      is_deleted: false,
    };

    // Get total count
    const total = await CoachingCenterModel.countDocuments(query);

    // Get paginated results
    const coachingCenters = await CoachingCenterModel.find(query)
      .populate('sports', 'custom_id name logo is_popular')
      .populate('sport_details.sport_id', 'custom_id name logo is_popular')
      .populate('facility', 'custom_id name description icon')
      .populate({
        path: 'user',
        select: 'id firstName lastName email',
        match: { isDeleted: false },
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Coaching centers fetched by user', {
      userId,
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
    });

    return {
      data: coachingCenters,
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
    logger.error('Failed to fetch coaching centers by user:', error);
    throw new ApiError(500, t('coachingCenter.list.failed'));
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

    // Update email if provided
    if (data.email !== undefined) {
      updates.email = data.email;
    }

    // Update mobile number if provided
    if (data.mobile_number !== undefined) {
      updates.mobile_number = data.mobile_number;
    }

    // Handle sport_details update - MERGE instead of replace
    // This ensures removed media items (soft deleted) are not removed from the array
    if (data.sport_details !== undefined) {
      if (data.sport_details && Array.isArray(data.sport_details) && data.sport_details.length > 0) {
        // Merge with existing sport_details instead of replacing
        const existingSportDetails = existingCenter.sport_details || [];
        const updatedSportDetails = [...existingSportDetails];

        // Process each sport detail from update payload
        for (const newDetail of data.sport_details) {
          const sportId = new Types.ObjectId(newDetail.sport_id);
          const existingIndex = updatedSportDetails.findIndex(
            (detail) => detail.sport_id.toString() === sportId.toString()
          );

          if (existingIndex >= 0) {
            // Merge existing sport detail
            const existingDetail = updatedSportDetails[existingIndex];
            
            // Update description if provided
            if (newDetail.description !== undefined) {
              existingDetail.description = newDetail.description;
            }

            // Merge images - add new ones, keep existing ones (don't remove)
            if (newDetail.images && Array.isArray(newDetail.images)) {
              const existingImages = existingDetail.images || [];
              const newImages = [...existingImages];
              
              for (const newImage of newDetail.images) {
                const imageIndex = newImages.findIndex(
                  (img) => img.unique_id === newImage.unique_id
                );
                if (imageIndex >= 0) {
                  // Update existing image
                  newImages[imageIndex] = { ...newImages[imageIndex], ...newImage };
                } else {
                  // Add new image (with defaults if not provided)
                  newImages.push({
                    unique_id: newImage.unique_id || uuidv4(),
                    url: newImage.url,
                    is_active: newImage.is_active !== undefined ? newImage.is_active : true,
                    is_deleted: false,
                    deletedAt: null,
                  });
                }
              }
              existingDetail.images = newImages;
            }

            // Merge videos - add new ones, keep existing ones (don't remove)
            if (newDetail.videos && Array.isArray(newDetail.videos)) {
              const existingVideos = existingDetail.videos || [];
              const newVideos = [...existingVideos];
              
              for (const newVideo of newDetail.videos) {
                const videoIndex = newVideos.findIndex(
                  (video) => video.unique_id === newVideo.unique_id
                );
                if (videoIndex >= 0) {
                  // Update existing video
                  newVideos[videoIndex] = { ...newVideos[videoIndex], ...newVideo };
                } else {
                  // Add new video (with defaults if not provided)
                  newVideos.push({
                    unique_id: newVideo.unique_id || uuidv4(),
                    url: newVideo.url,
                    thumbnail: newVideo.thumbnail || null,
                    is_active: newVideo.is_active !== undefined ? newVideo.is_active : true,
                    is_deleted: false,
                    deletedAt: null,
                  });
                }
              }
              existingDetail.videos = newVideos;
            }

            updatedSportDetails[existingIndex] = existingDetail;
          } else {
            // Add new sport detail
            updatedSportDetails.push({
              sport_id: sportId,
              description: newDetail.description,
              images: (newDetail.images || []).map((img: any) => ({
                unique_id: img.unique_id || uuidv4(),
                url: img.url,
                is_active: img.is_active !== undefined ? img.is_active : true,
                is_deleted: false,
                deletedAt: null,
              })),
              videos: (newDetail.videos || []).map((video: any) => ({
                unique_id: video.unique_id || uuidv4(),
                url: video.url,
                thumbnail: video.thumbnail || null,
                is_active: video.is_active !== undefined ? video.is_active : true,
                is_deleted: false,
                deletedAt: null,
              })),
            });
          }
        }

        updates.sport_details = updatedSportDetails;
      }
      // If empty array is provided explicitly, don't update (keep existing)
      // Only replace if user explicitly wants to clear all sport_details
    }

    // Update other fields
    if (data.center_name !== undefined) updates.center_name = data.center_name;
    if (data.rules_regulation !== undefined) updates.rules_regulation = data.rules_regulation;
    if (data.logo !== undefined) updates.logo = data.logo;
    if (data.age !== undefined) updates.age = data.age;
    if (data.location !== undefined) updates.location = data.location;
    if (data.operational_timing !== undefined) updates.operational_timing = data.operational_timing;
    if (data.documents !== undefined) updates.documents = data.documents;
    if (data.bank_information !== undefined) updates.bank_information = data.bank_information;
    if (data.allowed_genders !== undefined) updates.allowed_genders = data.allowed_genders;
    if (data.allowed_disabled !== undefined) updates.allowed_disabled = data.allowed_disabled;
    if (data.is_only_for_disabled !== undefined) updates.is_only_for_disabled = data.is_only_for_disabled;
    if (data.experience !== undefined) updates.experience = data.experience;
    
    // Handle status change
    const previousStatus = existingCenter.status;
    
    // If status is being changed to 'published', validate all required fields are present
    if (data.status === 'published' && previousStatus !== 'published') {
      // Check if all required fields are present (either from update or existing data)
      const finalData = {
        center_name: data.center_name !== undefined ? data.center_name : existingCenter.center_name,
        mobile_number: data.mobile_number !== undefined ? data.mobile_number : existingCenter.mobile_number,
        email: data.email !== undefined ? data.email : existingCenter.email,
        logo: data.logo !== undefined ? data.logo : existingCenter.logo,
        sports: data.sports !== undefined ? data.sports : existingCenter.sports?.map((s: any) => s.toString()),
        sport_details: data.sport_details !== undefined ? data.sport_details : existingCenter.sport_details,
        age: data.age !== undefined ? data.age : existingCenter.age,
        location: data.location !== undefined ? data.location : existingCenter.location,
        operational_timing: data.operational_timing !== undefined ? data.operational_timing : existingCenter.operational_timing,
        bank_information: data.bank_information !== undefined ? data.bank_information : existingCenter.bank_information,
      };

      // Validate required fields for published status
      if (!finalData.center_name || finalData.center_name.trim().length === 0) {
        throw new ApiError(400, t('coachingCenter.centerName.required'));
      }

      if (!finalData.mobile_number || finalData.mobile_number.length !== 10 || !/^[6-9]\d{9}$/.test(finalData.mobile_number)) {
        throw new ApiError(400, t('validation.mobileNumber.required'));
      }

      if (!finalData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalData.email)) {
        throw new ApiError(400, t('validation.email.required'));
      }

      if (!finalData.logo) {
        throw new ApiError(400, t('coachingCenter.logo.required'));
      }

      if (!finalData.sports || finalData.sports.length === 0) {
        throw new ApiError(400, t('validation.coachingCenter.sports.minOne'));
      }

      if (!finalData.sport_details || finalData.sport_details.length === 0) {
        throw new ApiError(400, t('validation.coachingCenter.sports.minOne'));
      }

      // Validate each sport detail
      if (Array.isArray(finalData.sport_details)) {
        finalData.sport_details.forEach((sportDetail: any, index: number) => {
          if (!sportDetail.sport_id || (typeof sportDetail.sport_id === 'string' && sportDetail.sport_id.trim().length === 0)) {
            throw new ApiError(400, `${t('validation.coachingCenter.sports.required')} (sport_details[${index}].sport_id)`);
          }
          if (!sportDetail.description || sportDetail.description.trim().length === 0) {
            throw new ApiError(400, `${t('coachingCenter.description.required')} (sport_details[${index}].description)`);
          }
          if (sportDetail.description.length < 5) {
            throw new ApiError(400, `${t('coachingCenter.description.minLength')} (sport_details[${index}].description)`);
          }
        });
      }

      if (!finalData.age || !finalData.age.min || !finalData.age.max) {
        throw new ApiError(400, t('coachingCenter.age.minRequired'));
      }

      if (!finalData.location || !finalData.location.latitude || !finalData.location.longitude || !finalData.location.address) {
        throw new ApiError(400, t('coachingCenter.location.latitudeRequired'));
      }

      if (!finalData.location.address.line2 || !finalData.location.address.city || !finalData.location.address.state || !finalData.location.address.pincode) {
        throw new ApiError(400, t('address.line2Required'));
      }

      if (!finalData.operational_timing) {
        throw new ApiError(400, t('coachingCenter.operationalTiming.openingTimeRequired'));
      }

      if (!finalData.bank_information) {
        throw new ApiError(400, t('coachingCenter.bankInformation.bankNameRequired'));
      }
    }
    
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
      .populate({
        path: 'user',
        select: 'id firstName lastName email',
        match: { isDeleted: false },
      })
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
        .populate({
          path: 'user',
          select: 'id firstName lastName email',
          match: { isDeleted: false },
        })
        .lean();
      if (refreshedCenter) {
        logger.info(`Coaching center updated with permanent URLs: ${id} (${updatedCenter.center_name})`);
        // Verify URLs are permanent
        if (refreshedCenter.logo && refreshedCenter.logo.includes('temp/')) {
          logger.warn('Logo URL still contains temp/ after move', { logo: refreshedCenter.logo });
        }
        // Check sport_details for temp URLs
        if (refreshedCenter.sport_details && Array.isArray(refreshedCenter.sport_details) && refreshedCenter.sport_details.length > 0) {
          const firstSportDetail = refreshedCenter.sport_details[0];
          if (firstSportDetail.images?.[0]?.url?.includes('temp/')) {
            logger.warn('Image URLs still contain temp/ after move', { 
              firstImage: firstSportDetail.images[0].url 
            });
          }
        }
        
        // Enqueue thumbnail generation for all videos (non-blocking)
        await enqueueThumbnailGenerationForVideos(refreshedCenter);
        
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
 * Enqueue thumbnail generation for all videos in sport_details
 * This is called after coaching center is published
 */
const enqueueThumbnailGenerationForVideos = async (coachingCenter: CoachingCenter): Promise<void> => {
  try {
    const coachingCenterId = (coachingCenter as any)._id?.toString();
    if (!coachingCenterId) {
      logger.warn('Cannot enqueue thumbnail generation: coaching center ID not found');
      return;
    }

    if (!coachingCenter.sport_details || !Array.isArray(coachingCenter.sport_details)) {
      logger.debug('No sport_details found, skipping thumbnail generation');
      return;
    }

    let videoCount = 0;

    // Iterate through all sport_details and enqueue thumbnail generation for videos
    for (let sportIndex = 0; sportIndex < coachingCenter.sport_details.length; sportIndex++) {
      const sportDetail = coachingCenter.sport_details[sportIndex];
      
      if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
        for (let videoIndex = 0; videoIndex < sportDetail.videos.length; videoIndex++) {
          const video = sportDetail.videos[videoIndex];
          
          // Only generate thumbnail if video has URL and doesn't already have a thumbnail
          if (video.url && !video.is_deleted && !video.thumbnail) {
            await enqueueThumbnailGeneration(
              coachingCenterId,
              video.url,
              {
                videoUniqueId: video.unique_id,
                sportDetailIndex: sportIndex,
                videoIndex: videoIndex,
              }
            );
            videoCount++;
            
            logger.debug('Enqueued thumbnail generation for video', {
              coachingCenterId,
              videoUrl: video.url,
              sportIndex,
              videoIndex,
            });
          }
        }
      }
    }

    if (videoCount > 0) {
      logger.info('Enqueued thumbnail generation for videos', {
        coachingCenterId,
        videoCount,
      });
    } else {
      logger.debug('No videos found for thumbnail generation', { coachingCenterId });
    }
  } catch (error) {
    logger.error('Failed to enqueue thumbnail generation for videos', {
      coachingCenterId: (coachingCenter as any)._id?.toString(),
      error: error instanceof Error ? error.message : error,
    });
    // Don't throw - thumbnail generation failure shouldn't break the main flow
  }
};

/**
 * Move all media files from temp to permanent locations
 */
const moveMediaFilesToPermanent = async (coachingCenter: CoachingCenter): Promise<void> => {
  try {
    const fileUrls: string[] = [];
    // Extract ID - handle both _id (MongoDB) and id (custom) fields
    const coachingCenterId = (coachingCenter as any)._id || (coachingCenter as any).id || null;
    
    if (!coachingCenterId) {
      logger.error('Coaching center ID not found', { coachingCenter });
      throw new Error('Coaching center ID is required to move files');
    }
    
    const coachingCenterIdStr = coachingCenterId.toString ? coachingCenterId.toString() : String(coachingCenterId);

    logger.info('Starting media file move to permanent location', {
      coachingCenterId: coachingCenterIdStr,
      hasLogo: !!coachingCenter.logo,
      hasDocuments: !!coachingCenter.documents && coachingCenter.documents.length > 0,
    });

    // Collect logo URL
    if (coachingCenter.logo) {
      fileUrls.push(coachingCenter.logo);
      logger.info('Added logo URL to move list', { url: coachingCenter.logo });
    }

    // Collect media URLs from sport_details (images and videos)
    if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
      coachingCenter.sport_details.forEach((sportDetail) => {
        // Collect images from sport_details
        if (sportDetail.images && Array.isArray(sportDetail.images)) {
          sportDetail.images.forEach((img: any) => {
            if (img && img.url && !img.is_deleted) {
              fileUrls.push(img.url);
              logger.info('Added sport image URL to move list', { url: img.url, sportId: sportDetail.sport_id });
            }
          });
        }
        // Collect videos from sport_details
        if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
          sportDetail.videos.forEach((vid: any) => {
            if (vid && vid.url && !vid.is_deleted) {
              fileUrls.push(vid.url);
              logger.info('Added sport video URL to move list', { url: vid.url, sportId: sportDetail.sport_id });
            }
            // Also collect thumbnail if it exists
            if (vid && vid.thumbnail && !vid.is_deleted) {
              fileUrls.push(vid.thumbnail);
              logger.info('Added video thumbnail URL to move list', { url: vid.thumbnail, sportId: sportDetail.sport_id });
            }
          });
        }
      });
    }

    // Collect general documents
    if (coachingCenter.documents && Array.isArray(coachingCenter.documents)) {
      coachingCenter.documents.forEach((doc) => {
        if (doc && doc.url && !doc.is_deleted) {
          fileUrls.push(doc.url);
          logger.info('Added document URL to move list', { url: doc.url });
        }
      });
    }

    if (fileUrls.length === 0) {
      logger.warn('No media files found to move to permanent location', { coachingCenterId: coachingCenterIdStr });
      return;
    }

    logger.info(`Moving ${fileUrls.length} media files to permanent locations`, {
      coachingCenterId: coachingCenterIdStr,
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
      coachingCenterId: coachingCenterIdStr,
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

    // Update sport_details URLs - preserve entire sport_details structure
    if (coachingCenter.sport_details && Array.isArray(coachingCenter.sport_details)) {
      const sportDetailsUpdates = coachingCenter.sport_details.map((sportDetail: any) => {
        const updatedDetail: any = {
          ...sportDetail,
          images: [],
          videos: [],
        };

        // Update images using URL map
        if (Array.isArray(sportDetail.images)) {
          updatedDetail.images = sportDetail.images.map((img: any) => {
            if (img && img.url && !img.is_deleted) {
              const permanentUrl = urlMap.get(img.url);
              if (permanentUrl) {
                logger.info('Updating sport image URL', {
                  oldUrl: img.url,
                  newUrl: permanentUrl,
                  sportId: sportDetail.sport_id,
                });
                return { ...img, url: permanentUrl };
              } else {
                logger.warn('Sport image URL not found in URL map', {
                  imageUrl: img.url,
                  sportId: sportDetail.sport_id,
                });
              }
            }
            return img;
          });
        }

        // Update videos using URL map (including thumbnails)
        if (Array.isArray(sportDetail.videos)) {
          updatedDetail.videos = sportDetail.videos.map((vid: any) => {
            const updatedVideo: any = { ...vid };
            
            if (vid && vid.url && !vid.is_deleted) {
              const permanentUrl = urlMap.get(vid.url);
              if (permanentUrl) {
                logger.info('Updating sport video URL', {
                  oldUrl: vid.url,
                  newUrl: permanentUrl,
                  sportId: sportDetail.sport_id,
                });
                updatedVideo.url = permanentUrl;
              } else {
                logger.warn('Sport video URL not found in URL map', {
                  videoUrl: vid.url,
                  sportId: sportDetail.sport_id,
                });
              }
            }
            
            // Update thumbnail if it exists
            if (vid && vid.thumbnail && !vid.is_deleted) {
              const permanentThumbnailUrl = urlMap.get(vid.thumbnail);
              if (permanentThumbnailUrl) {
                logger.info('Updating video thumbnail URL', {
                  oldUrl: vid.thumbnail,
                  newUrl: permanentThumbnailUrl,
                  sportId: sportDetail.sport_id,
                });
                updatedVideo.thumbnail = permanentThumbnailUrl;
              } else {
                logger.warn('Video thumbnail URL not found in URL map', {
                  thumbnailUrl: vid.thumbnail,
                  sportId: sportDetail.sport_id,
                });
              }
            }
            
            return updatedVideo;
          });
        }

        return updatedDetail;
      });

      updates.sport_details = sportDetailsUpdates;
      logger.info('Prepared sport_details updates', {
        sportDetailsCount: sportDetailsUpdates.length,
      });
    }

    // Update general documents
    if (coachingCenter.documents && Array.isArray(coachingCenter.documents)) {
      updates.documents = coachingCenter.documents.map((doc) => {
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

      logger.info('Prepared documents updates', {
        documentsCount: updates.documents.length,
      });
    }

    // Update coaching center with permanent URLs
    if (Object.keys(updates).length > 0) {
      // Use the ID we extracted at the beginning
      if (coachingCenterId) {
        logger.info('Updating coaching center with permanent URLs', {
          coachingCenterId: coachingCenterId.toString(),
          updatesKeys: Object.keys(updates),
          hasLogo: !!updates.logo,
          hasDocuments: !!updates.documents && updates.documents.length > 0,
        });
        
        // Use $set to update nested fields properly
        const updateQuery: any = {};
        if (updates.logo) {
          updateQuery['logo'] = updates.logo;
        }
        if (updates.sport_details) {
          // Update entire sport_details array
          updateQuery['sport_details'] = updates.sport_details;
        }
        if (updates.documents) {
          // Update documents array
          updateQuery['documents'] = updates.documents;
        }
        
        logger.info('Update query prepared', {
          coachingCenterId: coachingCenterId.toString(),
          updateQueryKeys: Object.keys(updateQuery),
          logoUpdate: updateQuery.logo,
          sportDetailsUpdate: {
            count: updateQuery.sport_details?.length || 0,
            firstSportImagesCount: updateQuery.sport_details?.[0]?.images?.length || 0,
            firstSportVideosCount: updateQuery.sport_details?.[0]?.videos?.length || 0,
          },
          documentsUpdate: {
            documentsCount: updateQuery.documents?.length || 0,
          },
        });
        
        // Log what we're updating
        logger.info('URLs mapping', {
          fileUrlsCount: fileUrls.length,
          permanentUrlsCount: permanentUrls.length,
          fileUrls: fileUrls.slice(0, 3), // First 3 for debugging
          permanentUrls: permanentUrls.slice(0, 3), // First 3 for debugging
        });
        
        // Convert ID to ObjectId if it's a string
        let centerObjectId: Types.ObjectId;
        if (coachingCenterId instanceof Types.ObjectId) {
          centerObjectId = coachingCenterId;
        } else if (Types.ObjectId.isValid(coachingCenterId)) {
          centerObjectId = new Types.ObjectId(coachingCenterId);
        } else {
          logger.error('Invalid coaching center ID format', {
            coachingCenterId,
            coachingCenterIdStr,
          });
          throw new Error('Invalid coaching center ID format');
        }
        
        // Use findByIdAndUpdate with $set to ensure proper update
        // This ensures the update is atomic and properly handles nested arrays
        logger.info('Executing database update', {
          centerObjectId: centerObjectId.toString(),
          updateQueryKeys: Object.keys(updateQuery),
        });
        
        const updateResult = await CoachingCenterModel.findByIdAndUpdate(
          centerObjectId,
          { $set: updateQuery },
          { new: true, runValidators: false } // new: true returns updated document
        );
        
        if (!updateResult) {
          logger.error('Failed to update coaching center with permanent URLs - updateResult is null', {
            coachingCenterId: coachingCenterIdStr,
            centerObjectId: centerObjectId.toString(),
            updateQuery,
          });
          throw new Error('Failed to update coaching center with permanent URLs');
        }
        
        logger.info(`Database update completed - checking result`, {
          coachingCenterId: coachingCenterIdStr,
          filesMoved: permanentUrls.length,
          updateResultLogo: updateResult.logo,
          updateResultLogoIsTemp: updateResult.logo?.includes('temp/') || false,
          updatedLogo: !!updateResult.logo,
          updatedDocuments: !!updateResult.documents && updateResult.documents.length > 0,
        });
        
        // Convert to plain object for logging
        const updateResultPlain = updateResult.toObject ? updateResult.toObject() : updateResult;
        
        // Verify the update by checking the saved document
        logger.info('Verified update - permanent URLs saved', {
          coachingCenterId: coachingCenterIdStr,
          logo: updateResultPlain.logo,
          logoIsTemp: updateResultPlain.logo?.includes('temp/') || false,
          sportDetailsCount: updateResultPlain.sport_details?.length || 0,
          firstSportImagesCount: updateResultPlain.sport_details?.[0]?.images?.length || 0,
          firstSportVideosCount: updateResultPlain.sport_details?.[0]?.videos?.length || 0,
          firstImageUrl: updateResultPlain.sport_details?.[0]?.images?.[0]?.url || 'none',
          firstImageIsTemp: updateResultPlain.sport_details?.[0]?.images?.[0]?.url?.includes('temp/') || false,
          firstVideoUrl: updateResultPlain.sport_details?.[0]?.videos?.[0]?.url || 'none',
          firstVideoIsTemp: updateResultPlain.sport_details?.[0]?.videos?.[0]?.url?.includes('temp/') || false,
          documentsCount: updateResultPlain.documents?.length || 0,
          firstDocUrl: updateResultPlain.documents?.[0]?.url || 'none',
          firstDocIsTemp: updateResultPlain.documents?.[0]?.url?.includes('temp/') || false,
        });
        
        // Double-check by fetching fresh from database after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const verifyCenter = await CoachingCenterModel.findById(centerObjectId).lean();
        if (verifyCenter) {
          // Check for temp URLs in logo, sport_details, and media.documents
          let hasTempUrls = false;
          const tempImages: string[] = [];
          const tempVideos: string[] = [];
          const tempDocs: string[] = [];

          if (verifyCenter.logo && verifyCenter.logo.includes('temp/')) {
            hasTempUrls = true;
          }

          // Check sport_details for temp URLs
          if (verifyCenter.sport_details && Array.isArray(verifyCenter.sport_details)) {
            verifyCenter.sport_details.forEach((sportDetail: any) => {
              if (sportDetail.images && Array.isArray(sportDetail.images)) {
                sportDetail.images.forEach((img: any) => {
                  if (img.url && img.url.includes('temp/')) {
                    hasTempUrls = true;
                    tempImages.push(img.url);
                  }
                });
              }
              if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                sportDetail.videos.forEach((vid: any) => {
                  if (vid.url && vid.url.includes('temp/')) {
                    hasTempUrls = true;
                    tempVideos.push(vid.url);
                  }
                  if (vid.thumbnail && vid.thumbnail.includes('temp/')) {
                    hasTempUrls = true;
                    tempVideos.push(vid.thumbnail);
                  }
                });
              }
            });
          }

          // Check documents for temp URLs
          if (verifyCenter.documents && Array.isArray(verifyCenter.documents)) {
            verifyCenter.documents.forEach((doc: any) => {
              if (doc.url && doc.url.includes('temp/')) {
                hasTempUrls = true;
                tempDocs.push(doc.url);
              }
            });
          }
          
          if (hasTempUrls) {
            logger.error('CRITICAL: Temp URLs still present after update!', {
              coachingCenterId: coachingCenterId.toString(),
              logo: verifyCenter.logo,
              tempImages,
              tempVideos,
              tempDocs,
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
        hasDocuments: !!coachingCenter.documents && coachingCenter.documents.length > 0,
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

export const toggleCoachingCenterStatus = async (id: string): Promise<CoachingCenter | null> => {
  try {
    // Check if coaching center exists
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    if (existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    // Toggle is_active status
    const newActiveStatus = !existingCenter.is_active;

    // Update the is_active status
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

    if (!updatedCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    logger.info('Coaching center active status toggled', {
      id,
      previousStatus: existingCenter.is_active,
      newStatus: newActiveStatus,
    });

    return updatedCenter;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to toggle coaching center active status:', error);
    throw new ApiError(500, t('coachingCenter.toggleStatus.failed'));
  }
};

export const deleteCoachingCenter = async (id: string): Promise<void> => {
  try {
    // Check if coaching center exists
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    if (existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    // Soft delete: set is_deleted to true and deletedAt to current date
    await CoachingCenterModel.findByIdAndUpdate(
      id,
      {
        is_deleted: true,
        deletedAt: new Date(),
      },
      { runValidators: true }
    );

    logger.info('Coaching center soft deleted successfully', {
      coachingCenterId: id,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to delete coaching center:', error);
    throw new ApiError(500, t('coachingCenter.delete.failed'));
  }
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
      (detail) => detail.sport_id.toString() === sportId && detail
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

