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

// Create order request schema
export const createOrderSchema = z.object({
  body: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
    participantIds: z
      .array(z.string().min(1, 'Participant ID is required'))
      .min(1, 'At least one participant ID is required'),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];

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
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
    paymentStatus: z.enum(['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
  }),
});

// Academy booking status update schema
export const academyBookingStatusUpdateSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  }),
  params: z.object({
    id: z.string().min(1, 'Booking ID is required'),
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
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
    paymentStatus: z.enum(['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
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

