import { Types } from 'mongoose';
import { BookingModel, BookingStatus } from '../../models/booking.model';
import { BatchModel } from '../../models/batch.model';
import { ParticipantModel } from '../../models/participant.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { BatchStatus } from '../../enums/batchStatus.enum';
import { CoachingCenterStatus } from '../../enums/coachingCenterStatus.enum';
import { ApiError } from '../../utils/ApiError';
import { Gender } from '../../enums/gender.enum';

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob: Date, currentDate: Date): number => {
  const birthDate = new Date(dob);
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Map participant gender to Gender enum
 */
const mapParticipantGenderToEnum = (gender: string | null | undefined): Gender | null => {
  if (!gender) return null;
  if (Object.values(Gender).includes(gender as Gender)) {
    return gender as Gender;
  }
  return null;
};

/**
 * Validate and fetch participants
 */
export const validateAndFetchParticipants = async (
  participantIds: string[],
  userObjectId: Types.ObjectId
): Promise<any[]> => {
  if (participantIds.length === 0) {
    throw new ApiError(400, 'At least one participant ID is required');
  }

  // Validate all participant IDs
  for (const participantId of participantIds) {
    if (!Types.ObjectId.isValid(participantId)) {
      throw new ApiError(400, `Invalid participant ID: ${participantId}`);
    }
  }

  // Check for duplicate participant IDs
  const uniqueParticipantIds = [...new Set(participantIds)];
  if (uniqueParticipantIds.length !== participantIds.length) {
    throw new ApiError(400, 'Duplicate participant IDs are not allowed');
  }

  // Fetch all participants
  const participants = await ParticipantModel.find({
    _id: { $in: participantIds.map(id => new Types.ObjectId(id)) },
    is_deleted: false,
    is_active: true,
  }).lean();

  if (participants.length !== participantIds.length) {
    throw new ApiError(404, 'One or more participants not found or inactive');
  }

  // Verify all participants belong to user
  for (const participant of participants) {
    if (participant.userId.toString() !== userObjectId.toString()) {
      throw new ApiError(403, `Participant ${participant._id} does not belong to you`);
    }
  }

  return participants;
};

/**
 * Validate batch and fetch coaching center
 */
export const validateBatchAndCenter = async (batchId: string): Promise<{ batch: any; coachingCenter: any }> => {
  if (!Types.ObjectId.isValid(batchId)) {
    throw new ApiError(400, 'Invalid batch ID');
  }

  const batch = await BatchModel.findById(batchId)
    .select('_id id name sport center is_allowed_disabled status is_active is_deleted age capacity scheduled duration admission_fee base_price discounted_price gender')
    .populate('sport', 'id name')
    .populate('center', 'id center_name logo')
    .lean();

  // Validate batch exists
  if (!batch) {
    throw new ApiError(404, 'Batch not found');
  }

  // Validate batch is not deleted
  if (batch.is_deleted) {
    throw new ApiError(400, 'Batch has been deleted and is not available for booking');
  }

  // Validate batch is active (not disabled)
  if (!batch.is_active) {
    throw new ApiError(400, 'Batch is disabled and not available for booking');
  }

  // Check if batch is published
  if (batch.status !== BatchStatus.PUBLISHED) {
    throw new ApiError(400, 'Batch is not published and not available for booking');
  }

  // Use populated coaching center data (already fetched in populate)
  const populatedCenter = batch.center as any;
  if (!populatedCenter) {
    throw new ApiError(404, 'Coaching center not found');
  }

  // Fetch full coaching center details for validation (only if we need more fields than populated)
  // Since we only populated 'id center_name logo', we need to fetch full details for age/gender validation
  const centerId = populatedCenter._id || populatedCenter.id;
  const coachingCenter = await CoachingCenterModel.findById(centerId)
    .select('id center_name logo age allowed_genders allowed_disabled is_only_for_disabled is_active is_deleted status approval_status location experience')
    .lean();

  // Validate coaching center exists
  if (!coachingCenter) {
    throw new ApiError(404, 'Coaching center not found');
  }

  // Validate coaching center is not deleted
  if (coachingCenter.is_deleted) {
    throw new ApiError(400, 'Coaching center has been deleted and is not available for booking');
  }

  // Validate coaching center is active (not disabled)
  if (!coachingCenter.is_active) {
    throw new ApiError(400, 'Coaching center is disabled and not available for booking');
  }

  // Validate coaching center is published
  if (coachingCenter.status !== CoachingCenterStatus.PUBLISHED) {
    throw new ApiError(400, 'Coaching center is not published and not available for booking');
  }

  // Validate coaching center is approved
  if (coachingCenter.approval_status !== 'approved') {
    throw new ApiError(400, 'Coaching center is not approved and not available for booking');
  }

  return { batch, coachingCenter };
};

/**
 * Check if participants are already enrolled in the batch
 */
export const validateParticipantEnrollment = async (
  participantIds: Types.ObjectId[],
  batchId: Types.ObjectId
): Promise<void> => {
  // Check if any participant is already enrolled in this batch
  // Include REQUESTED, APPROVED, PENDING, and CONFIRMED statuses (all prevent duplicate enrollment)
  const existingBookings = await BookingModel.find({
    batch: batchId,
    participants: { $in: participantIds },
    status: { $in: [BookingStatus.SLOT_BOOKED, BookingStatus.APPROVED, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED, BookingStatus.REQUESTED, BookingStatus.PENDING] }, // Include legacy statuses for backward compatibility
    is_deleted: false,
  })
    .select('participants')
    .lean();

  if (existingBookings.length > 0) {
    // Find which participants are already enrolled
    const enrolledParticipantIds = new Set<string>();
    
    for (const booking of existingBookings) {
      for (const bookingParticipantId of booking.participants) {
        const participantIdStr = bookingParticipantId.toString();
        if (participantIds.some(id => id.toString() === participantIdStr)) {
          enrolledParticipantIds.add(participantIdStr);
        }
      }
    }

    if (enrolledParticipantIds.size > 0) {
      // Only fetch participant names if we need to show them in error message
      const enrolledIdsArray = Array.from(enrolledParticipantIds).map(id => new Types.ObjectId(id));
      const enrolledParticipants = await ParticipantModel.find({
        _id: { $in: enrolledIdsArray },
      })
        .select('firstName lastName')
        .lean();

      const participantNames = enrolledParticipants.map(p => {
        const firstName = p.firstName || '';
        const lastName = p.lastName || '';
        return `${firstName} ${lastName}`.trim() || p._id.toString();
      });

      const namesStr = participantNames.length > 0 
        ? participantNames.join(', ')
        : 'one or more participants';
      throw new ApiError(
        400,
        `${namesStr} ${participantNames.length === 1 ? 'is' : 'are'} already enrolled in this batch`
      );
    }
  }
};

/**
 * Validate slot availability
 */
export const validateSlotAvailability = async (
  batch: any,
  requestedSlots: number
): Promise<void> => {
  // Use aggregation to count total participants efficiently
  // Include REQUESTED, APPROVED, PENDING, and CONFIRMED statuses (all occupy slots)
  const result = await BookingModel.aggregate([
    {
      $match: {
        batch: batch._id,
        status: { $in: [BookingStatus.SLOT_BOOKED, BookingStatus.APPROVED, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED, BookingStatus.REQUESTED, BookingStatus.PENDING] }, // Include legacy statuses for backward compatibility
        is_deleted: false,
      },
    },
    {
      $project: {
        participantCount: { $size: { $ifNull: ['$participants', []] } },
      },
    },
    {
      $group: {
        _id: null,
        totalBookedParticipants: { $sum: '$participantCount' },
      },
    },
  ]);

  const totalBookedParticipants = result.length > 0 ? (result[0].totalBookedParticipants || 0) : 0;

  // Check if adding new participants would exceed capacity
  const totalAfterBooking = totalBookedParticipants + requestedSlots;

  if (batch.capacity.max !== null && batch.capacity.max !== undefined && totalAfterBooking > batch.capacity.max) {
    const availableSlots = batch.capacity.max - totalBookedParticipants;
    throw new ApiError(400, `Insufficient slots available. Only ${availableSlots} slot(s) remaining. Requested: ${requestedSlots}`);
  }
};

/**
 * Validate participant eligibility (age, gender, disability)
 * 
 * Validates:
 * 1. Age: Participant age must be within batch and coaching center age ranges
 * 2. Gender: Participant gender must be allowed by coaching center
 * 3. Disability: 
 *    - If coaching center is ONLY for disabled (is_only_for_disabled = true): participant MUST have disability
 *    - If coaching center does NOT allow disabled (allowed_disabled = false): participant MUST NOT have disability
 *    - Note: Batches inherit disability eligibility from their coaching center
 */
export const validateParticipantEligibility = async (
  participants: any[],
  batch: any,
  coachingCenter: any
): Promise<void> => {
  const currentDate = new Date();

  for (const participant of participants) {
    // Age Validation
    if (!participant.dob) {
      throw new ApiError(400, `Participant ${participant.firstName || participant._id} does not have a date of birth. Age validation is required.`);
    }

    const participantAge = calculateAge(participant.dob, currentDate);

    // Check against batch age range
    if (participantAge < batch.age.min || participantAge > batch.age.max) {
      throw new ApiError(
        400,
        `Participant ${participant.firstName || participant._id} age (${participantAge}) is outside the batch age range (${batch.age.min}-${batch.age.max} years)`
      );
    }

    // Check against coaching center age range
    if (participantAge < coachingCenter.age.min || participantAge > coachingCenter.age.max) {
      throw new ApiError(
        400,
        `Participant ${participant.firstName || participant._id} age (${participantAge}) is outside the coaching center age range (${coachingCenter.age.min}-${coachingCenter.age.max} years)`
      );
    }

    // Gender Validation
    // If participant gender is null or empty, allow all genders (skip validation)
    // If batch/center gender restrictions are null or empty, allow all genders
    // First check batch-level gender restriction (batch can be more restrictive than center)
    // Then check center-level gender restriction
    if (participant.gender !== null && participant.gender !== undefined && participant.gender !== '') {
      const participantGender = mapParticipantGenderToEnum(participant.gender);

      if (participantGender) {
        // Check batch gender restriction first (batch can override center setting)
        // If batch.gender is null or empty array, allow all genders
        if (batch.gender && Array.isArray(batch.gender) && batch.gender.length > 0) {
          const batchAllowedGenders = batch.gender.map((g: string) => g.toLowerCase());
          if (!batchAllowedGenders.includes(participantGender.toLowerCase())) {
            const allowedGendersStr = batch.gender.join(', ');
            throw new ApiError(
              400,
              `Participant ${participant.firstName || participant._id} gender (${participantGender}) is not allowed for this batch. Batch allowed genders: ${allowedGendersStr}`
            );
          }
        }
        // If batch.gender is null/empty, skip batch validation (allow all)

        // Also check coaching center gender restriction (for consistency)
        // If coachingCenter.allowed_genders is null or empty array, allow all genders
        if (coachingCenter.allowed_genders && Array.isArray(coachingCenter.allowed_genders) && coachingCenter.allowed_genders.length > 0) {
          if (!coachingCenter.allowed_genders.includes(participantGender)) {
            const allowedGendersStr = coachingCenter.allowed_genders.join(', ');
            throw new ApiError(
              400,
              `Participant ${participant.firstName || participant._id} gender (${participantGender}) is not allowed by the coaching center. Allowed genders: ${allowedGendersStr}`
            );
          }
        }
        // If coachingCenter.allowed_genders is null/empty, skip center validation (allow all)
      }
    }
    // If participant.gender is null/undefined/empty, skip all gender validation (allow all)

    // Disability Validation
    // Check if participant has a disability (0 = no, 1 = yes)
    const hasDisability = participant.disability === 1;

    // First check batch-level disability setting (batch can override center setting)
    if (!batch.is_allowed_disabled && hasDisability) {
      throw new ApiError(
        400,
        `Participant ${participant.firstName || participant._id || 'Unknown'} has a disability. This batch (${batch.name || 'Unknown'}) does not allow disabled participants.`
      );
    }

    // Then validate against coaching center disability settings
    if (coachingCenter.is_only_for_disabled) {
      // Coaching center is ONLY for disabled participants
      if (!hasDisability) {
        throw new ApiError(
          400,
          `Participant ${participant.firstName || participant._id || 'Unknown'} does not have a disability. This coaching center (${coachingCenter.center_name || 'Unknown'}) is exclusively for disabled participants.`
        );
      }
    } else {
      // Coaching center is NOT exclusively for disabled participants
      // Check if it allows disabled participants at all
      if (!coachingCenter.allowed_disabled && hasDisability) {
        throw new ApiError(
          400,
          `Participant ${participant.firstName || participant._id || 'Unknown'} has a disability. This coaching center (${coachingCenter.center_name || 'Unknown'}) does not allow disabled participants.`
        );
      }
    }

    // Note: Batch-level setting (is_allowed_disabled) takes precedence over center setting
    // If batch allows disabled but center doesn't, batch setting is checked first and will fail
    // If batch doesn't allow disabled, participant with disability cannot book regardless of center setting
  }
};
