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

export interface CoachingCenterListItem {
  id: string;
  center_name: string;
  email: string;
  mobile_number: string;
  logo: string | null;
  status: string;
  is_active: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
  };
  sports: Array<{
    id: string;
    name: string;
  }>;
  location: {
    latitude: number;
    longitude: number;
    address: {
      line1: string | null;
      line2: string;
      city: string;
      state: string;
      country: string | null;
      pincode: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CoachingCenterStats {
  total: number;
  byStatus: Record<string, number>;
  byActiveStatus: {
    active: number;
    inactive: number;
  };
  bySport: Record<string, number>;
  byCity: Record<string, number>;
  byState: Record<string, number>;
  allowingDisabled: number;
  onlyForDisabled: number;
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
): Promise<AdminPaginatedResult<CoachingCenterListItem>> => {
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
        .select('id center_name email mobile_number logo status is_active user sports location createdAt updatedAt')
        .populate('user', 'id firstName lastName email mobile')
        .populate('sports', 'id name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CoachingCenterModel.countDocuments(query),
    ]);

    // Transform to simplified list format
    const transformedCenters: CoachingCenterListItem[] = coachingCenters.map((center: any) => ({
      id: center.id,
      center_name: center.center_name,
      email: center.email,
      mobile_number: center.mobile_number,
      logo: center.logo || null,
      status: center.status,
      is_active: center.is_active,
      user: center.user ? {
        id: center.user.id || center.user._id?.toString() || '',
        firstName: center.user.firstName || '',
        lastName: center.user.lastName || '',
        email: center.user.email || '',
        mobile: center.user.mobile || '',
      } : {
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
      },
      sports: (center.sports || []).map((sport: any) => ({
        id: sport.id || sport._id?.toString() || '',
        name: sport.name || '',
      })),
      location: center.location ? {
        latitude: center.location.latitude,
        longitude: center.location.longitude,
        address: {
          line1: center.location.address?.line1 || null,
          line2: center.location.address?.line2 || '',
          city: center.location.address?.city || '',
          state: center.location.address?.state || '',
          country: center.location.address?.country || null,
          pincode: center.location.address?.pincode || '',
        },
      } : {
        latitude: 0,
        longitude: 0,
        address: {
          line1: null,
          line2: '',
          city: '',
          state: '',
          country: null,
          pincode: '',
        },
      },
      createdAt: center.createdAt,
      updatedAt: center.updatedAt,
    }));

    return {
      coachingCenters: transformedCenters,
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
      coachingCenters: filteredCenters as CoachingCenter[],
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
 * @param data - Coaching center data
 * @param adminUserId - ID of the admin user creating this center (optional)
 */
export const createCoachingCenterByAdmin = async (
  data: AdminCoachingCenterCreateInput,
  adminUserId?: string
): Promise<CoachingCenter> => {
  try {
    // 1. Handle Academy User creation/lookup
    let userObjectId: Types.ObjectId;

    if (data.owner_id) {
      // If owner_id is provided, use it directly
      const ownerObjectId = await getUserObjectId(data.owner_id);
      if (!ownerObjectId) {
        throw new ApiError(404, 'Academy owner user not found');
      }

      // Verify the user exists and is not deleted
      const ownerUser = await UserModel.findOne({ _id: ownerObjectId, isDeleted: false });
      if (!ownerUser) {
        throw new ApiError(404, 'Academy owner user not found or has been deleted');
      }

      userObjectId = ownerObjectId;
    } else {
      // Use academy_owner details to create or find user
      const { academy_owner } = data;
      if (!academy_owner) {
        throw new ApiError(400, 'Either owner_id or academy_owner must be provided');
      }

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

      userObjectId = user._id;
    }

    // 2. Validate sports
    const sportIds = data.sports ? data.sports.map(id => new Types.ObjectId(id)) : [];
    if (sportIds.length > 0) {
      const sportsCount = await SportModel.countDocuments({ _id: { $in: sportIds } });
      if (sportsCount !== (data.sports?.length || 0)) throw new ApiError(400, t('coachingCenter.sports.invalid'));
    }

    // 3. Resolve facilities
    const facilityIds = data.facility ? await commonService.resolveFacilities(data.facility) : [];

    // 4. Get admin user ObjectId if provided (for addedBy field)
    let addedByObjectId: Types.ObjectId | null = null;
    if (adminUserId) {
      const adminUserObjectId = await getUserObjectId(adminUserId);
      if (adminUserObjectId) {
        addedByObjectId = adminUserObjectId;
      }
    }

    // 5. Prepare data
    const sanitizedData = { ...data };
    const coachingCenterData: any = {
      ...sanitizedData,
      user: userObjectId,
      addedBy: addedByObjectId,
      sports: sportIds,
      facility: facilityIds,
      sport_details: (sanitizedData.sport_details || []).map(sd => ({
        ...sd,
        sport_id: new Types.ObjectId(sd.sport_id)
      }))
    };
    // Remove academy_owner and owner_id from coachingCenterData as they're not fields in the model
    delete coachingCenterData.academy_owner;
    delete coachingCenterData.owner_id;
    delete coachingCenterData.description;

    // 6. Save
    const coachingCenter = new CoachingCenterModel(coachingCenterData);
    await coachingCenter.save();

    // 7. Handle media move if published
    if (data.status === 'published') {
      try {
        // Convert to plain object for media processing
        const coachingCenterObj = coachingCenter.toObject({ flattenObjectIds: false });
        await commonService.moveMediaFilesToPermanent(coachingCenterObj as CoachingCenter);
        await commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj as CoachingCenter);
      } catch (mediaError) {
        logger.error('Failed to move media files during creation:', {
          error: mediaError instanceof Error ? mediaError.message : mediaError,
          stack: mediaError instanceof Error ? mediaError.stack : undefined,
          coachingCenterId: coachingCenter._id.toString()
        });
        // Don't fail the entire creation if media move fails, but log it
        // The media files can be moved later
      }
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

    const updatedCenter = await CoachingCenterModel.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    // Handle media file movement and thumbnail generation
    // If status changed to published OR center is already published (checking for new temp files)
    const isNowPublished = data.status === 'published' && existingCenter.status !== 'published';
    const wasAlreadyPublished = existingCenter.status === 'published';
    
    if (isNowPublished || wasAlreadyPublished) {
      // If status just changed to published, validate first
      if (isNowPublished) {
        commonService.validatePublishStatus({ ...existingCenter.toObject(), ...updates }, true);
      }
      
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
    logger.error('Admin failed to update coaching center:', error);
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};

/**
 * Get coaching center statistics for admin dashboard
 */
export const getCoachingCenterStats = async (params?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  status?: string;
  isActive?: boolean;
  sportId?: string;
  search?: string;
}): Promise<CoachingCenterStats> => {
  try {
    const dateQuery: any = {
      is_deleted: false,
    };
    
    // Apply date filters
    if (params?.startDate || params?.endDate) {
      dateQuery.createdAt = {};
      if (params.startDate) {
        dateQuery.createdAt.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = endDate;
      }
    }

    // Apply userId filter
    if (params?.userId) {
      const userObjectId = await getUserObjectId(params.userId);
      if (userObjectId) {
        dateQuery.user = userObjectId;
      }
    }

    // Apply status filter
    if (params?.status) {
      dateQuery.status = params.status;
    }

    // Apply isActive filter
    if (params?.isActive !== undefined) {
      dateQuery.is_active = params.isActive;
    }

    // Apply sportId filter
    if (params?.sportId) {
      dateQuery.sports = new Types.ObjectId(params.sportId);
    }

    // Apply search filter
    if (params?.search) {
      const searchRegex = new RegExp(params.search, 'i');
      dateQuery.$or = [
        { center_name: searchRegex },
        { mobile_number: searchRegex },
        { email: searchRegex }
      ];
    }

    // Get total count
    const total = await CoachingCenterModel.countDocuments(dateQuery);

    // Get counts by status
    const statusCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item: any) => {
      byStatus[item._id] = item.count;
    });

    // Get counts by active status
    const activeCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$is_active',
          count: { $sum: 1 },
        },
      },
    ]);

    const byActiveStatus = {
      active: activeCounts.find((item: any) => item._id === true)?.count || 0,
      inactive: activeCounts.find((item: any) => item._id === false)?.count || 0,
    };

    // Get counts by sport (unwind sports array)
    const sportCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      { $unwind: '$sports' },
      {
        $group: {
          _id: '$sports',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'sports',
          localField: '_id',
          foreignField: '_id',
          as: 'sport',
        },
      },
      { $unwind: '$sport' },
      {
        $project: {
          sportName: '$sport.name',
          count: 1,
        },
      },
    ]);

    const bySport: Record<string, number> = {};
    sportCounts.forEach((item: any) => {
      bySport[item.sportName] = item.count;
    });

    // Get counts by city
    const cityCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$location.address.city',
          count: { $sum: 1 },
        },
      },
    ]);

    const byCity: Record<string, number> = {};
    cityCounts.forEach((item: any) => {
      if (item._id) {
        byCity[item._id] = item.count;
      }
    });

    // Get counts by state
    const stateCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$location.address.state',
          count: { $sum: 1 },
        },
      },
    ]);

    const byState: Record<string, number> = {};
    stateCounts.forEach((item: any) => {
      if (item._id) {
        byState[item._id] = item.count;
      }
    });

    // Get centers allowing disabled participants
    const disabledCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$allowed_disabled',
          count: { $sum: 1 },
        },
      },
    ]);

    const allowingDisabled = disabledCounts.find((item: any) => item._id === true)?.count || 0;

    // Get centers only for disabled
    const onlyDisabledCounts = await CoachingCenterModel.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$is_only_for_disabled',
          count: { $sum: 1 },
        },
      },
    ]);

    const onlyForDisabled = onlyDisabledCounts.find((item: any) => item._id === true)?.count || 0;

    return {
      total,
      byStatus,
      byActiveStatus,
      bySport,
      byCity,
      byState,
      allowingDisabled,
      onlyForDisabled,
    };
  } catch (error) {
    logger.error('Admin failed to get coaching center stats:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};
