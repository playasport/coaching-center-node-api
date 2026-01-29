import { Types } from 'mongoose';
import { BookingModel, BookingStatus } from '../../models/booking.model';
import { PaymentStatus } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { getUserObjectId } from '../../utils/userCache';
import { calculateAge } from '../client/booking.service';

/**
 * Calculate age from date of birth (helper wrapper)
 */
const calculateAgeFromDob = (dob: Date | string | null | undefined): number | null => {
  if (!dob) return null;
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(birthDate.getTime())) return null;
  
  const today = new Date();
  return calculateAge(birthDate, today);
};

export interface EnrolledStudent {
  participant: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    gender?: number | null;
    dob?: Date | null;
    age?: number | null;
    schoolName?: string | null;
    contactNumber?: string | null;
    profilePhoto?: string | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    mobile?: string | null;
  };
  batches: Array<{
    batchId: string;
    batchName: string;
    sport: {
      id: string;
      name: string;
    };
    center: {
      id: string;
      name: string;
    };
    bookingId: string;
    bookingStatus: BookingStatus;
    paymentStatus: PaymentStatus;
    enrolledDate: Date;
    amount: number;
  }>;
  overallStatus: 'active' | 'left' | 'completed' | 'pending';
  totalEnrollments: number;
  activeEnrollments: number;
}

export interface GetEnrolledStudentsParams {
  centerId?: string;
  batchId?: string;
  status?: 'active' | 'left' | 'completed' | 'pending';
  page?: number;
  limit?: number;
}

