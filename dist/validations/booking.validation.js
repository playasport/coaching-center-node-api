"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingDetailsSchema = exports.cancelBookingSchema = exports.academyBookingActionSchema = exports.createPaymentOrderSchema = exports.bookSlotSchema = exports.deleteOrderSchema = exports.userBookingListSchema = exports.academyEnrolledUsersSchema = exports.academyBookingExportSchema = exports.academyEnrolledStudentsSchema = exports.academyBookingListSchema = exports.verifyPaymentSchema = exports.bookingSummarySchema = void 0;
const zod_1 = require("zod");
// Booking summary request schema
exports.bookingSummarySchema = zod_1.z.object({
    query: zod_1.z.object({
        batchId: zod_1.z.string().min(1, 'Batch ID is required'),
        participantIds: zod_1.z
            .preprocess((val) => {
            // Handle array (from ?participantIds=id1&participantIds=id2)
            if (Array.isArray(val)) {
                return val;
            }
            // Handle string (from ?participantIds=id1,id2,id3)
            if (typeof val === 'string') {
                return val.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
            }
            return val;
        }, zod_1.z.array(zod_1.z.string().min(1, 'Each participant ID must be valid')).min(1, 'At least one participant ID is required')),
    }),
});
// Verify payment request schema
exports.verifyPaymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        razorpay_order_id: zod_1.z.string().min(1, 'Razorpay order ID is required'),
        razorpay_payment_id: zod_1.z.string().min(1, 'Razorpay payment ID is required'),
        razorpay_signature: zod_1.z.string().min(1, 'Razorpay signature is required'),
    }),
});
// Academy booking list query schema
exports.academyBookingListSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        centerId: zod_1.z.string().min(1, 'Center ID must be valid').optional(),
        batchId: zod_1.z.string().min(1, 'Batch ID must be valid').optional(),
        status: zod_1.z.enum(['slot_booked', 'approved', 'rejected', 'payment_pending', 'confirmed', 'cancelled', 'completed', 'requested', 'pending']).optional(), // Include legacy statuses for backward compatibility
        paymentStatus: zod_1.z.enum(['not_initiated', 'initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
    }),
});
// Academy enrolled students list query schema
exports.academyEnrolledStudentsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        centerId: zod_1.z.string().min(1, 'Center ID must be valid').optional(),
        batchId: zod_1.z.string().min(1, 'Batch ID must be valid').optional(),
        status: zod_1.z.enum(['active', 'left', 'completed', 'pending']).optional(),
    }),
});
// Academy booking export query schema
exports.academyBookingExportSchema = zod_1.z.object({
    query: zod_1.z.object({
        format: zod_1.z.enum(['excel', 'csv', 'pdf']),
        centerId: zod_1.z.string().min(1, 'Center ID must be valid').optional(),
        batchId: zod_1.z.string().min(1, 'Batch ID must be valid').optional(),
        status: zod_1.z.enum(['slot_booked', 'approved', 'rejected', 'payment_pending', 'confirmed', 'cancelled', 'completed', 'requested', 'pending']).optional(),
        paymentStatus: zod_1.z.enum(['not_initiated', 'initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
        type: zod_1.z.enum(['all', 'confirmed', 'pending', 'cancelled', 'rejected']).optional(),
    }),
});
// Academy enrolled users list query schema
exports.academyEnrolledUsersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        centerId: zod_1.z.string().min(1, 'Center ID must be valid').optional(),
        batchId: zod_1.z.string().min(1, 'Batch ID must be valid').optional(),
        userType: zod_1.z.enum(['student', 'guardian']).optional(),
        search: zod_1.z.string().min(1, 'Search query must be at least 1 character').optional(),
    }),
});
// User booking list query schema
exports.userBookingListSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).optional())
            .optional(),
        limit: zod_1.z
            .preprocess((val) => {
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? undefined : parsed;
            }
            return val;
        }, zod_1.z.number().int().min(1).max(100).optional())
            .optional(),
        status: zod_1.z.enum(['slot_booked', 'approved', 'rejected', 'payment_pending', 'confirmed', 'cancelled', 'completed', 'requested', 'pending']).optional(), // Include legacy statuses for backward compatibility
        paymentStatus: zod_1.z.enum(['not_initiated', 'initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled']).optional(),
    }),
});
// Delete order request schema
exports.deleteOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        razorpay_order_id: zod_1.z.string().min(1, 'Razorpay order ID is required'),
    }),
});
// Book slot request schema (same as createOrder but different flow)
exports.bookSlotSchema = zod_1.z.object({
    body: zod_1.z.object({
        batchId: zod_1.z.string().min(1, 'Batch ID is required'),
        participantIds: zod_1.z
            .array(zod_1.z.string().min(1, 'Participant ID is required'))
            .min(1, 'At least one participant ID is required'),
        notes: zod_1.z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
    }),
});
// Create payment order request schema (after academy approval)
exports.createPaymentOrderSchema = zod_1.z.object({
    params: zod_1.z.object({
        bookingId: zod_1.z.string().min(1, 'Booking ID is required'),
    }),
});
// Academy approve/reject booking request schema
exports.academyBookingActionSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Booking ID is required'),
    }),
    body: zod_1.z.object({
        reason: zod_1.z.string().min(1, 'Rejection reason is required').max(1000, 'Rejection reason must not exceed 1000 characters'),
    }),
});
// Cancel booking request schema
exports.cancelBookingSchema = zod_1.z.object({
    params: zod_1.z.object({
        bookingId: zod_1.z.string().min(1, 'Booking ID is required'),
    }),
    body: zod_1.z.object({
        reason: zod_1.z.string().min(1, 'Cancellation reason is required').max(500, 'Reason must be less than 500 characters'),
    }),
});
// Get booking details schema
exports.getBookingDetailsSchema = zod_1.z.object({
    params: zod_1.z.object({
        bookingId: zod_1.z.string().min(1, 'Booking ID is required'),
    }),
});
//# sourceMappingURL=booking.validation.js.map