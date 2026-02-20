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
import { AdminUserModel } from '../../models/adminUser.model';
import { RoleModel, DefaultRoles } from '../../models/role.model';
import { hashPassword } from '../../utils/password';
import { v4 as uuidv4 } from 'uuid';
import { DefaultRoles as DefaultRolesEnum } from '../../enums/defaultRoles.enum';
import { AdminApproveStatus } from '../../enums/adminApprove.enum';
import { EmployeeModel } from '../../models/employee.model';
import { config } from '../../config/env';
import { enqueueMediaMove } from '../../queue/mediaMoveQueue';
import type { CreateNotificationInput } from '../common/notification.service';
import { getCachedCoachingCentersList, cacheCoachingCentersList, invalidateCoachingCentersListCache } from '../../utils/coachingCenterCache';

/**
 * Helper to get center ObjectId from either custom ID (UUID) or MongoDB ObjectId
 */
const getCenterObjectId = async (centerId: string): Promise<Types.ObjectId | null> => {
  try {
    // If it's a valid ObjectId, use it directly
    if (Types.ObjectId.isValid(centerId) && centerId.length === 24) {
      const center = await CoachingCenterModel.findById(centerId).select('_id').lean();
      if (center) {
        return center._id as Types.ObjectId;
      }
    }

    // Otherwise, try to find by custom ID (UUID)
    const center = await CoachingCenterModel.findOne({ id: centerId, is_deleted: false })
      .select('_id')
      .lean();

    return center ? (center._id as Types.ObjectId) : null;
  } catch (error) {
    logger.error('Failed to get center ObjectId:', error);
    return null;
  }
};

/** Supported date range keys for filtering by createdAt */
export type DateRangeFilterKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days';

/**
 * Get start and end UTC dates for a date range key.
 * All boundaries are in UTC (start of day 00:00:00.000, end of day 23:59:59.999).
 * this_week = Monday 00:00 to Sunday 23:59:59 of current week (ISO week).
 * this_month = 1st 00:00 to last day 23:59:59 of current month.
 */
