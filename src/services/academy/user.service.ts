import { Types } from 'mongoose';
import { BookingModel, BookingStatus } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { UserModel } from '../../models/user.model';
import { ParticipantModel } from '../../models/participant.model';
import { Address } from '../../models/address.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';

/**
 * Helper function to clean address object (remove isDeleted, createdAt, updatedAt)
 */
const cleanAddress = (address: any): Address | null => {
  if (!address) return null;
  const { isDeleted, createdAt, updatedAt, ...cleanedAddress } = address;
  return cleanedAddress as Address;
};

export interface EnrolledUser {
  id: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  mobile?: string | null;
  profileImage?: string | null;
  userType?: 'student' | 'guardian' | null;
  registrationMethod?: 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram' | null;
  address?: Address | null;
  totalBookings: number;
  activeBookings: number;
  totalParticipants: number; // Count of unique enrolled batches
}

export interface GetEnrolledUsersParams {
  centerId?: string;
  batchId?: string;
  userType?: 'student' | 'guardian';
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedEnrolledUsersResult {
  data: EnrolledUser[];
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
 * Get all enrolled users for academy (unique users who have enrolled participants)
 */
export const getAcademyEnrolledUsers = async (
  userId: string,
  params: GetEnrolledUsersParams = {}
): Promise<PaginatedEnrolledUsersResult> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id center_name').lean();

    if (coachingCenters.length === 0) {
      return {
        data: [],
        pagination: {
          page: 1,
          limit: params.limit || 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const centerIds = coachingCenters.map(center => center._id);

    // Build query for bookings
    const query: any = {
      center: { $in: centerIds },
      is_deleted: false,
    };

    // Filter by center if provided
    if (params.centerId) {
      if (!Types.ObjectId.isValid(params.centerId)) {
        throw new ApiError(400, 'Invalid center ID');
      }
      const centerObjectId = new Types.ObjectId(params.centerId);
      // Verify center belongs to user
      if (!centerIds.some(id => id.toString() === centerObjectId.toString())) {
        throw new ApiError(403, 'Center does not belong to you');
      }
      query.center = centerObjectId;
    }

    // Filter by batch if provided
    if (params.batchId) {
      if (!Types.ObjectId.isValid(params.batchId)) {
        throw new ApiError(400, 'Invalid batch ID');
      }
      query.batch = new Types.ObjectId(params.batchId);
    }

    // Get all bookings matching the query
    const bookings = await BookingModel.find(query)
      .populate('user', 'id firstName lastName email mobile profileImage userType registrationMethod address')
      .populate('batch', 'id name')
      .sort({ createdAt: -1 })
      .lean();

    // Group by user (avoid duplicates)
    const userMap = new Map<string, {
      id: string;
      firstName: string;
      lastName?: string | null;
      email: string;
      mobile?: string | null;
      profileImage?: string | null;
      userType?: 'student' | 'guardian' | null;
      registrationMethod?: 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram' | null;
      address?: Address | null;
      totalBookings: number;
      activeBookings: number;
      batchIds: Set<string>; // Track unique batch IDs
    }>();

    for (const booking of bookings) {
      const bookingData = booking as any;
      
      if (!bookingData.user || !bookingData.user.id) {
        continue;
      }

      const userIdStr = bookingData.user.id;
      
      // Initialize user if not exists
      if (!userMap.has(userIdStr)) {
        userMap.set(userIdStr, {
          id: userIdStr,
          firstName: bookingData.user.firstName || '',
          lastName: bookingData.user.lastName || null,
          email: bookingData.user.email || '',
          mobile: bookingData.user.mobile || null,
          profileImage: bookingData.user.profileImage || null,
          userType: bookingData.user.userType || null,
          registrationMethod: bookingData.user.registrationMethod || null,
          address: bookingData.user.address || null,
          totalBookings: 0,
          activeBookings: 0,
          batchIds: new Set(),
        });
      }

      const user = userMap.get(userIdStr)!;
      
      // Count bookings
      user.totalBookings++;
      
      // Count active bookings
      if (bookingData.status === BookingStatus.CONFIRMED) {
        user.activeBookings++;
      }

      // Track unique batch IDs
      if (bookingData.batch) {
        const batchId = bookingData.batch.id || bookingData.batch._id?.toString() || '';
        if (batchId) {
          user.batchIds.add(batchId);
        }
      }
    }

    // Convert map to array and format as EnrolledUser
    let users: EnrolledUser[] = Array.from(userMap.values()).map(userData => ({
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      mobile: userData.mobile,
      profileImage: userData.profileImage,
      userType: userData.userType,
      registrationMethod: userData.registrationMethod,
      address: cleanAddress(userData.address),
      totalBookings: userData.totalBookings,
      activeBookings: userData.activeBookings,
      totalParticipants: userData.batchIds.size, // Count of unique batches
    }));

    // Filter by userType if provided
    if (params.userType) {
      users = users.filter(user => user.userType === params.userType);
    }

    // Filter by search if provided
    if (params.search) {
      const searchLower = params.search.toLowerCase().trim();
      users = users.filter(user => {
        const firstName = (user.firstName || '').toLowerCase();
        const lastName = (user.lastName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const mobile = (user.mobile || '').toLowerCase();
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               email.includes(searchLower) ||
               mobile.includes(searchLower);
      });
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Apply pagination
    const paginatedUsers = users.slice(skip, skip + limit);

    return {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get enrolled users:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to get enrolled users');
  }
};

export interface EnrolledUserDetail {
  user: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    mobile?: string | null;
    profileImage?: string | null;
    userType?: 'student' | 'guardian' | null;
    registrationMethod?: 'email' | 'mobile' | 'google' | 'facebook' | 'apple' | 'instagram' | null;
    gender?: string | null;
    dob?: Date | null;
    address?: any | null;
  };
  participants: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    gender?: number | null;
    dob?: Date | null;
    schoolName?: string | null;
    contactNumber?: string | null;
    profilePhoto?: string | null;
    disability?: number | null;
    address?: any | null;
  }>;
  totalBookings: number;
  activeBookings: number;
  totalParticipants: number;
}

/**
 * Get detailed information about a specific enrolled user
 */
export const getAcademyEnrolledUserDetail = async (
  targetUserId: string,
  academyUserId: string
): Promise<EnrolledUserDetail> => {
  try {
    const userObjectId = await getUserObjectId(academyUserId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the academy user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id').lean();

    if (coachingCenters.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const centerIds = coachingCenters.map(center => center._id);

    // Validate and get target user
    let targetUser: any;
    if (Types.ObjectId.isValid(targetUserId) && targetUserId.length === 24) {
      // Try MongoDB _id first
      targetUser = await UserModel.findOne({
        $or: [
          { _id: new Types.ObjectId(targetUserId), isDeleted: false },
          { id: targetUserId, isDeleted: false }
        ]
      }).lean();
    } else {
      // Try UUID id format
      targetUser = await UserModel.findOne({
        id: targetUserId,
        isDeleted: false,
      }).lean();
    }

    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }

    // Get all bookings for this user in academy centers
    const bookings = await BookingModel.find({
      user: targetUser._id,
      center: { $in: centerIds },
      is_deleted: false,
    })
      .populate('participants', 'id firstName lastName gender dob schoolName contactNumber profilePhoto')
      .select('status participants')
      .sort({ createdAt: -1 })
      .lean();

    if (bookings.length === 0) {
      throw new ApiError(404, 'User not found or has no enrollments in your coaching centers');
    }

    // Get all unique participants from bookings
    const participantObjectIds = new Set<string>();
    bookings.forEach((booking: any) => {
      const participants = Array.isArray(booking.participants) 
        ? booking.participants 
        : (booking.participants ? [booking.participants] : []);
      participants.forEach((p: any) => {
        const pid = p._id?.toString();
        if (pid && Types.ObjectId.isValid(pid)) {
          participantObjectIds.add(pid);
        }
      });
    });

    // Get all participants details
    const participants = participantObjectIds.size > 0 
      ? await ParticipantModel.find({
          _id: { $in: Array.from(participantObjectIds).map(id => new Types.ObjectId(id)) },
          userId: targetUser._id,
          is_deleted: false,
        })
          .select('id firstName lastName gender dob schoolName contactNumber profilePhoto disability address')
          .lean()
      : [];

    // Format participants
    const formattedParticipants = participants.map((p: any) => ({
      id: p.id || p._id?.toString() || '',
      firstName: p.firstName || null,
      lastName: p.lastName || null,
      gender: p.gender ?? null,
      dob: p.dob ? (typeof p.dob === 'string' ? new Date(p.dob) : p.dob) : null,
      schoolName: p.schoolName || null,
      contactNumber: p.contactNumber || null,
      profilePhoto: p.profilePhoto || null,
      disability: p.disability ?? null,
      address: p.address || null,
    }));

    const activeBookings = bookings.filter((b: any) => b.status === BookingStatus.CONFIRMED).length;

    const result: EnrolledUserDetail = {
      user: {
        id: targetUser.id || targetUser._id?.toString() || '',
        firstName: targetUser.firstName || '',
        lastName: targetUser.lastName || null,
        email: targetUser.email || '',
        mobile: targetUser.mobile || null,
        profileImage: targetUser.profileImage || null,
        userType: targetUser.userType || null,
        registrationMethod: targetUser.registrationMethod || null,
        gender: targetUser.gender || null,
        dob: targetUser.dob ? (typeof targetUser.dob === 'string' ? new Date(targetUser.dob) : targetUser.dob) : null,
        address: cleanAddress(targetUser.address),
      },
      participants: formattedParticipants,
      totalBookings: bookings.length,
      activeBookings,
      totalParticipants: formattedParticipants.length,
    };

    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get enrolled user detail:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to get enrolled user detail');
  }
};
