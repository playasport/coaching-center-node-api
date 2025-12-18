import { CoachingCenterModel, CoachingCenter } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { Types } from 'mongoose';
import * as commonService from '../common/coachingCenterCommon.service';
import type { AdminCoachingCenterCreateInput } from '../../validations/coachingCenter.validation';
import { SportModel } from '../../models/sport.model';
import { UserModel } from '../../models/user.model';
import { RoleModel, DefaultRoles } from '../../models/role.model';
import { hashPassword } from '../../utils/password';
import { v4 as uuidv4 } from 'uuid';

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
 * Get all coaching centers for admin view with filters
 */
export const getAllCoachingCenters = async (
  page: number = 1,
  limit: number = 10,
  filters: {
    userId?: string;
    status?: string;
    search?: string;
    sportId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<AdminPaginatedResult<CoachingCenter>> => {
  try {
    const skip = (page - 1) * limit;
    const query: any = { is_deleted: false };

    // Apply filters
    if (filters.userId) {
      const userObjectId = await getUserObjectId(filters.userId);
      if (userObjectId) {
        query.user = userObjectId;
      }
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      query.is_active = filters.isActive;
    }

    if (filters.sportId) {
      query.sports = new Types.ObjectId(filters.sportId);
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { center_name: searchRegex },
        { mobile_number: searchRegex },
        { email: searchRegex }
      ];
    }

    // Handle sorting
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    const [coachingCenters, total] = await Promise.all([
      CoachingCenterModel.find(query)
        .populate('user', 'firstName lastName email mobile')
        .populate('sports', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CoachingCenterModel.countDocuments(query),
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
 * Get coaching centers by academy owner ID for admin
 */
export const getCoachingCentersByUserId = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<AdminPaginatedResult<CoachingCenter>> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) throw new ApiError(404, t('auth.user.notFound'));

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [coachingCenters, total] = await Promise.all([
      CoachingCenterModel.find({ user: userObjectId, is_deleted: false })
        .populate('user', 'firstName lastName email mobile')
        .populate('sports', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CoachingCenterModel.countDocuments({ user: userObjectId, is_deleted: false }),
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
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to fetch coaching centers by user ID:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Create coaching center by admin on behalf of a user
 */
export const createCoachingCenterByAdmin = async (
  data: AdminCoachingCenterCreateInput
): Promise<CoachingCenter> => {
  try {
    // 1. Handle Academy User creation/lookup
    const { academy_owner } = data;
    const academyRole = await RoleModel.findOne({ name: DefaultRoles.ACADEMY });
    if (!academyRole) throw new ApiError(500, 'Academy role not found in system');

    // Check if user already exists with this email or mobile
    let user = await UserModel.findOne({
      $or: [
        { email: academy_owner.email.toLowerCase() },
        { mobile: academy_owner.mobile }
      ],
      isDeleted: false
    });

    if (!user) {
      // Create new Academy user if not exists
      const defaultPassword = 'Academy@123'; // Default password for admin-created academy
      const hashedPassword = await hashPassword(defaultPassword);
      user = await UserModel.create({
        id: uuidv4(),
        email: academy_owner.email.toLowerCase(),
        mobile: academy_owner.mobile,
        firstName: academy_owner.firstName,
        lastName: academy_owner.lastName ?? null,
        password: hashedPassword,
        roles: [academyRole._id],
        isActive: true,
        isDeleted: false,
      });
    }

    const userObjectId = user._id;

    // 2. Validate sports
    const sportIds = data.sports ? data.sports.map(id => new Types.ObjectId(id)) : [];
    if (sportIds.length > 0) {
      const sportsCount = await SportModel.countDocuments({ _id: { $in: sportIds } });
      if (sportsCount !== (data.sports?.length || 0)) throw new ApiError(400, t('coachingCenter.sports.invalid'));
    }

    // 3. Resolve facilities
    const facilityIds = data.facility ? await commonService.resolveFacilities(data.facility) : [];

    // 4. Prepare data
    const sanitizedData = { ...data };
    const coachingCenterData: any = {
      ...sanitizedData,
      user: userObjectId,
      sports: sportIds,
      facility: facilityIds,
      sport_details: (sanitizedData.sport_details || []).map(sd => ({
        ...sd,
        sport_id: new Types.ObjectId(sd.sport_id)
      }))
    };
    // Remove academy_owner from coachingCenterData as it's not a field in the model
    delete coachingCenterData.academy_owner;
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
    logger.error('Admin failed to create coaching center:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      data: {
        center_name: data.center_name,
        email: data.email,
        academy_owner_email: data.academy_owner?.email
      }
    });
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
    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const existingCenter = await CoachingCenterModel.findOne(query);
    if (!existingCenter || existingCenter.is_deleted) throw new ApiError(404, t('coachingCenter.notFound'));

    const { bank_information, ...sanitizedData } = data;
    const updates: any = { ...sanitizedData };

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
      commonService.validatePublishStatus({ ...existingCenter.toObject(), ...updates }, true);
    }

    const updatedCenter = await CoachingCenterModel.findOneAndUpdate(
      query,
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