export const getDateRangeForKey = (
  key: DateRangeFilterKey
): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  const setStartOfDay = (d: Date) => {
    d.setUTCHours(0, 0, 0, 0);
  };
  const setEndOfDay = (d: Date) => {
    d.setUTCHours(23, 59, 59, 999);
  };

  switch (key) {
    case 'today': {
      setStartOfDay(start);
      setEndOfDay(end);
      return { start, end };
    }
    case 'yesterday': {
      start.setUTCDate(start.getUTCDate() - 1);
      end.setUTCDate(end.getUTCDate() - 1);
      setStartOfDay(start);
      setEndOfDay(end);
      return { start, end };
    }
    case 'this_week': {
      const day = start.getUTCDay();
      const daysToMonday = day === 0 ? 6 : day - 1;
      start.setUTCDate(start.getUTCDate() - daysToMonday);
      setStartOfDay(start);
      end.setTime(start.getTime());
      end.setUTCDate(end.getUTCDate() + 6);
      setEndOfDay(end);
      return { start, end };
    }
    case 'this_month': {
      start.setUTCDate(1);
      setStartOfDay(start);
      end.setUTCMonth(end.getUTCMonth() + 1, 0);
      setEndOfDay(end);
      return { start, end };
    }
    case 'last_7_days': {
      end.setUTCHours(23, 59, 59, 999);
      start.setUTCDate(start.getUTCDate() - 6);
      setStartOfDay(start);
      return { start, end };
    }
    case 'last_30_days': {
      end.setUTCHours(23, 59, 59, 999);
      start.setUTCDate(start.getUTCDate() - 29);
      setStartOfDay(start);
      return { start, end };
    }
    default: {
      setStartOfDay(start);
      setEndOfDay(end);
      return { start, end };
    }
  }
};

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
  _id: string;
  id: string;
  center_name: string;
  email: string;
  mobile_number: string;
  logo: string | null;
  status: string;
  is_active: boolean;
  approval_status: 'approved' | 'rejected' | 'pending_approval';
  reject_reason?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
  };
  added_by: string | null; // Admin user name who added the center (list only)
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
  byApprovalStatus: {
    approved: number;
    rejected: number;
    pending_approval: number;
  };
  bySport: Record<string, number>;
  byCity: Record<string, number>;
  byState: Record<string, number>;
  allowingDisabled: number;
  onlyForDisabled: number;
  onlyForFemale: number;
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
    isApproved?: boolean;
    approvalStatus?: 'approved' | 'rejected' | 'pending_approval'; // Direct approval status filter
    addedById?: string; // Filter by admin/agent user ID (who added the center)
    onlyForFemale?: boolean; // Academies only for female candidates (allowed_genders === ['female'])
    allowingDisabled?: boolean; // Academies that allow disabled participants
    onlyForDisabled?: boolean; // Academies only for disabled participants
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    /** Filter by createdAt: today, yesterday, this_week, this_month, last_7_days, last_30_days */
    dateRange?: DateRangeFilterKey;
  } = {},
  currentUserId?: string,
  currentUserRole?: string
): Promise<AdminPaginatedResult<CoachingCenterListItem>> => {
  try {
    const skip = (page - 1) * limit;
    const query: any = { is_deleted: false };

    // If user is an agent, only show centers added by them
    if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
      // Get AdminUser ObjectId since addedBy references AdminUser model
      const adminUser = await AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
        .select('_id')
        .lean();
      
      if (adminUser && adminUser._id) {
        query.addedBy = adminUser._id as Types.ObjectId;
        logger.debug('Filtering coaching centers for agent', {
          agentId: currentUserId,
          agentObjectId: adminUser._id.toString(),
          role: currentUserRole,
        });
      } else {
        logger.warn('Agent AdminUser not found', { agentId: currentUserId });
      }
    }

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

    // Filter by approval status using the enum field
    if (filters.approvalStatus) {
      query.approval_status = filters.approvalStatus;
    } else if (filters.isApproved !== undefined) {
      // Backward compatibility: convert isApproved boolean to approval_status
      query.approval_status = filters.isApproved ? AdminApproveStatus.APPROVE : { $in: [AdminApproveStatus.REJECT, AdminApproveStatus.PENDING_APPROVAL] };
    }

    if (filters.sportId) {
      query.sports = new Types.ObjectId(filters.sportId);
    }

    // Filter by added_by (admin/agent who added the center)
    if (filters.addedById && filters.addedById.trim()) {
      const addedByAdmin = await AdminUserModel.findOne({ id: filters.addedById.trim(), isDeleted: false })
        .select('_id')
        .lean();
      if (addedByAdmin && addedByAdmin._id) {
        query.addedBy = addedByAdmin._id as Types.ObjectId;
      }
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { center_name: searchRegex },
        { mobile_number: searchRegex },
        { email: searchRegex }
      ];
    }

    if (filters.onlyForFemale === true) {
      query.allowed_genders = ['female'];
    }

    if (filters.allowingDisabled === true) {
      query.allowed_disabled = true;
    }

    if (filters.onlyForDisabled === true) {
      query.is_only_for_disabled = true;
    }

    // Filter by date range (createdAt)
    if (filters.dateRange) {
      const validKeys: DateRangeFilterKey[] = [
        'today',
        'yesterday',
        'this_week',
        'this_month',
        'last_7_days',
        'last_30_days',
      ];
      if (validKeys.includes(filters.dateRange)) {
        const { start, end } = getDateRangeForKey(filters.dateRange);
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    // Handle sorting
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    const [coachingCenters, total] = await Promise.all([
      CoachingCenterModel.find(query)
        .select('_id id center_name email mobile_number logo status is_active approval_status reject_reason user addedBy sports location createdAt updatedAt')
        .populate({
          path: 'user',
          select: 'id firstName lastName email mobile isDeleted',
          // Don't use match here - it can exclude parent documents
          // Instead, we'll filter deleted users in the transformation
          options: { lean: true },
        })
        .populate({
          path: 'addedBy',
          select: 'id firstName lastName email',
          options: { lean: true },
        })
        .populate('sports', 'id name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CoachingCenterModel.countDocuments(query),
    ]);

    // Transform to simplified list format
    const transformedCenters: CoachingCenterListItem[] = coachingCenters.map((center: any) => ({
      _id: center._id?.toString() || '',
      id: center.id,
      center_name: center.center_name,
      email: center.email,
      mobile_number: center.mobile_number,
      logo: center.logo || null,
      status: center.status,
      is_active: center.is_active,
      approval_status: center.approval_status || 'approved',
      reject_reason: center.reject_reason || null,
      user: center.user && !center.user.isDeleted ? {
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
      added_by: center.addedBy
        ? `${center.addedBy.firstName || ''} ${center.addedBy.lastName || ''}`.trim() || center.addedBy.email || null
        : null,
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
  sortOrder: 'asc' | 'desc' = 'desc',
  currentUserId?: string,
  currentUserRole?: string
): Promise<AdminPaginatedResult<CoachingCenter>> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) throw new ApiError(404, t('auth.user.notFound'));

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const query: any = { user: userObjectId, is_deleted: false };

    // If current user is an agent, only show centers added by them
    if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
      // Get AdminUser ObjectId since addedBy references AdminUser model
      const adminUser = await AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
        .select('_id')
        .lean();
      
      if (adminUser && adminUser._id) {
        query.addedBy = adminUser._id as Types.ObjectId;
        logger.debug('Filtering coaching centers by userId for agent', {
          agentId: currentUserId,
          agentObjectId: adminUser._id.toString(),
          role: currentUserRole,
        });
      } else {
        logger.warn('Agent AdminUser not found', { agentId: currentUserId });
      }
    }

    const [coachingCenters, total] = await Promise.all([
      CoachingCenterModel.find(query)
        .populate({
          path: 'user',
          select: 'firstName lastName email mobile isDeleted',
          // Don't use match here - it can exclude parent documents
          // Instead, we'll filter deleted users in the transformation if needed
          options: { lean: true },
        })
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
 * Get coaching center by ID for admin with agent filtering
 * @param centerId - Coaching center ID
 * @param currentUserId - Current admin user ID (for agent filtering)
 * @param currentUserRole - Current admin user role (for agent filtering)
 */
export const getCoachingCenterByIdForAdmin = async (
  centerId: string,
  currentUserId?: string,
  currentUserRole?: string
): Promise<CoachingCenter | null> => {
  try {
    const centerObjectId = await getCenterObjectId(centerId);
    if (!centerObjectId) {
      return null;
    }

    const query: any = {
      _id: centerObjectId,
      is_deleted: false,
    };

    // If user is an agent, only show centers added by them
    if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
      // Get AdminUser ObjectId since addedBy references AdminUser model
      const adminUser = await AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
        .select('_id')
        .lean();
      
      if (adminUser && adminUser._id) {
        query.addedBy = adminUser._id as Types.ObjectId;
        logger.debug('Filtering coaching center by ID for agent', {
          agentId: currentUserId,
          agentObjectId: adminUser._id.toString(),
          centerId,
          role: currentUserRole,
        });
      } else {
        logger.warn('Agent AdminUser not found for center view', { agentId: currentUserId, centerId });
        // Return null if agent not found - they shouldn't see this center
        return null;
      }
    }

    // First check if center exists and matches agent filter (if applicable)
    const centerExists = await CoachingCenterModel.findOne(query).select('_id').lean();
    if (!centerExists) {
      // Center doesn't exist or doesn't match agent filter
      return null;
    }

    // If center exists and passes filter, get full details using common service
    const result = await commonService.getCoachingCenterById(centerId);
    if (!result) return null;

    // Populate added_by (admin/agent who created this center) with name, email, phone
    if (result.addedBy) {
      const adminUser = await AdminUserModel.findById(result.addedBy)
        .select('id firstName lastName email mobile')
        .lean();
      (result as any).added_by = adminUser
        ? {
            id: adminUser.id || (adminUser as any)._id?.toString() || '',
            name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || undefined,      
            email: adminUser.email || '',
            phone: adminUser.mobile || '',
          }
        : null;
    } else {
      (result as any).added_by = null;
    }

    return result;
  } catch (error) {
    logger.error('Admin failed to fetch coaching center by ID:', {
      centerId,
      error: error instanceof Error ? error.message : error,
    });
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
          academyDetails: {
            name: data.center_name, // Set academy name from coaching center name
          },
          isActive: true,
          isDeleted: false,
        });
      } else {
        // If user exists, update academyDetails if not already set
        // Note: We don't overwrite existing academyDetails.name as user might have multiple centers
        // Only set if it's null/undefined
        if (!user.academyDetails || !user.academyDetails.name) {
          const academyName = data.center_name || 'Academy';
          user.academyDetails = {
            name: academyName,
          };
          await user.save();
          logger.debug('Updated academyDetails for existing user', {
            userId: user.id,
            academyName: academyName,
          });
        }
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

    // 4. Get admin user ObjectId if provided (for addedBy field) and check if agent
    // Note: addedBy references AdminUser model, so we need AdminUser ObjectId
    let addedByObjectId: Types.ObjectId | null = null;
    let approvalStatus: 'approved' | 'rejected' | 'pending_approval' = AdminApproveStatus.APPROVE;
    if (adminUserId) {
      // Get AdminUser ObjectId since addedBy references AdminUser model
      const adminUser = await AdminUserModel.findOne({ id: adminUserId, isDeleted: false })
        .select('_id roles')
        .populate('roles', 'name')
        .lean();
      
      if (adminUser && adminUser._id) {
        addedByObjectId = adminUser._id as Types.ObjectId;
        
        // Check if admin user is an agent - if so, set approval_status to pending_approval
        if (adminUser.roles) {
          const userRoles = adminUser.roles as any[];
          const isAgent = userRoles.some((r: any) => r?.name === DefaultRolesEnum.AGENT);
          if (isAgent) {
            approvalStatus = AdminApproveStatus.PENDING_APPROVAL; // Agent-created academies need approval
          }
        }
        
        logger.debug('Setting addedBy for coaching center', {
          adminUserId,
          adminUserObjectId: addedByObjectId.toString(),
          approvalStatus,
        });
      } else {
        logger.warn('AdminUser not found when creating coaching center', { adminUserId });
      }
    }

    // 5. Prepare data
    const sanitizedData = { ...data };
    const coachingCenterData: any = {
      ...sanitizedData,
      user: userObjectId,
      addedBy: addedByObjectId,
      approval_status: approvalStatus,
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

    // 7. Update user's academyDetails with coaching center name after center is created
    // This ensures academyDetails is set even if it wasn't set during user creation
    try {
      const user = await UserModel.findById(userObjectId);
      if (user) {
        // Update academyDetails with center name if not already set
        if (!user.academyDetails || !user.academyDetails.name) {
          const academyName = data.center_name || 'Academy';
          user.academyDetails = {
            name: academyName,
          };
          await user.save();
          logger.debug('Updated academyDetails after coaching center creation', {
            userId: user.id,
            centerId: coachingCenter.id,
            academyName: academyName,
          });
        }
      }
    } catch (updateError) {
      // Non-blocking: Log error but don't fail center creation
      logger.warn('Failed to update user academyDetails after center creation (non-blocking)', {
        error: updateError instanceof Error ? updateError.message : updateError,
        userId: userObjectId.toString(),
        centerId: coachingCenter.id,
      });
    }

    // 8. Handle media move if published (async - non-blocking)
    if (data.status === 'published') {
      try {
        // Convert to plain object for media processing
        const coachingCenterObj = coachingCenter.toObject({ flattenObjectIds: false });
        const fileUrls = commonService.extractFileUrlsFromCoachingCenter(coachingCenterObj as CoachingCenter);
        
        // Enqueue media move as background job (non-blocking)
        if (fileUrls.length > 0) {
          enqueueMediaMove({
            coachingCenterId: coachingCenter._id.toString(),
            fileUrls,
            timestamp: Date.now(),
          }).catch((error) => {
            logger.error('Failed to enqueue media move job (non-blocking)', {
              coachingCenterId: coachingCenter._id.toString(),
              fileCount: fileUrls.length,
              error: error instanceof Error ? error.message : error,
            });
          });
        }
        
        // Enqueue thumbnail generation (already async)
        commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj as CoachingCenter).catch((error) => {
          logger.error('Failed to enqueue thumbnail generation (non-blocking)', {
            coachingCenterId: coachingCenter._id.toString(),
            error: error instanceof Error ? error.message : error,
          });
        });
      } catch (mediaError) {
        logger.error('Failed to prepare media move job:', {
          error: mediaError instanceof Error ? mediaError.message : mediaError,
          stack: mediaError instanceof Error ? mediaError.stack : undefined,
          coachingCenterId: coachingCenter._id.toString()
        });
        // Don't fail the entire creation if media move preparation fails
      }
    }

    // 8. Send notification to admin and super_admin if created by an agent (async - non-blocking)
    if (adminUserId && addedByObjectId) {
      // Fire and forget - don't await, process in background
      (async () => {
        try {
          const adminUser = await UserModel.findOne({ _id: addedByObjectId })
            .select('roles')
            .populate('roles', 'name')
            .lean();
          
          if (adminUser && adminUser.roles) {
            const userRoles = adminUser.roles as any[];
            const isAgent = userRoles.some((r: any) => r?.name === DefaultRolesEnum.AGENT);
            
            if (isAgent) {
              const { createAndSendNotification } = await import('../common/notification.service');
              const centerName = coachingCenter.center_name || 'Unnamed Academy';
              const creationDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Use createAndSendNotification for role-based notifications (fire-and-forget)
              const notificationInput: CreateNotificationInput = {
                recipientType: 'role',
                roles: [DefaultRoles.ADMIN, DefaultRoles.SUPER_ADMIN],
                title: 'New Academy Created by Agent',
                body: `A new academy "${centerName}" has been created by an agent and requires approval.`,
                channels: ['push'],
                priority: 'medium',
                data: {
                  type: 'coaching_center_created_by_agent',
                  coachingCenterId: coachingCenter.id,
                  centerName: centerName,
                  agentId: adminUserId,
                  approvalStatus: approvalStatus,
                  creationDate,
                },
                metadata: {
                  source: 'admin_coaching_center_creation',
                  requiresApproval: true,
                },
              };
              
              createAndSendNotification(notificationInput).catch((error) => {
                logger.error('Failed to create notification for agent-created coaching center (non-blocking)', {
                  error: error instanceof Error ? error.message : error,
                  coachingCenterId: coachingCenter._id.toString()
                });
              });
            }
          }
        } catch (notificationError) {
          logger.error('Failed to send admin notification for agent-created coaching center (non-blocking)', { 
            notificationError: notificationError instanceof Error ? notificationError.message : notificationError,
            coachingCenterId: coachingCenter._id.toString()
          });
          // Don't throw error - notification failure shouldn't break creation
        }
      })().catch((error) => {
        logger.error('Unexpected error in notification background task', {
          error: error instanceof Error ? error.message : error,
          coachingCenterId: coachingCenter._id.toString()
        });
      });
    }

    const result = await commonService.getCoachingCenterById(coachingCenter._id.toString()) as CoachingCenter;
    
    // Invalidate cache after creating a new coaching center (non-blocking)
    invalidateCoachingCentersListCache().catch((cacheError) => {
      logger.warn('Failed to invalidate coaching centers list cache after create (non-blocking)', {
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    });
    
    return result;
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
      
      // Move temp files to permanent (async - non-blocking)
      // Handles both new status and new media in existing published center
      try {
        const coachingCenterObj = updatedCenter as CoachingCenter;
        const fileUrls = commonService.extractFileUrlsFromCoachingCenter(coachingCenterObj);
        
        // Enqueue media move as background job (non-blocking)
        if (fileUrls.length > 0) {
          enqueueMediaMove({
            coachingCenterId: id,
            fileUrls,
            timestamp: Date.now(),
          }).catch((error) => {
            logger.error('Failed to enqueue media move job during update (non-blocking)', {
              coachingCenterId: id,
              fileCount: fileUrls.length,
              error: error instanceof Error ? error.message : error,
            });
          });
        }
        
        // Enqueue thumbnail generation (already async)
        commonService.enqueueThumbnailGenerationForVideos(coachingCenterObj).catch((error) => {
          logger.error('Failed to enqueue thumbnail generation during update (non-blocking)', {
            coachingCenterId: id,
            error: error instanceof Error ? error.message : error,
          });
        });
      } catch (mediaError) {
        logger.error('Failed to prepare media move job during update:', { 
          error: mediaError instanceof Error ? mediaError.message : mediaError,
          stack: mediaError instanceof Error ? mediaError.stack : undefined,
          coachingCenterId: id
        });
        // Do not re-throw, allow update to succeed even if media movement preparation fails
      }
    }

    const result = await commonService.getCoachingCenterById(id);
    
    // Invalidate cache after updating a coaching center (non-blocking)
    // Only invalidate if center_name or is_deleted changed (affects list)
    if (data.center_name !== undefined || data.is_deleted !== undefined) {
      invalidateCoachingCentersListCache().catch((cacheError) => {
        logger.warn('Failed to invalidate coaching centers list cache after update (non-blocking)', {
          error: cacheError instanceof Error ? cacheError.message : cacheError,
        });
      });
    }
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to update coaching center:', error);
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};

/**
 * Update only the addedBy (agent/admin) for a coaching center. Uses same access rules as get (agents only their centers).
 */
export const updateCoachingCenterAddedBy = async (
  centerId: string,
  addedById: string | null | undefined,
  currentUserId?: string,
  currentUserRole?: string
): Promise<CoachingCenter | null> => {
  try {
    const centerObjectId = await getCenterObjectId(centerId);
    if (!centerObjectId) {
      return null;
    }

    const query: any = {
      _id: centerObjectId,
      is_deleted: false,
    };

    if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
      const adminUser = await AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
        .select('_id')
        .lean();
      if (adminUser && adminUser._id) {
        query.addedBy = adminUser._id as Types.ObjectId;
      } else {
        return null;
      }
    }

    let addedByObjectId: Types.ObjectId | null = null;
    if (addedById && addedById.trim()) {
      const adminUser = await AdminUserModel.findOne({ id: addedById.trim(), isDeleted: false })
        .select('_id')
        .lean();
      if (!adminUser || !adminUser._id) {
        throw new ApiError(404, t('admin.userNotFound') || 'Admin user not found');
      }
      addedByObjectId = adminUser._id as Types.ObjectId;
    }

    const updated = await CoachingCenterModel.findOneAndUpdate(
      query,
      { $set: { addedBy: addedByObjectId } },
      { new: true }
    ).lean();

    if (!updated) {
      return null;
    }

    invalidateCoachingCentersListCache().catch(() => {});

    return getCoachingCenterByIdForAdmin(centerId, currentUserId, currentUserRole);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Admin failed to update coaching center addedBy:', {
      centerId,
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, t('coachingCenter.update.failed'));
  }
};

/**
 * Get coaching center statistics for admin dashboard
 */
export const getCoachingCenterStats = async (
  params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    status?: string;
    isActive?: boolean;
    isApproved?: boolean;
    approvalStatus?: 'approved' | 'rejected' | 'pending_approval';
    sportId?: string;
    search?: string;
  },
  currentUserId?: string,
  currentUserRole?: string
): Promise<CoachingCenterStats> => {
  try {
    const dateQuery: any = {
      is_deleted: false,
    };
    
    // If user is an agent, only show centers added by them
    if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
      const currentUserObjectId = await getUserObjectId(currentUserId);
      if (currentUserObjectId) {
        dateQuery.addedBy = currentUserObjectId;
      }
    }
    
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

    // Apply approval status filter
    if (params?.approvalStatus) {
      dateQuery.approval_status = params.approvalStatus;
    } else if (params?.isApproved !== undefined) {
      // Backward compatibility: convert isApproved boolean to approval_status
      dateQuery.approval_status = params.isApproved ? AdminApproveStatus.APPROVE : { $in: [AdminApproveStatus.REJECT, AdminApproveStatus.PENDING_APPROVAL] };
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

    // Get total count, status counts, active counts, and approval status counts in parallel
    const [total, statusCounts, activeCounts, approvalStatusCounts] = await Promise.all([
      CoachingCenterModel.countDocuments(dateQuery),
      CoachingCenterModel.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      CoachingCenterModel.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$is_active',
            count: { $sum: 1 },
          },
        },
      ]),
      CoachingCenterModel.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: '$approval_status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item: any) => {
      byStatus[item._id] = item.count;
    });

    const byActiveStatus = {
      active: activeCounts.find((item: any) => item._id === true)?.count || 0,
      inactive: activeCounts.find((item: any) => item._id === false)?.count || 0,
    };

    const byApprovalStatus = {
      approved: approvalStatusCounts.find((item: any) => item._id === AdminApproveStatus.APPROVE)?.count || 0,
      rejected: approvalStatusCounts.find((item: any) => item._id === AdminApproveStatus.REJECT)?.count || 0,
      pending_approval: approvalStatusCounts.find((item: any) => item._id === AdminApproveStatus.PENDING_APPROVAL)?.count || 0,
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

    // Get centers only for female candidates (allowed_genders is exactly ['female'])
    const onlyForFemale = await CoachingCenterModel.countDocuments({
      ...dateQuery,
      allowed_genders: ['female'],
    });

    return {
      total,
      byStatus,
      byActiveStatus,
      byApprovalStatus,
      bySport,
      byCity,
      byState,
      allowingDisabled,
      onlyForDisabled,
      onlyForFemale,
    };
  } catch (error) {
    logger.error('Admin failed to get coaching center stats:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

/**
 * Approve or reject coaching center
 * Only super_admin and admin can approve/reject
 */
export const updateApprovalStatus = async (
  id: string,
  isApproved: boolean,
  rejectReason?: string,
  currentUserRole?: string
): Promise<CoachingCenter | null> => {
  try {
    // Only super_admin and admin can approve/reject
    if (currentUserRole !== DefaultRolesEnum.SUPER_ADMIN && currentUserRole !== DefaultRolesEnum.ADMIN) {
      throw new ApiError(403, 'Only super admin and admin can approve or reject academies');
    }

    const query = Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const existingCenter = await CoachingCenterModel.findOne(query);
    
    if (!existingCenter || existingCenter.is_deleted) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const updateData: any = {
      approval_status: isApproved ? AdminApproveStatus.APPROVE : AdminApproveStatus.REJECT,
    };

    // If rejecting, store reject reason; if approving, clear reject reason
    if (isApproved) {
      updateData.reject_reason = null;
    } else {
      if (rejectReason) {
        updateData.reject_reason = rejectReason;
      }
    }

    const updatedCenter = await CoachingCenterModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('user', 'id firstName lastName email')
      .lean();

    if (!updatedCenter) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    logger.info('Coaching center approval status updated', {
      id,
      isApproved,
      rejectReason: rejectReason || null,
    });

    // Send notification to academy owner about approval status change
    try {
      const { createAndSendNotification } = await import('../common/notification.service');
      const centerName = (updatedCenter as any).center_name || 'Your Academy';
      const centerId = (updatedCenter as any).id || id; // Use coaching center ID for academy recipient type
      
      if (centerId) {
        const title = isApproved 
          ? 'Academy Approved' 
          : 'Academy Rejected';
        const body = isApproved
          ? `Congratulations! Your academy "${centerName}" has been approved and is now live on PlayAsport.`
          : `Your academy "${centerName}" has been rejected.${rejectReason ? ` Reason: ${rejectReason}` : ''}`;

        await createAndSendNotification({
          recipientType: 'academy',
          recipientId: centerId,
          title,
          body,
          channels: ['push'],
          priority: isApproved ? 'medium' : 'high',
          data: {
            type: 'coaching_center_approval_status_changed',
            coachingCenterId: id,
            centerName,
            approvalStatus: isApproved ? AdminApproveStatus.APPROVE : AdminApproveStatus.REJECT,
            rejectReason: rejectReason || null,
            isApproved,
          },
          metadata: {
            source: 'admin_approval_status_update',
            changedAt: new Date().toISOString(),
          },
        });
      }
    } catch (notificationError) {
      logger.error('Failed to create notification for approval status change', { notificationError });
      // Don't throw error - notification failure shouldn't break the approval process
    }

    return await commonService.getCoachingCenterById(id);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to update approval status:', error);
    throw new ApiError(500, 'Failed to update approval status');
  }
};

/**
 * Get employees (coaches) by coaching center ID
 */
export const getEmployeesByCoachingCenterId = async (
  coachingCenterId: string,
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  roleName?: string,
  search?: string
): Promise<AdminPaginatedResult<any>> => {
  try {
    // Validate pagination parameters
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(
      config.pagination.maxLimit,
      Math.max(1, Math.floor(limit))
    );

    // Calculate skip
    const skip = (pageNumber - 1) * pageSize;

    // Get coaching center by ID (supports both MongoDB ObjectId and custom UUID id)
    let centerObjectId: Types.ObjectId | null = null;
    
    if (Types.ObjectId.isValid(coachingCenterId) && coachingCenterId.length === 24) {
      // Try to find by MongoDB ObjectId
      const center = await CoachingCenterModel.findById(coachingCenterId).select('_id').lean();
      if (center) {
        centerObjectId = center._id as Types.ObjectId;
      }
    }
    
    // If not found by ObjectId, try to find by custom UUID id
    if (!centerObjectId) {
      const center = await CoachingCenterModel.findOne({ id: coachingCenterId, is_deleted: false })
        .select('_id')
        .lean();
      if (center) {
        centerObjectId = center._id as Types.ObjectId;
      }
    }

    // Verify coaching center exists
    if (!centerObjectId) {
      throw new ApiError(404, 'Coaching center not found');
    }

    // Build query - get non-deleted employees for this center
    const query: any = {
      center: centerObjectId,
      is_deleted: false,
    };

    // Filter by role name if provided
    if (roleName) {
      const role = await RoleModel.findOne({ name: roleName.trim() });
      if (!role) {
        throw new ApiError(404, `Role with name '${roleName}' not found`);
      }
      query.role = role._id;
    }

    // Add search filter if provided
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { mobileNo: searchRegex },
      ];
    }

    // Get total count
    const total = await EmployeeModel.countDocuments(query);

    // Get paginated results with populated fields
    const employees = await EmployeeModel.find(query)
      .populate('userId', 'id firstName lastName email mobile')
      .populate('role', 'name description')
      .populate('sport', 'custom_id name logo')
      .populate('center', 'center_name email mobile_number')
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Employees fetched by coaching center', {
      coachingCenterId,
      roleName,
      search,
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages,
    });

    return {
      coachingCenters: employees, // Reusing the interface structure
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to fetch employees by coaching center:', error);
    throw new ApiError(500, 'Failed to fetch employees');
  }
};

