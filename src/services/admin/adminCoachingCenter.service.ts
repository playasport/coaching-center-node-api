import { CoachingCenterModel, CoachingCenter } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { Types } from 'mongoose';
import * as commonService from '../common/coachingCenterCommon.service';
import type { CoachingCenterCreateInput } from '../../validations/coachingCenter.validation';
import { SportModel } from '../../models/sport.model';

export interface AdminPaginatedResult<T> {
  coachingCenters: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get all coaching centers for admin view
 */
export const getAllCoachingCenters = async (
  page: number = 1,
  limit: number = 10
): Promise<AdminPaginatedResult<CoachingCenter>> => {
  try {
    const skip = (page - 1) * limit;

    const [coachingCenters, total] = await Promise.all([
      CoachingCenterModel.find({ is_deleted: false })
        .populate('user', 'firstName lastName email')
        .populate('sports', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoachingCenterModel.countDocuments({ is_deleted: false }),
    ]);

    return {
      coachingCenters: coachingCenters as CoachingCenter[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Admin failed to fetch all coaching centers:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create coaching center by admin on behalf of a user
 */
export const createCoachingCenterByAdmin = async (
  data: CoachingCenterCreateInput,
  userId: string
): Promise<CoachingCenter> => {
  try {
    // 1. Validate user
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) throw new ApiError(404, 'User (Academy) not found');

    // 2. Validate sports
    const sportIds = data.sports ? data.sports.map(id => new Types.ObjectId(id)) : [];
    if (sportIds.length > 0) {
      const sportsCount = await SportModel.countDocuments({ _id: { $in: sportIds } });
      if (sportsCount !== (data.sports?.length || 0)) throw new ApiError(400, t('coachingCenter.sports.invalid'));
    }

    // 3. Resolve facilities
    const facilityIds = data.facility ? await commonService.resolveFacilities(data.facility) : [];

    // 4. Prepare data
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

    // 5. Save
    const coachingCenter = new CoachingCenterModel(coachingCenterData);
    await coachingCenter.save();

    // 6. Handle media move if published
    if (data.status === 'published') {
      await commonService.moveMediaFilesToPermanent(coachingCenter.toObject());
      await commonService.enqueueThumbnailGenerationForVideos(coachingCenter.toObject());
    }

    return await commonService.getCoachingCenterById(coachingCenter._id.toString()) as CoachingCenter;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to create coaching center:', error);
    throw new ApiError(500, t('coachingCenter.create.failed'));
  }
};

/**
 * Update coaching center by admin
 */
export const updateCoachingCenterByAdmin = async (
  id: string,
  data: any
): Promise<CoachingCenter | null> => {
  try {
    const existingCenter = await CoachingCenterModel.findById(id);
    if (!existingCenter || existingCenter.is_deleted) throw new ApiError(404, t('coachingCenter.notFound'));

    const updates: any = { ...data };

    // If userId is provided, update ownership (admin only privilege)
    if (data.userId) {
      const userObjectId = await getUserObjectId(data.userId);
      if (!userObjectId) throw new ApiError(404, 'User not found');
      updates.user = userObjectId;
      delete updates.userId;
    }

    // Resolve sports if provided
    if (data.sports) {
      updates.sports = data.sports.map((sid: string) => new Types.ObjectId(sid));
    }

    // Resolve facilities if provided
    if (data.facility) {
      updates.facility = await commonService.resolveFacilities(data.facility);
    }

    // If status changed to published
    if (data.status === 'published' && existingCenter.status !== 'published') {
      commonService.validatePublishStatus({ ...existingCenter.toObject(), ...updates });
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
    logger.error('Admin failed to update coaching center:', error);
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};
