import { z } from 'zod';

// Booking summary request schema
export const bookingSummarySchema = z.object({
  query: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
    participantIds: z
      .preprocess(
        (val) => {
          // Handle array (from ?participantIds=id1&participantIds=id2)
          if (Array.isArray(val)) {
            return val;
          }
          // Handle string (from ?participantIds=id1,id2,id3)
          if (typeof val === 'string') {
            return val.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
          }
          return val;
        },
        z.array(z.string().min(1, 'Each participant ID must be valid')).min(1, 'At least one participant ID is required')
      ),
  }),
});

export type BookingSummaryInput = z.infer<typeof bookingSummarySchema>['query'];

// Verify payment request schema
export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
    razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
    razorpay_signature: z.string().min(1, 'Razorpay signature is required'),
  }),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body'];

// Academy booking list query schema
export const academyBookingListSchema = z.object({
  query: z.object({
    page: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    centerId: z.string().min(1, 'Center ID must be valid').optional(),
    batchId: z.string().min(1, 'Batch ID must be valid').optional(),
    status: z.enum(['slot_booked', 'approved', 'rejected', 'payment_pending', 'confirmed', 'cancelled', 'completed', 'requested', 'pending']).optional(), // Include legacy statuses for backward compatibility
    paymentStatus: z.enum(['not_initiated', 'initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
  }),
});

// Academy enrolled students list query schema
export const academyEnrolledStudentsSchema = z.object({
  query: z.object({
    page: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    centerId: z.string().min(1, 'Center ID must be valid').optional(),
    batchId: z.string().min(1, 'Batch ID must be valid').optional(),
    status: z.enum(['active', 'left', 'completed', 'pending']).optional(),
  }),
});

// Academy booking export query schema
export const academyBookingExportSchema = z.object({
  query: z.object({
    format: z.enum(['excel', 'csv', 'pdf']),
    centerId: z.string().min(1, 'Center ID must be valid').optional(),
    batchId: z.string().min(1, 'Batch ID must be valid').optional(),
    status: z.enum(['slot_booked', 'approved', 'rejected', 'payment_pending', 'confirmed', 'cancelled', 'completed', 'requested', 'pending']).optional(),
    paymentStatus: z.enum(['not_initiated', 'initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
    type: z.enum(['all', 'confirmed', 'pending', 'cancelled', 'rejected']).optional(),
  }),
});

// Academy enrolled users list query schema
export const academyEnrolledUsersSchema = z.object({
  query: z.object({
    page: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    centerId: z.string().min(1, 'Center ID must be valid').optional(),
    batchId: z.string().min(1, 'Batch ID must be valid').optional(),
    userType: z.enum(['student', 'guardian']).optional(),
    search: z.string().min(1, 'Search query must be at least 1 character').optional(),
  }),
});

// User booking list query schema
export const userBookingListSchema = z.object({
  query: z.object({
    page: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).optional())
      .optional(),
    limit: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? undefined : parsed;
        }
        return val;
      }, z.number().int().min(1).max(100).optional())
      .optional(),
    status: z.enum(['slot_booked', 'approved', 'rejected', 'payment_pending', 'confirmed', 'cancelled', 'completed', 'requested', 'pending']).optional(), // Include legacy statuses for backward compatibility
    paymentStatus: z.enum(['not_initiated', 'initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
  }),
});

export type UserBookingListInput = z.infer<typeof userBookingListSchema>['query'];

// Delete order request schema
export const deleteOrderSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
  }),
});

export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>['body'];

// Book slot request schema (same as createOrder but different flow)
export const bookSlotSchema = z.object({
  body: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
    participantIds: z
      .array(z.string().min(1, 'Participant ID is required'))
      .min(1, 'At least one participant ID is required'),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
  }),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>['body'];

// Create payment order request schema (after academy approval)
export const createPaymentOrderSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>['params'];

// Academy approve/reject booking request schema
export const academyBookingActionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Booking ID is required'),
  }),
  body: z.object({
    reason: z.string().min(1, 'Rejection reason is required').max(1000, 'Rejection reason must not exceed 1000 characters'),
  }),
});

export type AcademyBookingActionInput = z.infer<typeof academyBookingActionSchema>;

// Cancel booking request schema
export const cancelBookingSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
  body: z.object({
    reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Reason must be less than 500 characters'),
  }),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// Get booking details schema
export const getBookingDetailsSchema = z.object({
  params: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
  }),
});

export type GetBookingDetailsInput = z.infer<typeof getBookingDetailsSchema>['params'];