/**
 * Get coaches (employees with role 'coach') for a coaching center.
 * Returns only id and name. Supports search by name. Default limit 100.
 */
export const getCoachesListByCoachingCenterId = async (
  coachingCenterId: string,
  search?: string,
  page: number = 1,
  limit: number = 100
): Promise<{ coaches: Array<{ id: string; name: string }>; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  try {
    const centerObjectId = await getCenterObjectId(coachingCenterId);
    if (!centerObjectId) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const coachRole = await RoleModel.findOne({ name: 'coach' });
    if (!coachRole) {
      return {
        coaches: [],
        pagination: { page: 1, limit: Math.min(100, Math.max(1, limit)), total: 0, totalPages: 0 },
      };
    }

    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(100, Math.max(1, Math.floor(limit)));

    const query: any = {
      center: centerObjectId,
      role: coachRole._id,
      is_deleted: false,
    };

    if (search && search.trim()) {
      query.fullName = new RegExp(search.trim(), 'i');
    }

    const [total, employees] = await Promise.all([
      EmployeeModel.countDocuments(query),
      EmployeeModel.find(query).select('_id fullName').sort({ fullName: 1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const coaches = (employees as any[]).map((emp) => ({
      id: emp._id?.toString() || '',
      name: emp.fullName || '',
    }));

    return {
      coaches,
      pagination: { page: pageNumber, limit: pageSize, total, totalPages },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Failed to get coaches list', { coachingCenterId, error });
    throw new ApiError(500, 'Failed to get coaches');
  }
};

/**
 * Create a coach (employee) for a coaching center.
 * Accepts only name and coaching center ID (from URL). Uses the coaching center's owner (user) as the employee's userId.
 */
export const createCoachForCoachingCenter = async (
  coachingCenterId: string,
  name: string
): Promise<any> => {
  try {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      throw new ApiError(400, 'Name is required');
    }

    const centerObjectId = await getCenterObjectId(coachingCenterId);
    if (!centerObjectId) {
      throw new ApiError(404, t('coachingCenter.notFound'));
    }

    const coachingCenter = await CoachingCenterModel.findById(centerObjectId).select('user').lean();
    if (!coachingCenter?.user) {
      throw new ApiError(404, 'Coaching center has no associated user');
    }

    const centerUserId = coachingCenter.user as Types.ObjectId;

    const coachRole = await RoleModel.findOne({ name: 'coach' });
    if (!coachRole) {
      throw new ApiError(404, "Role with name 'coach' not found. Please ensure the coach role exists in the database.");
    }

    const employee = new EmployeeModel({
      userId: centerUserId,
      fullName: trimmedName,
      role: coachRole._id,
      center: centerObjectId,
      workingHours: null,
      email: null,
      sport: null,
      experience: null,
      extraHours: null,
      certification: null,
      salary: null,
      is_active: true,
      is_deleted: false,
    });
    await employee.save();

    logger.info('Coach created for coaching center', {
      coachingCenterId,
      employeeId: employee._id?.toString(),
      fullName: trimmedName,
    });

    return { id: employee._id.toString(), name: employee.fullName };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to create coach for coaching center', {
      coachingCenterId,
      name,
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to create coach');
  }
};

/**
 * List coaching centers with search and pagination
 * If centerId is provided, returns full details of that specific center with sports
 * Otherwise, returns simple list (id and center_name only)
 * Includes Redis caching for improved performance
 */
export const listCoachingCentersSimple = async (
  page: number = 1,
  limit: number = config.pagination.defaultLimit,
  search?: string,
  status?: string,
  isActive?: boolean,
  centerId?: string,
  currentUserId?: string,
  currentUserRole?: string
): Promise<AdminPaginatedResult<{ id: string; center_name: string } | { id: string; center_name: string; sport_details: Array<{ id: string; name: string }> }>> => {
  try {
    // If centerId is provided, return full details of that specific center
    if (centerId) {
      // Try to get from cache first
      const cachedResult = await getCachedCoachingCentersList(1, 1, undefined, status, isActive, centerId);
      if (cachedResult) {
        logger.debug('Returning cached coaching center details', { centerId, status, isActive });
        return cachedResult;
      }

      const centerObjectId = await getCenterObjectId(centerId);
      if (!centerObjectId) {
        throw new ApiError(404, t('coachingCenter.notFound'));
      }

      // Build query with filters
      const query: any = {
        _id: centerObjectId,
        is_deleted: false,
      };

      // If user is an agent, verify the center was added by them
      if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
        // Get AdminUser ObjectId since addedBy references AdminUser model
        const adminUser = await AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
          .select('_id')
          .lean();
        
        if (adminUser && adminUser._id) {
          query.addedBy = adminUser._id as Types.ObjectId;
        } else {
          // Agent not found, return not found
          throw new ApiError(404, t('coachingCenter.notFound'));
        }
      }

      // Simple list includes all statuses (draft, published) and all active states (active, inactive) - no status/isActive filter

      const coachingCenter = await CoachingCenterModel.findOne(query)
        .populate('sport_details.sport_id', 'custom_id name _id')
        .select('_id center_name sport_details')
        .lean();

      if (!coachingCenter) {
        throw new ApiError(404, t('coachingCenter.notFound'));
      }

      // Transform response to only include: id, center_name, and sport_details (with name and id only)
      const transformedCenter = {
        id: (coachingCenter as any)._id.toString(), // MongoDB ObjectId as string
        center_name: (coachingCenter as any).center_name,
        sport_details: ((coachingCenter as any).sport_details || []).map((sportDetail: any) => {
          const sport = sportDetail.sport_id;
          return {
            id: sport?._id?.toString() || sport?.custom_id || null,
            name: sport?.name || null,
          };
        }).filter((sd: any) => sd.id && sd.name), // Filter out any invalid entries
      };

      const result = {
        coachingCenters: [transformedCenter],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
        },
      };

      // Cache the result for centerId-specific requests (non-blocking)
      cacheCoachingCentersList(1, 1, undefined, status, isActive, centerId, result).catch((cacheError) => {
        logger.warn('Failed to cache coaching center details (non-blocking)', {
          centerId,
          status,
          isActive,
          error: cacheError instanceof Error ? cacheError.message : cacheError,
        });
      });

      return result;
    }

    // Otherwise, return simple list
    const pageNumber = Math.max(1, Math.floor(page));
    const pageSize = Math.min(config.pagination.maxLimit, Math.max(1, Math.floor(limit)));
    const skip = (pageNumber - 1) * pageSize;

    // Try to get from cache first
    const cachedResult = await getCachedCoachingCentersList(pageNumber, pageSize, search, status, isActive, centerId);
    if (cachedResult) {
      logger.debug('Returning cached coaching centers list', { page: pageNumber, limit: pageSize, search, status, isActive, centerId });
      return cachedResult;
    }

    const query: any = { is_deleted: false };

    // If user is an agent, only show centers added by them
    if (currentUserRole === DefaultRolesEnum.AGENT && currentUserId) {
      // Get AdminUser ObjectId since addedBy references AdminUser model
      const adminUser = await AdminUserModel.findOne({ id: currentUserId, isDeleted: false })
        .select('_id')
        .lean();
      
      if (adminUser && adminUser._id) {
        query.addedBy = adminUser._id as Types.ObjectId;
        logger.debug('Filtering coaching centers list for agent', {
          agentId: currentUserId,
          agentObjectId: adminUser._id.toString(),
          role: currentUserRole,
        });
      } else {
        logger.warn('Agent AdminUser not found for list', { agentId: currentUserId });
        // Return empty result if agent not found
        return {
          coachingCenters: [],
          pagination: {
            page: pageNumber,
            limit: pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }

    // Simple list includes draft, published, active, and inactive - no status/isActive filter applied

    // Note: No approval_status filter - includes all centers (approved, rejected, pending_approval)

    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.center_name = searchRegex;
    }

    // Execute count and find queries in parallel
    const [total, coachingCenters] = await Promise.all([
      CoachingCenterModel.countDocuments(query),
      CoachingCenterModel.find(query)
        .select('_id center_name')
        .sort({ center_name: 1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const result = {
      coachingCenters: coachingCenters.map((center: any) => ({
        id: center._id.toString(), // Return MongoDB ObjectId as string
        center_name: center.center_name,
      })),
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
      },
    };

    // Cache the result (non-blocking)
    cacheCoachingCentersList(pageNumber, pageSize, search, status, isActive, centerId, result).catch((cacheError) => {
      logger.warn('Failed to cache coaching centers list (non-blocking)', {
        page: pageNumber,
        limit: pageSize,
        search,
        status,
        isActive,
        centerId,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    });

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to list coaching centers:', error);
    throw new ApiError(500, t('coachingCenter.list.failed'));
  }
};



