import { Types } from 'mongoose';
/**
 * Validate and fetch participants
 */
export declare const validateAndFetchParticipants: (participantIds: string[], userObjectId: Types.ObjectId) => Promise<any[]>;
/**
 * Validate batch and fetch coaching center
 */
export declare const validateBatchAndCenter: (batchId: string) => Promise<{
    batch: any;
    coachingCenter: any;
}>;
/**
 * Check if participants are already enrolled in the batch
 */
export declare const validateParticipantEnrollment: (participantIds: Types.ObjectId[], batchId: Types.ObjectId) => Promise<void>;
/**
 * Validate slot availability
 */
export declare const validateSlotAvailability: (batch: any, requestedSlots: number) => Promise<void>;
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
export declare const validateParticipantEligibility: (participants: any[], batch: any, coachingCenter: any) => Promise<void>;
//# sourceMappingURL=booking.helpers.validation.d.ts.map