export interface PaginatedEnrolledStudentsResult {
  data: EnrolledStudent[];
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
 * Get all enrolled students for academy (grouped by participant, no duplicates)
 */
export const getAcademyEnrolledStudents = async (
  userId: string,
  params: GetEnrolledStudentsParams = {}
): Promise<PaginatedEnrolledStudentsResult> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id').lean();

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
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName gender dob schoolName contactNumber profilePhoto')
      .populate('batch', 'id name sport center scheduled')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .select('id amount priceBreakdown status payment participants batch center sport createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Group by participant (avoid duplicates)
    const participantMap = new Map<string, EnrolledStudent>();

    for (const booking of bookings) {
      const bookingData = booking as any;
      
      // Process each participant in the booking
      const participants = Array.isArray(bookingData.participants) 
        ? bookingData.participants 
        : [bookingData.participants];

      for (const participant of participants) {
        if (!participant) continue;
        
        const participantId = (participant.id || participant._id?.toString() || '').toString();
        if (!participantId) continue;
        
        // Get or create participant entry
        if (!participantMap.has(participantId)) {
          const dob = participant.dob ? (typeof participant.dob === 'string' ? new Date(participant.dob) : participant.dob) : null;
          participantMap.set(participantId, {
            participant: {
              id: participant.id || participant._id?.toString() || '',
              firstName: participant.firstName || null,
              lastName: participant.lastName || null,
              gender: participant.gender ?? null,
              dob: dob,
              age: calculateAgeFromDob(dob),
              schoolName: participant.schoolName || null,
              contactNumber: participant.contactNumber || null,
              profilePhoto: participant.profilePhoto || null,
            },
            user: {
              id: bookingData.user?.id || bookingData.user?._id?.toString() || '',
              firstName: bookingData.user?.firstName || '',
              lastName: bookingData.user?.lastName || null,
              email: bookingData.user?.email || '',
              mobile: bookingData.user?.mobile || null,
            },
            batches: [],
            overallStatus: 'pending',
            totalEnrollments: 0,
            activeEnrollments: 0,
          });
        }

        const student = participantMap.get(participantId)!;
        
        // Add batch information
        const batchInfo = {
          batchId: bookingData.batch?.id || bookingData.batch?._id?.toString() || '',
          batchName: bookingData.batch?.name || '',
          sport: {
            id: bookingData.sport?.id || bookingData.sport?._id?.toString() || '',
            name: bookingData.sport?.name || '',
          },
          center: {
            id: bookingData.center?.id || bookingData.center?._id?.toString() || '',
            name: bookingData.center?.center_name || '',
          },
          bookingId: bookingData.id || bookingData._id?.toString() || '',
          bookingStatus: bookingData.status as BookingStatus,
          paymentStatus: bookingData.payment?.status as PaymentStatus,
          enrolledDate: bookingData.createdAt || new Date(),
          amount: bookingData.priceBreakdown?.batch_amount || bookingData.amount || 0, // Show only batch amount for academy
        };

        // Check if this batch is already added (avoid duplicates)
        const batchExists = student.batches.some(b => b.batchId === batchInfo.batchId && b.bookingId === batchInfo.bookingId);
        if (!batchExists) {
          student.batches.push(batchInfo);
          student.totalEnrollments++;
          if (batchInfo.bookingStatus === BookingStatus.CONFIRMED) {
            student.activeEnrollments++;
          }
        }
      }
    }

    // Convert map to array and calculate overall status
    let students = Array.from(participantMap.values()).map(student => {
      // Determine overall status based on batch statuses
      const hasActive = student.batches.some(b => b.bookingStatus === BookingStatus.CONFIRMED);
      const hasCompleted = student.batches.some(b => b.bookingStatus === BookingStatus.COMPLETED);
      const hasCancelled = student.batches.some(b => b.bookingStatus === BookingStatus.CANCELLED);

      if (hasActive) {
        student.overallStatus = 'active';
      } else if (hasCompleted) {
        student.overallStatus = 'completed';
      } else if (hasCancelled) {
        student.overallStatus = 'left';
      } else {
        student.overallStatus = 'pending';
      }

      return student;
    });

    // Filter by status if provided
    if (params.status) {
      students = students.filter(s => s.overallStatus === params.status);
    }

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const total = students.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Apply pagination
    const paginatedStudents = students.slice(skip, skip + limit);

    return {
      data: paginatedStudents,
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
    logger.error('Failed to get enrolled students:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to get enrolled students');
  }
};

export interface EnrolledStudentDetail {
  participant: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    gender?: number | null;
    dob?: Date | null;
    age?: number | null;
    schoolName?: string | null;
    contactNumber?: string | null;
    profilePhoto?: string | null;
    disability?: number | null;
    address?: any | null;
  };
  user: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    mobile?: string | null;
    profileImage?: string | null;
  };
  batches: Array<{
    batch: {
      id: string;
      name: string;
      scheduled: {
        start_date: Date;
        start_time: string;
        end_time: string;
        training_days: string[];
      };
      duration: {
        count: number;
        type: string;
      };
      capacity: {
        min: number;
        max?: number | null;
      };
      age: {
        min: number;
        max: number;
      };
      admission_fee?: number | null;
      fee_structure?: any;
      status: string;
    };
    sport: {
      id: string;
      name: string;
      logo?: string | null;
    };
    center: {
      id: string;
      center_name: string;
      email?: string | null;
      mobile_number?: string | null;
      logo?: string | null;
      location?: {
        latitude: number;
        longitude: number;
        address: any;
      } | null;
    };
    booking: {
      id: string;
      status: BookingStatus;
      payment: {
        status: PaymentStatus;
        amount: number;
        currency: string;
        payment_method?: string | null;
        paid_at?: Date | null;
      };
      amount: number;
      currency: string;
      notes?: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    enrolledDate: Date;
  }>;
  overallStatus: 'active' | 'left' | 'completed' | 'pending';
  totalEnrollments: number;
  activeEnrollments: number;
}

/**
 * Get detailed information about a specific enrolled student
 */
