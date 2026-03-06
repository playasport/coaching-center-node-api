import { z } from 'zod';
export declare const bookingSummarySchema: z.ZodObject<{
    query: z.ZodObject<{
        batchId: z.ZodString;
        participantIds: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BookingSummaryInput = z.infer<typeof bookingSummarySchema>['query'];
export declare const verifyPaymentSchema: z.ZodObject<{
    body: z.ZodObject<{
        razorpay_order_id: z.ZodString;
        razorpay_payment_id: z.ZodString;
        razorpay_signature: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body'];
export declare const academyBookingListSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        centerId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            approved: "approved";
            rejected: "rejected";
            pending: "pending";
            completed: "completed";
            cancelled: "cancelled";
            slot_booked: "slot_booked";
            payment_pending: "payment_pending";
            confirmed: "confirmed";
            requested: "requested";
        }>>;
        paymentStatus: z.ZodOptional<z.ZodEnum<{
            success: "success";
            pending: "pending";
            failed: "failed";
            not_initiated: "not_initiated";
            initiated: "initiated";
            processing: "processing";
            refunded: "refunded";
            cancelled: "cancelled";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyEnrolledStudentsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        centerId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            pending: "pending";
            completed: "completed";
            active: "active";
            left: "left";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyBookingExportSchema: z.ZodObject<{
    query: z.ZodObject<{
        format: z.ZodEnum<{
            excel: "excel";
            csv: "csv";
            pdf: "pdf";
        }>;
        centerId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            approved: "approved";
            rejected: "rejected";
            pending: "pending";
            completed: "completed";
            cancelled: "cancelled";
            slot_booked: "slot_booked";
            payment_pending: "payment_pending";
            confirmed: "confirmed";
            requested: "requested";
        }>>;
        paymentStatus: z.ZodOptional<z.ZodEnum<{
            success: "success";
            pending: "pending";
            failed: "failed";
            not_initiated: "not_initiated";
            initiated: "initiated";
            processing: "processing";
            refunded: "refunded";
            cancelled: "cancelled";
        }>>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            rejected: "rejected";
            pending: "pending";
            cancelled: "cancelled";
            confirmed: "confirmed";
            all: "all";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const academyEnrolledUsersSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        centerId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        userType: z.ZodOptional<z.ZodEnum<{
            student: "student";
            guardian: "guardian";
        }>>;
        search: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userBookingListSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        status: z.ZodOptional<z.ZodEnum<{
            approved: "approved";
            rejected: "rejected";
            pending: "pending";
            completed: "completed";
            cancelled: "cancelled";
            slot_booked: "slot_booked";
            payment_pending: "payment_pending";
            confirmed: "confirmed";
            requested: "requested";
        }>>;
        paymentStatus: z.ZodOptional<z.ZodEnum<{
            success: "success";
            pending: "pending";
            failed: "failed";
            not_initiated: "not_initiated";
            initiated: "initiated";
            processing: "processing";
            refunded: "refunded";
            cancelled: "cancelled";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserBookingListInput = z.infer<typeof userBookingListSchema>['query'];
export declare const deleteOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        razorpay_order_id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>['body'];
export declare const bookSlotSchema: z.ZodObject<{
    body: z.ZodObject<{
        batchId: z.ZodString;
        participantIds: z.ZodArray<z.ZodString>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BookSlotInput = z.infer<typeof bookSlotSchema>['body'];
export declare const createPaymentOrderSchema: z.ZodObject<{
    params: z.ZodObject<{
        bookingId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>['params'];
export declare const academyBookingActionSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AcademyBookingActionInput = z.infer<typeof academyBookingActionSchema>;
export declare const cancelBookingSchema: z.ZodObject<{
    params: z.ZodObject<{
        bookingId: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        reason: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export declare const getBookingDetailsSchema: z.ZodObject<{
    params: z.ZodObject<{
        bookingId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type GetBookingDetailsInput = z.infer<typeof getBookingDetailsSchema>['params'];
export declare const publicPayQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PublicPayQueryInput = z.infer<typeof publicPayQuerySchema>['query'];
export declare const publicCreateOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PublicCreateOrderInput = z.infer<typeof publicCreateOrderSchema>['body'];
//# sourceMappingURL=booking.validation.d.ts.map