export const getAcademyEnrolledStudentDetail = async (
  participantId: string,
  userId: string
): Promise<EnrolledStudentDetail> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new ApiError(404, t('user.notFound') || 'User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id').lean();

    if (coachingCenters.length === 0) {
      throw new ApiError(404, 'Student not found');
    }

    const centerIds = coachingCenters.map(center => center._id);

    // Validate participant ID
    if (!Types.ObjectId.isValid(participantId)) {
      throw new ApiError(400, 'Invalid participant ID');
    }
    const participantObjectId = new Types.ObjectId(participantId);

    // Get all bookings for this participant
    const bookings = await BookingModel.find({
      participants: participantObjectId,
      center: { $in: centerIds },
      is_deleted: false,
    })
      .populate('user', 'id firstName lastName email mobile profileImage')
      .populate('participants', 'id firstName lastName gender dob schoolName contactNumber profilePhoto disability address')
      .populate('batch', 'id name scheduled duration capacity age admission_fee fee_structure status sport center')
      .populate('center', 'id center_name email mobile_number logo location')
      .populate('sport', 'id name logo')
      .sort({ createdAt: -1 })
      .lean();

    if (bookings.length === 0) {
      throw new ApiError(404, 'Student not found or does not belong to your coaching centers');
    }

    // Get participant details from first booking
    const firstBooking = bookings[0] as any;
    const participant = Array.isArray(firstBooking.participants) 
      ? firstBooking.participants.find((p: any) => (p.id || p._id?.toString()) === participantId)
      : firstBooking.participants;

    if (!participant) {
      throw new ApiError(404, 'Participant not found');
    }

    const dob = participant.dob ? (typeof participant.dob === 'string' ? new Date(participant.dob) : participant.dob) : null;

    // Build detailed batches array
    const detailedBatches = bookings.map((booking: any) => {
      const batch = booking.batch || {};
      const sport = booking.sport || {};
      const center = booking.center || {};

      return {
        batch: {
          id: batch.id || batch._id?.toString() || '',
          name: batch.name || '',
          scheduled: batch.scheduled || {},
          duration: batch.duration || {},
          capacity: batch.capacity || {},
          age: batch.age || {},
          admission_fee: batch.admission_fee ?? null,
          fee_structure: batch.fee_structure || null,
          status: batch.status || '',
        },
        sport: {
          id: sport.id || sport._id?.toString() || '',
          name: sport.name || '',
          logo: sport.logo || null,
        },
        center: {
          id: center.id || center._id?.toString() || '',
          center_name: center.center_name || '',
          email: center.email || null,
          mobile_number: center.mobile_number || null,
          logo: center.logo || null,
          location: center.location || null,
        },
        booking: {
          id: booking.id || booking._id?.toString() || '',
          status: booking.status as BookingStatus,
          payment: {
            status: booking.payment?.status as PaymentStatus,
            amount: booking.priceBreakdown?.batch_amount || booking.payment?.amount || 0, // Show batch amount for academy
            currency: booking.payment?.currency || 'INR',
            payment_method: booking.payment?.payment_method || null,
            paid_at: booking.payment?.paid_at || null,
          },
          amount: booking.priceBreakdown?.batch_amount || booking.amount || 0, // Show only batch amount for academy
          currency: booking.currency || 'INR',
          notes: booking.notes || null,
          createdAt: booking.createdAt || new Date(),
          updatedAt: booking.updatedAt || new Date(),
        },
        enrolledDate: booking.createdAt || new Date(),
      };
    });

    // Calculate overall status
    const hasActive = detailedBatches.some(b => b.booking.status === BookingStatus.CONFIRMED);
    const hasCompleted = detailedBatches.some(b => b.booking.status === BookingStatus.COMPLETED);
    const hasCancelled = detailedBatches.some(b => b.booking.status === BookingStatus.CANCELLED);
    
    let overallStatus: 'active' | 'left' | 'completed' | 'pending' = 'pending';
    if (hasActive) {
      overallStatus = 'active';
    } else if (hasCompleted) {
      overallStatus = 'completed';
    } else if (hasCancelled) {
      overallStatus = 'left';
    }

    const activeEnrollments = detailedBatches.filter(b => b.booking.status === BookingStatus.CONFIRMED).length;

    return {
      participant: {
        id: participant.id || participant._id?.toString() || '',
        firstName: participant.firstName || null,
        lastName: participant.lastName || null,
        gender: participant.gender ?? null,
        dob: dob,
        age: calculateAgeFromDob(dob),
        schoolName: participant.schoolName || null,
        contactNumber: participant.contactNumber || null,
        profilePhoto: participant.profilePhoto || null,
        disability: participant.disability ?? null,
        address: participant.address || null,
      },
      user: {
        id: firstBooking.user?.id || firstBooking.user?._id?.toString() || '',
        firstName: firstBooking.user?.firstName || '',
        lastName: firstBooking.user?.lastName || null,
        email: firstBooking.user?.email || '',
        mobile: firstBooking.user?.mobile || null,
        profileImage: firstBooking.user?.profileImage || null,
      },
      batches: detailedBatches,
      overallStatus,
      totalEnrollments: detailedBatches.length,
      activeEnrollments,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to get enrolled student detail:', {
      error: error instanceof Error ? error.message : error,
    });
    throw new ApiError(500, 'Failed to get enrolled student detail');
  }
};

