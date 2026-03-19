"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBookingBySystem = exports.PAYMENT_EXPIRED_CANCELLATION_REASON = exports.cancelBooking = exports.deleteOrder = exports.downloadBookingInvoice = exports.getBookingDetails = exports.getUserBookings = exports.verifyPayment = exports.createOrderByPaymentToken = exports.getBookingByPaymentToken = exports.createPaymentOrder = exports.bookSlot = exports.getBookingSummary = exports.calculateAge = exports.generateBookingId = void 0;
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../../models/booking.model");
const transaction_model_1 = require("../../models/transaction.model");
const batch_model_1 = require("../../models/batch.model");
const participant_model_1 = require("../../models/participant.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const user_model_1 = require("../../models/user.model");
const defaultRoles_enum_1 = require("../../enums/defaultRoles.enum");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const PaymentService_1 = require("../common/payment/PaymentService");
const env_1 = require("../../config/env");
const notificationQueue_service_1 = require("../common/notificationQueue.service");
const notification_service_1 = require("../common/notification.service");
const auditTrail_service_1 = require("../common/auditTrail.service");
const auditTrail_model_1 = require("../../models/auditTrail.model");
const notificationMessages_1 = require("../common/notificationMessages");
// Import helper functions
const booking_helpers_validation_1 = require("./booking.helpers.validation");
const booking_helpers_calculation_1 = require("./booking.helpers.calculation");
const booking_helpers_utils_1 = require("./booking.helpers.utils");
Object.defineProperty(exports, "generateBookingId", { enumerable: true, get: function () { return booking_helpers_utils_1.generateBookingId; } });
Object.defineProperty(exports, "calculateAge", { enumerable: true, get: function () { return booking_helpers_utils_1.calculateAge; } });
// Get payment service instance
const paymentService = (0, PaymentService_1.getPaymentService)();
/**
 * Get booking summary before creating order
 */
const getBookingSummary = async (data, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Validate participants and batch/center in parallel (independent operations)
        const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
        const [participants, batchAndCenter] = await Promise.all([
            (0, booking_helpers_validation_1.validateAndFetchParticipants)(participantIds, userObjectId),
            (0, booking_helpers_validation_1.validateBatchAndCenter)(data.batchId),
        ]);
        const { batch, coachingCenter } = batchAndCenter;
        // Validate slot availability and participant enrollment in parallel (independent operations)
        const participantObjectIds = participants.map(p => p._id);
        await Promise.all([
            (0, booking_helpers_validation_1.validateSlotAvailability)(batch, participants.length),
            (0, booking_helpers_validation_1.validateParticipantEnrollment)(participantObjectIds, batch._id),
        ]);
        // Validate participant eligibility (age, gender, disability) - depends on participants, batch, and center
        await (0, booking_helpers_validation_1.validateParticipantEligibility)(participants, batch, coachingCenter);
        // Calculate amount
        const admissionFeePerParticipant = batch.admission_fee || 0;
        const perParticipantFee = (0, booking_helpers_calculation_1.getPerParticipantFee)(batch);
        const participantCount = participants.length;
        // Calculate base amount: (admission fee + base fee) * participant count
        const totalAdmissionFee = (0, booking_helpers_calculation_1.roundToTwoDecimals)(admissionFeePerParticipant * participantCount);
        const totalBaseFee = (0, booking_helpers_calculation_1.roundToTwoDecimals)(perParticipantFee * participantCount);
        const baseAmount = (0, booking_helpers_calculation_1.roundToTwoDecimals)(totalAdmissionFee + totalBaseFee);
        // Get fee configuration from settings (fallback to config for backward compatibility)
        // Fetch all settings in parallel to reduce database queries
        const { getSettings } = await Promise.resolve().then(() => __importStar(require('../common/settings.service')));
        const settings = await getSettings(false);
        const platformFee = settings.fees?.platform_fee ?? env_1.config.booking.platformFee;
        const gstPercentage = settings.fees?.gst_percentage ?? env_1.config.booking.gstPercentage;
        const isGstEnabled = settings.fees?.gst_enabled ?? true;
        // Subtotal = base amount only (without platform fee)
        // This allows frontend to show: subtotal, then platform fee, then GST, then total
        const subtotal = (0, booking_helpers_calculation_1.roundToTwoDecimals)(baseAmount);
        // GST calculation - applied only on platform_fee, not on the entire amount
        const gst = isGstEnabled ? (0, booking_helpers_calculation_1.roundToTwoDecimals)((platformFee * gstPercentage) / 100) : 0;
        // Total amount: baseAmount + platformFee + GST (on platform_fee only)
        const totalAmount = (0, booking_helpers_calculation_1.roundToTwoDecimals)(baseAmount + platformFee + gst);
        if (totalAmount <= 0) {
            throw new ApiError_1.ApiError(400, 'Booking amount must be greater than zero');
        }
        // Calculate price breakdown and commission (for internal use, not returned to client)
        // These are calculated but not included in the response
        await (0, booking_helpers_calculation_1.calculatePriceBreakdownAndCommission)(admissionFeePerParticipant, perParticipantFee, participantCount, baseAmount);
        // Return only relevant data (exclude internal priceBreakdown and commission)
        const response = {
            batch: {
                id: batch._id.toString(),
                name: batch.name,
                sport: {
                    id: batch.sport?._id?.toString() || batch.sport?.id || '',
                    name: batch.sport?.name || '',
                },
                center: {
                    id: batch.center?._id?.toString() || batch.center?.id || '',
                    name: batch.center?.center_name || '',
                    logo: batch.center?.logo || null,
                    address: coachingCenter.location?.address || null,
                    experience: coachingCenter.experience ?? null,
                },
                scheduled: batch.scheduled,
                duration: batch.duration,
                admission_fee: batch.admission_fee,
                base_price: batch.base_price,
                discounted_price: batch.discounted_price,
            },
            participants: participants.map(p => {
                const dob = p.dob ? new Date(p.dob) : null;
                const age = dob ? (0, booking_helpers_utils_1.calculateAge)(dob, new Date()) : null;
                return {
                    id: p._id.toString(),
                    firstName: p.firstName,
                    middleName: p.middleName,
                    lastName: p.lastName,
                    gender: p.gender,
                    age,
                };
            }),
            amount: totalAmount,
            currency: 'INR',
            breakdown: {
                admission_fee_per_participant: admissionFeePerParticipant > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(admissionFeePerParticipant) : undefined,
                admission_fee: totalAdmissionFee > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(totalAdmissionFee) : undefined,
                base_fee: totalBaseFee > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(totalBaseFee) : undefined,
                per_participant_fee: perParticipantFee > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(perParticipantFee) : undefined,
                platform_fee: platformFee > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(platformFee) : undefined,
                subtotal: subtotal > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(subtotal) : undefined,
                gst: gst > 0 ? (0, booking_helpers_calculation_1.roundToTwoDecimals)(gst) : undefined,
                gst_percentage: gstPercentage,
                total: (0, booking_helpers_calculation_1.roundToTwoDecimals)(totalAmount),
            },
        };
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get booking summary:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            data: { batchId: data.batchId, participantIds: data.participantIds },
        });
        // Include the actual error message if it's an Error instance
        const errorMessage = error instanceof Error ? error.message : 'Failed to get booking summary';
        throw new ApiError_1.ApiError(500, errorMessage);
    }
};
exports.getBookingSummary = getBookingSummary;
/**
 * Book slot - Create booking request (new flow)
 * This creates a booking with SLOT_BOOKED status, occupies slots, and sends notifications
 */
const bookSlot = async (data, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get booking summary - this already does all validations
        const summary = await (0, exports.getBookingSummary)({
            batchId: data.batchId,
            participantIds: data.participantIds,
        }, userId);
        // All validations are already done in getBookingSummary
        const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
        const participantObjectIds = participantIds.map(id => new mongoose_1.Types.ObjectId(id));
        const batchObjectId = new mongoose_1.Types.ObjectId(data.batchId);
        // Validate and convert center and sport IDs to ObjectIds
        // The summary returns IDs as strings, but we need to validate they exist and are valid
        const centerId = summary.batch.center.id;
        const sportId = summary.batch.sport.id;
        if (!centerId || !mongoose_1.Types.ObjectId.isValid(centerId)) {
            logger_1.logger.error('Invalid center ID in booking summary', {
                centerId,
                summary: JSON.stringify(summary.batch.center),
            });
            throw new ApiError_1.ApiError(400, `Invalid center ID in booking summary: ${centerId || 'undefined'}`);
        }
        if (!sportId || !mongoose_1.Types.ObjectId.isValid(sportId)) {
            logger_1.logger.error('Invalid sport ID in booking summary', {
                sportId,
                summary: JSON.stringify(summary.batch.sport),
            });
            throw new ApiError_1.ApiError(400, `Invalid sport ID in booking summary: ${sportId || 'undefined'}`);
        }
        const centerObjectId = new mongoose_1.Types.ObjectId(centerId);
        const sportObjectId = new mongoose_1.Types.ObjectId(sportId);
        // Use data from summary instead of re-fetching batch
        // Summary already has all the batch data we need
        const admissionFeePerParticipant = summary.batch.admission_fee || 0;
        const perParticipantFee = (0, booking_helpers_calculation_1.getPerParticipantFee)(summary.batch);
        const participantCount = participantIds.length;
        const totalAdmissionFee = (0, booking_helpers_calculation_1.roundToTwoDecimals)(admissionFeePerParticipant * participantCount);
        const totalBaseFee = (0, booking_helpers_calculation_1.roundToTwoDecimals)(perParticipantFee * participantCount);
        const baseAmount = (0, booking_helpers_calculation_1.roundToTwoDecimals)(totalAdmissionFee + totalBaseFee);
        // Parallelize price calculation and booking ID generation (independent operations)
        const [priceBreakdownAndCommission, bookingId] = await Promise.all([
            (0, booking_helpers_calculation_1.calculatePriceBreakdownAndCommission)(admissionFeePerParticipant, perParticipantFee, participantCount, baseAmount),
            (0, booking_helpers_utils_1.generateBookingId)(),
        ]);
        const { priceBreakdown, commission } = priceBreakdownAndCommission;
        // Create booking record with SLOT_BOOKED status (no payment order yet)
        const bookingData = {
            user: userObjectId,
            participants: participantObjectIds,
            batch: batchObjectId,
            center: centerObjectId,
            sport: sportObjectId,
            amount: summary.amount,
            currency: summary.currency,
            status: booking_model_1.BookingStatus.SLOT_BOOKED, // User has booked the slot, waiting for academy approval
            booking_id: bookingId,
            payment: {
                amount: summary.amount,
                currency: summary.currency,
                status: booking_model_1.PaymentStatus.NOT_INITIATED, // Payment not initiated yet, waiting for academy approval
                payment_initiated_count: 0, // Initialize payment attempt counters
                payment_cancelled_count: 0,
                payment_failed_count: 0,
            },
            commission: commission || null,
            priceBreakdown: priceBreakdown || null,
            notes: data.notes || null,
        };
        const booking = new booking_model_1.BookingModel(bookingData);
        await booking.save();
        // Fetch notification data in parallel (batch name, center details, user details, academy owner)
        // Use summary data where possible to avoid redundant queries
        const [centerDetails, userDetails, academyOwner] = await Promise.all([
            coachingCenter_model_1.CoachingCenterModel.findById(centerObjectId).select('center_name user email mobile_number').lean(),
            user_model_1.UserModel.findById(userObjectId).select('id firstName lastName email mobile').lean(),
            // Fetch academy owner in parallel if center has user reference
            (async () => {
                const center = await coachingCenter_model_1.CoachingCenterModel.findById(centerObjectId).select('user').lean();
                if (center?.user) {
                    return user_model_1.UserModel.findById(center.user).select('id email mobile').lean();
                }
                return null;
            })(),
        ]);
        const centerOwnerId = centerDetails?.user?.toString();
        const participantNames = summary.participants.map(p => `${p.firstName || ''} ${p.middleName || ''} ${p.lastName || ''}`.trim() || 'Participant').join(', ');
        const batchName = summary.batch.name; // Use from summary instead of re-fetching
        const centerName = centerDetails?.center_name || 'Academy';
        const userName = userDetails ? `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || userDetails.email || 'User' : 'User';
        // Create audit trail and send notifications in parallel (fire-and-forget for notifications)
        // Audit trail is important, but notifications can be async
        const auditTrailPromise = (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.BOOKING_REQUESTED, auditTrail_model_1.ActionScale.MEDIUM, `Booking request created for batch ${batchName}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: centerObjectId,
            bookingId: booking._id,
            metadata: {
                batchId: data.batchId,
                participantCount: participantIds.length,
                amount: summary.amount,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for booking', { error, bookingId: booking.id });
        });
        // Notification to Academy Owner (Push + Email + SMS + WhatsApp) - fire-and-forget
        if (centerOwnerId && academyOwner) {
            // Fire-and-forget notifications (don't await, but catch errors)
            (async () => {
                try {
                    // Push notification (fire-and-forget)
                    const academyPushNotification = (0, notificationMessages_1.getBookingRequestAcademyPush)({
                        batchName,
                        userName,
                        participants: participantNames,
                    });
                    (0, notification_service_1.createAndSendNotification)({
                        recipientType: 'academy',
                        recipientId: academyOwner.id,
                        title: academyPushNotification.title,
                        body: academyPushNotification.body,
                        channels: ['push'],
                        priority: 'high',
                        data: {
                            type: 'booking_request',
                            bookingId: booking.id || booking.booking_id,
                            batchId: data.batchId,
                            centerId: summary.batch.center.id,
                        },
                    }).catch((error) => {
                        logger_1.logger.error('Failed to send push notification to academy owner', { error, bookingId: booking.booking_id || booking.id });
                    });
                    // Email notification (async)
                    const academyEmail = centerDetails?.email || academyOwner.email;
                    if (academyEmail) {
                        (0, notificationQueue_service_1.queueEmail)(academyEmail, notificationMessages_1.EmailSubjects.BOOKING_REQUEST_ACADEMY, {
                            template: notificationMessages_1.EmailTemplates.BOOKING_REQUEST_ACADEMY,
                            text: (0, notificationMessages_1.getBookingRequestAcademyEmailText)({
                                batchName,
                                userName,
                                participants: participantNames,
                            }),
                            templateVariables: {
                                centerName,
                                batchName,
                                userName,
                                participants: participantNames,
                                bookingId: booking.booking_id ?? undefined,
                                year: new Date().getFullYear(),
                            },
                            priority: 'high',
                            metadata: {
                                type: 'booking_request',
                                bookingId: booking.booking_id ?? undefined,
                                recipient: 'academy',
                            },
                        });
                    }
                    // SMS notification (async)
                    const academyMobile = centerDetails?.mobile_number || academyOwner.mobile;
                    if (academyMobile) {
                        const smsMessage = (0, notificationMessages_1.getBookingRequestAcademySms)({
                            batchName,
                            userName,
                            participants: participantNames,
                            bookingId: booking.booking_id ?? undefined,
                        });
                        (0, notificationQueue_service_1.queueSms)(academyMobile, smsMessage, 'high', {
                            type: 'booking_request',
                            bookingId: booking.booking_id ?? undefined,
                            recipient: 'academy',
                        });
                    }
                    // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
                    // if (academyMobile) {
                    //   const whatsappMessage = getBookingRequestAcademyWhatsApp({
                    //     batchName,
                    //     userName,
                    //     participants: participantNames,
                    //     bookingId: booking.booking_id ?? undefined,
                    //   });
                    //   queueWhatsApp(academyMobile, whatsappMessage, 'high', {
                    //     type: 'booking_request',
                    //     bookingId: booking.booking_id ?? undefined,
                    //     recipient: 'academy',
                    //   });
                    // }
                }
                catch (error) {
                    logger_1.logger.error('Failed to send academy notifications', { error, bookingId: booking.booking_id ?? booking.id });
                }
            })().catch(() => {
                // Errors already logged in try-catch
            });
        }
        // Notification to User (Push + Email + SMS + WhatsApp)
        // Push notification (fire-and-forget)
        const userPushNotification = (0, notificationMessages_1.getBookingRequestSentUserPush)({
            batchName,
        });
        const userNotificationPromise = (0, notification_service_1.createAndSendNotification)({
            recipientType: 'user',
            recipientId: userId,
            title: userPushNotification.title,
            body: userPushNotification.body,
            channels: ['push'],
            priority: 'medium',
            data: {
                type: 'booking_request_sent',
                bookingId: booking.id,
                batchId: data.batchId,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to send push notification to user', { error, bookingId: booking.id });
        });
        // Email notification (async)
        if (userDetails?.email) {
            (0, notificationQueue_service_1.queueEmail)(userDetails.email, notificationMessages_1.EmailSubjects.BOOKING_REQUEST_SENT_USER, {
                template: notificationMessages_1.EmailTemplates.BOOKING_REQUEST_SENT_USER,
                text: (0, notificationMessages_1.getBookingRequestSentUserEmailText)({
                    batchName,
                    centerName,
                }),
                templateVariables: {
                    userName,
                    batchName,
                    centerName,
                    participants: participantNames,
                    bookingId: booking.booking_id ?? booking.id,
                    year: new Date().getFullYear(),
                },
                priority: 'medium',
                metadata: {
                    type: 'booking_request_sent',
                    bookingId: booking.id,
                    recipient: 'user',
                },
            });
        }
        // SMS notification (async)
        if (userDetails?.mobile) {
            const smsMessage = (0, notificationMessages_1.getBookingRequestSentUserSms)({
                batchName,
                centerName,
                bookingId: booking.booking_id ?? undefined,
            });
            (0, notificationQueue_service_1.queueSms)(userDetails.mobile, smsMessage, 'medium', {
                type: 'booking_request_sent',
                bookingId: booking.id,
                recipient: 'user',
            });
        }
        // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
        // if (userDetails?.mobile) {
        //   const whatsappMessage = getBookingRequestSentUserWhatsApp({
        //     batchName,
        //     centerName,
        //     participants: participantNames,
        //     bookingId: booking.booking_id ?? undefined,
        //   });
        //   queueWhatsApp(userDetails.mobile, whatsappMessage, 'medium', {
        //     type: 'booking_request_sent',
        //     bookingId: booking.id,
        //     recipient: 'user',
        //   });
        // }
        // Notification to Admin (role-based) - fire-and-forget
        const adminPushNotification = (0, notificationMessages_1.getBookingRequestAdminPush)({
            userName: userDetails?.firstName || 'User',
            batchName,
            centerName,
        });
        const adminNotificationPromise = (0, notification_service_1.createAndSendNotification)({
            recipientType: 'role',
            roles: [defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN],
            title: adminPushNotification.title,
            body: adminPushNotification.body,
            channels: ['push'],
            priority: 'medium',
            data: {
                type: 'booking_request_admin',
                bookingId: booking.booking_id || booking.id,
                batchId: data.batchId,
                centerId: summary.batch.center.id,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to send admin notification', { error, bookingId: booking.booking_id || booking.id });
        });
        // Wait for audit trail (important for tracking), but don't block on notifications
        await auditTrailPromise;
        logger_1.logger.info(`Booking request created: ${booking.id} for user ${userId}`);
        // Construct response directly from booking object and summary data (no need to re-fetch)
        // This avoids an extra database query with populate
        const response = {
            id: booking.id || booking._id?.toString() || '',
            booking_id: booking.booking_id || '',
            status: booking.status,
            amount: booking.amount,
            currency: booking.currency,
            payment: {
                status: booking.payment.status,
            },
            batch: {
                id: batchObjectId.toString(),
                name: batchName,
            },
            center: {
                id: centerObjectId.toString(),
                center_name: centerName,
            },
            sport: {
                id: sportObjectId.toString(),
                name: summary.batch.sport.name,
            },
            createdAt: booking.createdAt || new Date(),
        };
        // Don't await notifications - they're fire-and-forget
        // This allows the API to return immediately while notifications are processed in background
        Promise.all([userNotificationPromise, adminNotificationPromise]).catch(() => {
            // Errors already logged in individual catch blocks
        });
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to book slot:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            data: {
                batchId: data.batchId,
                participantIds: data.participantIds,
                userId,
            },
        });
        // Include the actual error message for debugging
        throw new ApiError_1.ApiError(500, `Failed to book slot`);
    }
};
exports.bookSlot = bookSlot;
/**
 * Create payment order after academy approval
 * This is called after academy approves the booking request
 */
const createPaymentOrder = async (bookingId, userId) => {
    try {
        // Validate user first
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Find booking - must be APPROVED status
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            user: userObjectId,
            status: booking_model_1.BookingStatus.APPROVED,
            is_deleted: false,
        }).lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'booking not found');
        }
        // Validate booking amount
        if (!booking.amount || booking.amount <= 0) {
            throw new ApiError_1.ApiError(400, 'Invalid booking amount. Cannot create payment order.');
        }
        if (!booking.currency || booking.currency.trim() === '') {
            throw new ApiError_1.ApiError(400, 'Booking currency is required.');
        }
        // Create Razorpay order and prepare update data in parallel
        const currentInitiatedCount = booking.payment?.payment_initiated_count || 0;
        const receipt = `booking_${Date.now()}_${userObjectId.toString().slice(-6)}`;
        // Convert amount to paise (smallest currency unit for INR)
        const amountInPaise = Math.round(booking.amount * 100);
        if (amountInPaise <= 0 || amountInPaise < 100) {
            throw new ApiError_1.ApiError(400, 'Payment amount must be at least ₹1.00 (100 paise).');
        }
        // Create order (this is the main external API call)
        const paymentOrder = await paymentService.createOrder({
            amount: amountInPaise,
            currency: booking.currency.toUpperCase(),
            receipt,
            notes: {
                userId: userId,
                bookingId: booking.id,
                batchId: booking.batch.toString(),
                centerId: booking.center.toString(),
            },
        });
        // Update booking with razorpay order ID and payment status
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                'payment.razorpay_order_id': paymentOrder.id,
                'payment.status': booking_model_1.PaymentStatus.INITIATED, // Payment initiated, waiting for user to complete payment
                'payment.payment_initiated_count': currentInitiatedCount + 1,
            },
        }, { new: true })
            .select('id booking_id status amount currency payment')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to update booking with payment order');
        }
        // Create transaction record when payment is initiated
        try {
            await transaction_model_1.TransactionModel.findOneAndUpdate({
                booking: booking._id,
                razorpay_order_id: paymentOrder.id,
            }, {
                $set: {
                    // Only update fields that should be updated if transaction already exists
                    razorpay_payment_id: null, // Will be set when payment is verified
                    razorpay_signature: null, // Will be set when payment is verified
                    payment_method: null, // Will be set when payment is verified
                    processed_at: null, // Will be set when payment is verified
                },
                $setOnInsert: {
                    // Only set these fields when creating a new document
                    user: booking.user,
                    booking: booking._id,
                    razorpay_order_id: paymentOrder.id,
                    amount: booking.amount,
                    currency: booking.currency,
                    type: transaction_model_1.TransactionType.PAYMENT,
                    status: transaction_model_1.TransactionStatus.PENDING, // Set status only on insert
                    source: transaction_model_1.TransactionSource.USER_VERIFICATION, // Set source only on insert
                },
            }, { upsert: true, new: true, lean: true });
            logger_1.logger.info('Transaction record created/updated for payment initiation', {
                bookingId: booking.id,
                razorpay_order_id: paymentOrder.id,
            });
        }
        catch (transactionError) {
            // Log but don't fail payment order creation
            logger_1.logger.error('Failed to create transaction record for payment initiation', {
                bookingId: booking.id,
                razorpay_order_id: paymentOrder.id,
                error: transactionError instanceof Error ? transactionError.message : transactionError,
                stack: transactionError instanceof Error ? transactionError.stack : undefined,
            });
        }
        // Create audit trail asynchronously (non-blocking) - don't await
        (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_INITIATED, auditTrail_model_1.ActionScale.MEDIUM, `Payment order created for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                razorpayOrderId: paymentOrder.id,
                amount: booking.amount,
                payment_initiated_count: currentInitiatedCount + 1,
            },
        }).catch((error) => {
            logger_1.logger.error('Failed to create audit trail for payment initiation', {
                bookingId: booking.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        logger_1.logger.info(`Payment order created for booking: ${booking.id}`);
        // Return only relevant data
        const response = {
            booking: {
                id: updatedBooking.id || updatedBooking._id?.toString() || '',
                booking_id: updatedBooking.booking_id || '',
                status: updatedBooking.status,
                amount: updatedBooking.amount,
                currency: updatedBooking.currency,
                payment: {
                    razorpay_order_id: updatedBooking.payment.razorpay_order_id || paymentOrder.id,
                    status: updatedBooking.payment.status,
                },
            },
            razorpayOrder: {
                id: paymentOrder.id,
                amount: paymentOrder.amount,
                currency: paymentOrder.currency,
                receipt: paymentOrder.receipt,
                status: paymentOrder.status,
                created_at: paymentOrder.created_at,
            },
        };
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create payment order:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, 'Failed to create payment order');
    }
};
exports.createPaymentOrder = createPaymentOrder;
/**
 * Get booking by payment token for public pay page (no auth).
 * Returns booking details and payment_enabled so frontend can show Pay button or already paid/cancelled/expired state.
 */
const getBookingByPaymentToken = async (token) => {
    if (!token || token.trim() === '') {
        throw new ApiError_1.ApiError(400, 'Invalid or missing payment token');
    }
    const booking = await booking_model_1.BookingModel.findOne({
        payment_token: token.trim(),
        is_deleted: false,
    })
        .populate('participants', 'id firstName lastName dob profilePhoto')
        .populate({
        path: 'batch',
        select: 'id name scheduled duration center sport',
        populate: [
            { path: 'sport', select: 'id name logo' },
            { path: 'center', select: 'id center_name logo' },
        ],
    })
        .select('id booking_id participants batch amount currency status payment payment_token payment_token_expires_at rejection_reason cancellation_reason createdAt')
        .lean();
    if (!booking) {
        throw new ApiError_1.ApiError(404, 'Payment link is invalid or has expired');
    }
    const now = new Date();
    const expiresAt = booking.payment_token_expires_at ? new Date(booking.payment_token_expires_at) : null;
    if (expiresAt && expiresAt.getTime() < now.getTime()) {
        throw new ApiError_1.ApiError(400, 'This payment link has expired. Please request a new link or log in to pay.');
    }
    const bookingStatus = booking.status || booking_model_1.BookingStatus.PENDING;
    const paymentStatus = booking.payment?.status || booking_model_1.PaymentStatus.PENDING;
    return {
        id: booking.id,
        booking_id: booking.booking_id || booking.id,
        batch: {
            id: booking.batch?._id?.toString() || booking.batch?.id || '',
            name: booking.batch?.name || 'N/A',
            scheduled: booking.batch?.scheduled || { start_date: new Date(), start_time: '', end_time: '', training_days: [] },
            duration: booking.batch?.duration || { count: 0, type: '' },
        },
        participants: (booking.participants || []).map((p) => {
            const dob = p.dob ? new Date(p.dob) : null;
            const age = dob ? (0, booking_helpers_utils_1.calculateAge)(dob, new Date()) : null;
            return {
                id: p._id?.toString() || p.id || '',
                firstName: p.firstName || '',
                lastName: p.lastName || '',
                age: age ?? null,
                profilePhoto: p.profilePhoto ?? null,
            };
        }),
        center: {
            id: booking.batch?.center?._id?.toString() || booking.batch?.center?.id || '',
            center_name: booking.batch?.center?.center_name || 'N/A',
            logo: booking.batch?.center?.logo ?? null,
        },
        sport: {
            id: booking.batch?.sport?._id?.toString() || booking.batch?.sport?.id || '',
            name: booking.batch?.sport?.name || 'N/A',
            logo: booking.batch?.sport?.logo ?? null,
        },
        amount: booking.amount || 0,
        currency: booking.currency || 'INR',
        status: bookingStatus,
        status_message: (0, booking_helpers_utils_1.getBookingStatusMessage)(bookingStatus, paymentStatus),
        payment_status: paymentStatus === booking_model_1.PaymentStatus.SUCCESS ? 'paid' : paymentStatus,
        payment_enabled: (0, booking_helpers_utils_1.isPaymentLinkEnabled)(bookingStatus, paymentStatus),
        can_download_invoice: (0, booking_helpers_utils_1.canDownloadInvoice)(bookingStatus, paymentStatus),
        rejection_reason: bookingStatus === booking_model_1.BookingStatus.REJECTED ? booking.rejection_reason || null : null,
        cancellation_reason: bookingStatus === booking_model_1.BookingStatus.CANCELLED ? booking.cancellation_reason || null : null,
        token_expires_at: expiresAt,
        razorpay_key_id: env_1.config.razorpay?.keyId || '',
    };
};
exports.getBookingByPaymentToken = getBookingByPaymentToken;
/**
 * Create Razorpay order by payment token (public, no auth).
 * Use when user clicks Pay on the public pay page. Webhook will verify payment.
 */
const createOrderByPaymentToken = async (token) => {
    if (!token || token.trim() === '') {
        throw new ApiError_1.ApiError(400, 'Invalid or missing payment token');
    }
    const booking = await booking_model_1.BookingModel.findOne({
        payment_token: token.trim(),
        status: booking_model_1.BookingStatus.APPROVED,
        is_deleted: false,
    }).lean();
    if (!booking) {
        throw new ApiError_1.ApiError(404, 'Booking not found or payment is not available for this link');
    }
    const now = new Date();
    const expiresAt = booking.payment_token_expires_at ? new Date(booking.payment_token_expires_at) : null;
    if (expiresAt && expiresAt.getTime() < now.getTime()) {
        throw new ApiError_1.ApiError(400, 'This payment link has expired. Please request a new link.');
    }
    if (booking.payment?.status === booking_model_1.PaymentStatus.SUCCESS) {
        throw new ApiError_1.ApiError(400, 'This booking has already been paid.');
    }
    if (!booking.amount || booking.amount <= 0) {
        throw new ApiError_1.ApiError(400, 'Invalid booking amount. Cannot create payment order.');
    }
    if (!booking.currency || booking.currency.trim() === '') {
        throw new ApiError_1.ApiError(400, 'Booking currency is required.');
    }
    const currentInitiatedCount = booking.payment?.payment_initiated_count || 0;
    const receipt = `booking_${Date.now()}_${booking.user?.toString?.()?.slice(-6) || 'pub'}`;
    const amountInPaise = Math.round(booking.amount * 100);
    if (amountInPaise <= 0 || amountInPaise < 100) {
        throw new ApiError_1.ApiError(400, 'Payment amount must be at least ₹1.00 (100 paise).');
    }
    const paymentOrder = await paymentService.createOrder({
        amount: amountInPaise,
        currency: booking.currency.toUpperCase(),
        receipt,
        notes: {
            bookingId: booking.id,
            batchId: booking.batch.toString(),
            centerId: booking.center.toString(),
        },
    });
    const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
        $set: {
            'payment.razorpay_order_id': paymentOrder.id,
            'payment.status': booking_model_1.PaymentStatus.INITIATED,
            'payment.payment_initiated_count': currentInitiatedCount + 1,
        },
    }, { new: true })
        .select('id booking_id status amount currency payment')
        .lean();
    if (!updatedBooking) {
        throw new ApiError_1.ApiError(500, 'Failed to update booking with payment order');
    }
    try {
        await transaction_model_1.TransactionModel.findOneAndUpdate({ booking: booking._id, razorpay_order_id: paymentOrder.id }, {
            $set: {
                razorpay_payment_id: null,
                razorpay_signature: null,
                payment_method: null,
                processed_at: null,
            },
            $setOnInsert: {
                user: booking.user,
                booking: booking._id,
                razorpay_order_id: paymentOrder.id,
                amount: booking.amount,
                currency: booking.currency,
                type: transaction_model_1.TransactionType.PAYMENT,
                status: transaction_model_1.TransactionStatus.PENDING,
                source: transaction_model_1.TransactionSource.USER_VERIFICATION,
            },
        }, { upsert: true, new: true, lean: true });
    }
    catch (transactionError) {
        logger_1.logger.error('Failed to create transaction record for public payment', {
            bookingId: booking.id,
            razorpay_order_id: paymentOrder.id,
            error: transactionError instanceof Error ? transactionError.message : transactionError,
        });
    }
    (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_INITIATED, auditTrail_model_1.ActionScale.MEDIUM, `Payment order created (public link) for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
        userId: booking.user,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: { razorpayOrderId: paymentOrder.id, amount: booking.amount },
    }).catch(() => { });
    return {
        booking: {
            id: updatedBooking.id || updatedBooking._id?.toString() || '',
            booking_id: updatedBooking.booking_id || '',
            status: updatedBooking.status,
            amount: updatedBooking.amount,
            currency: updatedBooking.currency,
            payment: {
                razorpay_order_id: updatedBooking.payment.razorpay_order_id || paymentOrder.id,
                status: updatedBooking.payment.status,
            },
        },
        razorpayOrder: {
            id: paymentOrder.id,
            amount: paymentOrder.amount,
            currency: paymentOrder.currency,
            receipt: paymentOrder.receipt,
            status: paymentOrder.status,
            created_at: paymentOrder.created_at,
        },
    };
};
exports.createOrderByPaymentToken = createOrderByPaymentToken;
/**
 * Verify Razorpay payment and update booking status
 */
const verifyPayment = async (data, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Find booking by razorpay_order_id
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_order_id': data.razorpay_order_id,
            user: userObjectId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        // If payment is already verified (e.g. by webhook), return success response
        if (booking.payment.status === booking_model_1.PaymentStatus.SUCCESS) {
            const alreadyVerified = await booking_model_1.BookingModel.findById(booking._id)
                .populate('batch', 'id name')
                .populate('center', 'id center_name')
                .populate('sport', 'id name')
                .select('id booking_id status amount currency payment batch center sport updatedAt')
                .lean();
            if (!alreadyVerified) {
                throw new ApiError_1.ApiError(404, 'Booking not found');
            }
            return {
                id: alreadyVerified.id || alreadyVerified._id?.toString() || '',
                booking_id: alreadyVerified.booking_id || '',
                status: alreadyVerified.status,
                amount: alreadyVerified.amount,
                currency: alreadyVerified.currency,
                payment: {
                    razorpay_order_id: alreadyVerified.payment.razorpay_order_id || '',
                    status: alreadyVerified.payment.status,
                    payment_method: alreadyVerified.payment.payment_method ?? null,
                    paid_at: alreadyVerified.payment.paid_at ?? null,
                },
                batch: {
                    id: alreadyVerified.batch?._id?.toString() || alreadyVerified.batch?.id || '',
                    name: alreadyVerified.batch?.name || '',
                },
                center: {
                    id: alreadyVerified.center?._id?.toString() || alreadyVerified.center?.id || '',
                    center_name: alreadyVerified.center?.center_name || '',
                },
                sport: {
                    id: alreadyVerified.sport?._id?.toString() || alreadyVerified.sport?.id || '',
                    name: alreadyVerified.sport?.name || '',
                },
                updatedAt: alreadyVerified.updatedAt,
            };
        }
        // Check if payment is initiated (should be INITIATED or PENDING for legacy)
        if (booking.payment.status !== booking_model_1.PaymentStatus.INITIATED && booking.payment.status !== booking_model_1.PaymentStatus.PENDING) {
            throw new ApiError_1.ApiError(400, `Payment cannot be verified. Current status: ${booking.payment.status}. Payment must be initiated first.`);
        }
        // Parallelize signature verification and payment fetch
        // Signature verification is fast (local crypto), payment fetch is external API call
        // Run them in parallel to reduce total latency
        const [isValidSignature, razorpayPayment] = await Promise.all([
            paymentService.verifyPaymentSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature),
            paymentService.fetchPayment(data.razorpay_payment_id),
        ]);
        if (!isValidSignature) {
            // Payment failed due to invalid signature - increment payment_failed_count
            const currentFailedCount = booking.payment?.payment_failed_count || 0;
            const newFailedCount = currentFailedCount + 1;
            await Promise.all([
                booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
                    $set: {
                        'payment.status': booking_model_1.PaymentStatus.FAILED,
                        'payment.failure_reason': 'Invalid payment signature',
                        'payment.payment_failed_count': newFailedCount,
                    },
                }),
                (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_FAILED, auditTrail_model_1.ActionScale.MEDIUM, `Payment verification failed (invalid signature) for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
                    userId: userObjectId,
                    academyId: booking.center,
                    bookingId: booking._id,
                    metadata: {
                        razorpay_order_id: data.razorpay_order_id,
                        razorpay_payment_id: data.razorpay_payment_id,
                        reason: 'Invalid payment signature',
                        payment_failed_count: newFailedCount,
                    },
                }),
            ]);
            logger_1.logger.warn('Payment signature verification failed', {
                bookingId: booking.id,
                userId,
                orderId: data.razorpay_order_id,
            });
            throw new ApiError_1.ApiError(400, 'Invalid payment signature');
        }
        // Verify payment status and amount (razorpayPayment already fetched in parallel above)
        if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
            // Payment failed - increment payment_failed_count
            const currentFailedCount = booking.payment?.payment_failed_count || 0;
            const newFailedCount = currentFailedCount + 1;
            await Promise.all([
                booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
                    $set: {
                        'payment.status': booking_model_1.PaymentStatus.FAILED,
                        'payment.failure_reason': `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`,
                        'payment.payment_failed_count': newFailedCount,
                    },
                }),
                (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_FAILED, auditTrail_model_1.ActionScale.MEDIUM, `Payment verification failed (status: ${razorpayPayment.status}) for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
                    userId: userObjectId,
                    academyId: booking.center,
                    bookingId: booking._id,
                    metadata: {
                        razorpay_order_id: data.razorpay_order_id,
                        razorpay_payment_id: data.razorpay_payment_id,
                        razorpay_status: razorpayPayment.status,
                        reason: `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`,
                        payment_failed_count: newFailedCount,
                    },
                }),
            ]);
            throw new ApiError_1.ApiError(400, `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`);
        }
        // Verify amount matches (convert from paise to rupees)
        const expectedAmount = Math.round(booking.amount * 100);
        if (razorpayPayment.amount !== expectedAmount) {
            // Payment failed due to amount mismatch - increment payment_failed_count
            const currentFailedCount = booking.payment?.payment_failed_count || 0;
            const newFailedCount = currentFailedCount + 1;
            await Promise.all([
                booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
                    $set: {
                        'payment.status': booking_model_1.PaymentStatus.FAILED,
                        'payment.failure_reason': `Payment amount mismatch. Expected: ${expectedAmount}, Received: ${razorpayPayment.amount}`,
                        'payment.payment_failed_count': newFailedCount,
                    },
                }),
                (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_FAILED, auditTrail_model_1.ActionScale.MEDIUM, `Payment verification failed (amount mismatch) for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
                    userId: userObjectId,
                    academyId: booking.center,
                    bookingId: booking._id,
                    metadata: {
                        razorpay_order_id: data.razorpay_order_id,
                        razorpay_payment_id: data.razorpay_payment_id,
                        expected_amount: expectedAmount,
                        received_amount: razorpayPayment.amount,
                        reason: 'Payment amount mismatch',
                        payment_failed_count: newFailedCount,
                    },
                }),
            ]);
            logger_1.logger.error('Payment amount mismatch', {
                bookingId: booking.id,
                expected: expectedAmount,
                received: razorpayPayment.amount,
            });
            throw new ApiError_1.ApiError(400, 'Payment amount does not match booking amount');
        }
        // Update booking and transaction in parallel for better performance
        // Transaction update is fire-and-forget (we don't need to wait for it)
        const bookingUpdatePromise = booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.CONFIRMED,
                'payment.razorpay_payment_id': data.razorpay_payment_id,
                'payment.razorpay_signature': data.razorpay_signature,
                'payment.status': booking_model_1.PaymentStatus.SUCCESS,
                'payment.payment_method': razorpayPayment.method || null,
                'payment.paid_at': new Date(),
            },
        }, { new: true })
            .populate('batch', 'id name')
            .populate('center', 'id center_name email mobile_number')
            .populate('sport', 'id name')
            .select('id booking_id status amount currency payment batch center sport updatedAt')
            .lean();
        // Update transaction record - MUST await this before creating payout
        // Payout creation needs the transaction to exist
        const transactionUpdatePromise = transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_order_id: data.razorpay_order_id,
        }, {
            $set: {
                // Update these fields when transaction exists (or set for new document)
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                status: transaction_model_1.TransactionStatus.SUCCESS,
                payment_method: razorpayPayment.method || null,
                processed_at: new Date(),
            },
            $setOnInsert: {
                // Only set these fields when creating a new document (shouldn't happen, but safety)
                user: booking.user,
                booking: booking._id,
                razorpay_order_id: data.razorpay_order_id,
                amount: booking.amount,
                currency: booking.currency,
                type: transaction_model_1.TransactionType.PAYMENT,
                source: transaction_model_1.TransactionSource.USER_VERIFICATION,
                // Note: status is in $set above, so it will be set for both insert and update
            },
        }, { upsert: true, new: true, lean: true });
        const updatedBooking = await bookingUpdatePromise;
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to update booking');
        }
        // Wait for transaction to be created/updated before creating payout
        let transaction = null;
        try {
            transaction = await transactionUpdatePromise;
            if (!transaction) {
                logger_1.logger.error('Transaction not found or failed to create', {
                    bookingId: booking.id,
                    razorpay_order_id: data.razorpay_order_id,
                });
                // Try to fetch transaction from database as fallback
                transaction = await transaction_model_1.TransactionModel.findOne({
                    booking: booking._id,
                    razorpay_order_id: data.razorpay_order_id,
                }).select('id').lean();
                if (transaction) {
                    logger_1.logger.info('Transaction found in database after update failed', {
                        bookingId: booking.id,
                        transactionId: transaction.id,
                    });
                }
            }
            else {
                logger_1.logger.info('Transaction created/updated successfully', {
                    bookingId: booking.id,
                    transactionId: transaction.id,
                    razorpay_order_id: data.razorpay_order_id,
                });
            }
        }
        catch (transactionError) {
            // Log error but don't fail the payment verification
            logger_1.logger.error('Failed to update/create transaction record', {
                bookingId: booking.id,
                razorpay_order_id: data.razorpay_order_id,
                error: transactionError instanceof Error ? transactionError.message : transactionError,
                stack: transactionError instanceof Error ? transactionError.stack : undefined,
            });
            // Try to fetch existing transaction as fallback
            try {
                transaction = await transaction_model_1.TransactionModel.findOne({
                    booking: booking._id,
                    razorpay_order_id: data.razorpay_order_id,
                }).select('id').lean();
                if (transaction) {
                    logger_1.logger.info('Found existing transaction after update error', {
                        bookingId: booking.id,
                        transactionId: transaction.id,
                    });
                }
            }
            catch (fetchError) {
                logger_1.logger.error('Failed to fetch transaction as fallback', {
                    bookingId: booking.id,
                    error: fetchError instanceof Error ? fetchError.message : fetchError,
                });
            }
        }
        // Create audit trail for successful payment verification
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_SUCCESS, auditTrail_model_1.ActionScale.CRITICAL, `Payment verified successfully for booking ${updatedBooking.booking_id || updatedBooking.id}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                payment_method: razorpayPayment.method || null,
                amount: booking.amount,
                currency: booking.currency,
                transaction_id: transaction?.id || null,
            },
        }).catch((error) => {
            // Log but don't fail payment verification
            logger_1.logger.error('Failed to create audit trail for payment verification', {
                bookingId: booking.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        logger_1.logger.info(`Payment verified successfully for booking: ${booking.id}`);
        // Note: payout_status will be set when payout is actually created/transferred
        // Remains NOT_INITIATED during payment verification, will be updated when payout is created
        // Create payout record (non-blocking - enqueue in background)
        // Only create payout if commission and priceBreakdown exist and payoutAmount > 0
        if (booking.commission && booking.commission.payoutAmount > 0 && booking.priceBreakdown) {
            try {
                // Get center to find academy owner
                const center = await coachingCenter_model_1.CoachingCenterModel.findById(booking.center)
                    .select('user')
                    .lean();
                if (!center) {
                    logger_1.logger.warn('Center not found for payout creation', {
                        bookingId: booking.id,
                        centerId: booking.center?.toString(),
                    });
                }
                else if (!center.user) {
                    logger_1.logger.warn('Center has no user (academy owner) for payout creation', {
                        bookingId: booking.id,
                        centerId: center._id?.toString(),
                    });
                }
                else {
                    const academyUser = await user_model_1.UserModel.findById(center.user).select('id').lean();
                    if (!academyUser) {
                        logger_1.logger.warn('Academy user not found for payout creation', {
                            bookingId: booking.id,
                            centerUserId: center.user.toString(),
                        });
                    }
                    else {
                        // Get transaction ID - use transaction from above if available, otherwise fetch it
                        let transactionForPayout = null;
                        if (transaction && transaction.id) {
                            transactionForPayout = transaction;
                            logger_1.logger.info('Using transaction from update for payout creation', {
                                bookingId: booking.id,
                                transactionId: transaction.id,
                            });
                        }
                        else {
                            // Try to find transaction if it wasn't created/updated above
                            logger_1.logger.info('Transaction not available from update, fetching from database', {
                                bookingId: booking.id,
                                razorpay_order_id: data.razorpay_order_id,
                            });
                            transactionForPayout = await transaction_model_1.TransactionModel.findOne({
                                booking: booking._id,
                                razorpay_order_id: data.razorpay_order_id,
                            }).select('id').lean();
                        }
                        if (transactionForPayout && transactionForPayout.id) {
                            // Create payout record directly (synchronous)
                            try {
                                const { createPayoutRecord } = await Promise.resolve().then(() => __importStar(require('../common/payoutCreation.service')));
                                const result = await createPayoutRecord({
                                    bookingId: booking.id,
                                    transactionId: transactionForPayout.id,
                                    academyUserId: academyUser.id,
                                    amount: booking.amount,
                                    batchAmount: booking.priceBreakdown.batch_amount,
                                    commissionRate: booking.commission.rate,
                                    commissionAmount: booking.commission.amount,
                                    payoutAmount: booking.commission.payoutAmount,
                                    currency: booking.currency,
                                });
                                if (result.success && !result.skipped) {
                                    logger_1.logger.info('Payout record created successfully', {
                                        bookingId: booking.id,
                                        transactionId: transactionForPayout.id,
                                        payoutId: result.payoutId,
                                        payoutAmount: booking.commission.payoutAmount,
                                        commissionRate: booking.commission.rate,
                                        commissionAmount: booking.commission.amount,
                                        batchAmount: booking.priceBreakdown.batch_amount,
                                    });
                                }
                                else if (result.skipped) {
                                    logger_1.logger.info('Payout creation skipped', {
                                        bookingId: booking.id,
                                        reason: result.reason,
                                        payoutId: result.payoutId,
                                        payoutAmount: booking.commission.payoutAmount,
                                    });
                                }
                            }
                            catch (payoutError) {
                                logger_1.logger.error('Failed to create payout record', {
                                    error: payoutError.message || payoutError,
                                    bookingId: booking.id,
                                    transactionId: transactionForPayout?.id,
                                    academyUserId: academyUser.id,
                                    stack: payoutError.stack,
                                });
                            }
                        }
                        else {
                            logger_1.logger.error('Transaction not found for payout creation', {
                                bookingId: booking.id,
                                razorpay_order_id: data.razorpay_order_id,
                                centerId: center._id?.toString(),
                                academyUserId: academyUser.id,
                                transactionFromUpdate: transaction ? (transaction.id ? 'has id' : 'exists but no id') : 'null',
                            });
                        }
                    }
                }
            }
            catch (payoutError) {
                // Log but don't fail payment verification
                logger_1.logger.error('Failed to create payout record (outer catch)', {
                    error: payoutError.message || payoutError,
                    bookingId: booking.id,
                    stack: payoutError.stack,
                });
            }
        }
        else {
            // Log why payout creation was skipped
            if (!booking.commission) {
                logger_1.logger.warn('Payout creation skipped: commission not found', { bookingId: booking.id });
            }
            else if (!booking.commission.payoutAmount || booking.commission.payoutAmount <= 0) {
                logger_1.logger.warn('Payout creation skipped: payoutAmount is 0 or negative', {
                    bookingId: booking.id,
                    payoutAmount: booking.commission.payoutAmount,
                });
            }
            else if (!booking.priceBreakdown) {
                logger_1.logger.warn('Payout creation skipped: priceBreakdown not found', { bookingId: booking.id });
            }
        }
        // Send confirmation emails/SMS asynchronously (non-blocking)
        // Don't await - let it run in background
        (async () => {
            try {
                // Fetch all required data for notifications (since we don't populate user/participants in response)
                const [batchDetails, userDetails, participantDetails, centerDetails] = await Promise.all([
                    batch_model_1.BatchModel.findById(booking.batch).lean(),
                    user_model_1.UserModel.findById(booking.user).select('id firstName lastName email mobile').lean(),
                    participant_model_1.ParticipantModel.find({ _id: { $in: booking.participants } }).select('id firstName lastName').lean(),
                    coachingCenter_model_1.CoachingCenterModel.findById(booking.center).select('id center_name email mobile_number user').lean(),
                ]);
                if (!batchDetails) {
                    logger_1.logger.warn(`Batch not found for booking ${booking.id}`);
                    return;
                }
                // Format date and time
                const startDate = batchDetails.scheduled?.start_date
                    ? new Date(batchDetails.scheduled.start_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })
                    : 'N/A';
                const startTime = batchDetails.scheduled?.start_time || 'N/A';
                const endTime = batchDetails.scheduled?.end_time || 'N/A';
                const trainingDays = batchDetails.scheduled?.training_days
                    ? batchDetails.scheduled.training_days.join(', ')
                    : 'N/A';
                // Format participant names
                const participantNames = (participantDetails || [])
                    .map((p) => {
                    const firstName = p.firstName || '';
                    const lastName = p.lastName || '';
                    return `${firstName} ${lastName}`.trim() || p.id || 'Participant';
                })
                    .join(', ');
                // Get user details
                const user = userDetails;
                const userName = user
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
                    : 'User';
                const userEmail = user?.email;
                const userMobile = user?.mobile;
                // Get center details
                const center = centerDetails;
                const centerName = center?.center_name || 'Coaching Center';
                const centerEmail = center?.email;
                const centerMobile = center?.mobile_number;
                // Get sport and batch details
                const sport = updatedBooking.sport;
                const sportName = sport?.name || 'Sport';
                const batchName = batchDetails.name || 'Batch';
                // Prepare email template variables
                const emailTemplateVariables = {
                    userName,
                    bookingId: updatedBooking.booking_id ?? undefined,
                    batchName,
                    sportName,
                    centerName,
                    participants: participantNames,
                    startDate,
                    startTime,
                    endTime,
                    trainingDays,
                    amount: updatedBooking.amount.toFixed(2),
                    currency: updatedBooking.currency,
                    paymentId: data.razorpay_payment_id,
                    year: new Date().getFullYear(),
                };
                // Generate invoice PDF for email attachment
                let invoiceBuffer = null;
                try {
                    const { generateBookingInvoice } = await Promise.resolve().then(() => __importStar(require('../admin/invoice.service')));
                    invoiceBuffer = await generateBookingInvoice(updatedBooking.id);
                }
                catch (invoiceError) {
                    logger_1.logger.error('Failed to generate invoice for email', {
                        bookingId: updatedBooking.id,
                        error: invoiceError instanceof Error ? invoiceError.message : invoiceError,
                    });
                    // Continue without invoice attachment if generation fails
                }
                // Queue emails using notification queue (non-blocking)
                // Send email to user with invoice attachment
                if (userEmail) {
                    (0, notificationQueue_service_1.queueEmail)(userEmail, notificationMessages_1.EmailSubjects.BOOKING_CONFIRMATION_USER, {
                        template: notificationMessages_1.EmailTemplates.BOOKING_CONFIRMATION_USER,
                        text: (0, notificationMessages_1.getBookingConfirmationUserEmailText)({
                            bookingId: updatedBooking.booking_id ?? undefined,
                            batchName,
                            centerName,
                        }),
                        templateVariables: emailTemplateVariables,
                        priority: 'high',
                        metadata: {
                            type: 'booking_confirmation',
                            bookingId: updatedBooking.id,
                            recipient: 'user',
                        },
                        attachments: invoiceBuffer
                            ? [
                                {
                                    filename: `invoice-${updatedBooking.booking_id}.pdf`,
                                    content: invoiceBuffer,
                                    contentType: 'application/pdf',
                                },
                            ]
                            : undefined,
                    });
                }
                // Send email to coaching center
                if (centerEmail) {
                    (0, notificationQueue_service_1.queueEmail)(centerEmail, notificationMessages_1.EmailSubjects.BOOKING_CONFIRMATION_CENTER, {
                        template: notificationMessages_1.EmailTemplates.BOOKING_CONFIRMATION_CENTER,
                        text: (0, notificationMessages_1.getBookingConfirmationCenterEmailText)({
                            bookingId: updatedBooking.booking_id ?? undefined,
                            batchName,
                            userName,
                        }),
                        templateVariables: {
                            ...emailTemplateVariables,
                            userEmail: userEmail || 'N/A',
                        },
                        priority: 'high',
                        metadata: {
                            type: 'booking_confirmation',
                            bookingId: updatedBooking.booking_id ?? undefined,
                            recipient: 'coaching_center',
                        },
                    });
                }
                // Send email to admin
                if (env_1.config.admin.email) {
                    (0, notificationQueue_service_1.queueEmail)(env_1.config.admin.email, notificationMessages_1.EmailSubjects.BOOKING_CONFIRMATION_ADMIN, {
                        template: notificationMessages_1.EmailTemplates.BOOKING_CONFIRMATION_ADMIN,
                        text: (0, notificationMessages_1.getBookingConfirmationAdminEmailText)({
                            bookingId: updatedBooking.booking_id ?? undefined,
                            batchName,
                            centerName,
                        }),
                        templateVariables: {
                            ...emailTemplateVariables,
                            userEmail: userEmail || 'N/A',
                        },
                        priority: 'high',
                        metadata: {
                            type: 'booking_confirmation',
                            bookingId: updatedBooking.booking_id ?? undefined,
                            recipient: 'admin',
                        },
                    });
                }
                // Prepare SMS messages using notification messages
                const userSmsMessage = (0, notificationMessages_1.getPaymentVerifiedUserSms)({
                    userName: userName || 'User',
                    bookingId: updatedBooking.booking_id ?? undefined,
                    batchName,
                    sportName,
                    centerName,
                    participants: participantNames,
                    startDate,
                    startTime,
                    endTime,
                    currency: updatedBooking.currency,
                    amount: updatedBooking.amount.toFixed(2),
                });
                const centerSmsMessage = (0, notificationMessages_1.getPaymentVerifiedAcademySms)({
                    bookingId: updatedBooking.booking_id ?? undefined,
                    batchName,
                    sportName,
                    userName: userName || 'N/A',
                    participants: participantNames,
                    startDate,
                    startTime,
                    endTime,
                    currency: updatedBooking.currency,
                    amount: updatedBooking.amount.toFixed(2),
                });
                // Queue SMS notifications using notification queue (non-blocking)
                // Send SMS to user
                if (userMobile) {
                    (0, notificationQueue_service_1.queueSms)(userMobile, userSmsMessage, 'high', {
                        type: 'booking_confirmation',
                        bookingId: updatedBooking.id,
                        recipient: 'user',
                    });
                }
                else {
                    logger_1.logger.warn('User mobile number not available for SMS', {
                        bookingId: booking.booking_id ?? undefined,
                    });
                }
                // Send SMS to coaching center
                if (centerMobile) {
                    (0, notificationQueue_service_1.queueSms)(centerMobile, centerSmsMessage, 'high', {
                        type: 'booking_confirmation',
                        bookingId: updatedBooking.booking_id ?? undefined,
                        recipient: 'coaching_center',
                    });
                }
                else {
                    logger_1.logger.warn('Coaching center mobile number not available for SMS', {
                        bookingId: booking.booking_id ?? undefined,
                    });
                }
                // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
                // const userWhatsAppMessage = getPaymentVerifiedUserWhatsApp({
                //   userName: userName || 'User',
                //   bookingId: updatedBooking.booking_id ?? undefined,
                //   batchName,
                //   sportName,
                //   centerName,
                //   participants: participantNames,
                //   startDate,
                //   startTime,
                //   endTime,
                //   currency: updatedBooking.currency,
                //   amount: updatedBooking.amount.toFixed(2),
                // });
                // const centerWhatsAppMessage = getPaymentVerifiedAcademyWhatsApp({
                //   bookingId: updatedBooking.booking_id ?? undefined,
                //   batchName,
                //   sportName,
                //   userName: userName || 'N/A',
                //   participants: participantNames,
                //   startDate,
                //   startTime,
                //   endTime,
                //   currency: updatedBooking.currency,
                //   amount: updatedBooking.amount.toFixed(2),
                // });
                // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
                // if (userMobile) {
                //   queueWhatsApp(userMobile, userWhatsAppMessage, 'high', {
                //     type: 'booking_confirmation',
                //     bookingId: updatedBooking.id,
                //     recipient: 'user',
                //   });
                // } else {
                //   logger.warn('User mobile number not available for WhatsApp', {
                //     bookingId: booking.booking_id ?? undefined,
                //   });
                // }
                // if (centerMobile) {
                //   queueWhatsApp(centerMobile, centerWhatsAppMessage, 'high', {
                //     type: 'booking_confirmation',
                //     bookingId: updatedBooking.booking_id ?? undefined,
                //     recipient: 'coaching_center',
                //   });
                // } else {
                //   logger.warn('Coaching center mobile number not available for WhatsApp', {
                //     bookingId: booking.booking_id ?? undefined,
                //   });
                // }
                // Push notifications (fire-and-forget)
                // Push notification to User
                if (user?.id) {
                    const userPushNotification = (0, notificationMessages_1.getBookingConfirmationUserPush)({
                        bookingId: updatedBooking.booking_id || updatedBooking.id,
                        batchName,
                        centerName,
                    });
                    (0, notification_service_1.createAndSendNotification)({
                        recipientType: 'user',
                        recipientId: user.id,
                        title: userPushNotification.title,
                        body: userPushNotification.body,
                        channels: ['push'],
                        priority: 'high',
                        data: {
                            type: 'booking_confirmation',
                            bookingId: updatedBooking.id,
                            batchId: booking.batch.toString(),
                            centerId: booking.center.toString(),
                        },
                    }).catch((error) => {
                        logger_1.logger.error('Failed to send push notification to user', {
                            bookingId: booking.id,
                            userId: user.id,
                            error: error instanceof Error ? error.message : error,
                        });
                    });
                }
                // Push notification to Academy Owner
                // Get center owner ID
                const centerOwnerId = centerDetails?.user?.toString();
                if (centerOwnerId) {
                    const academyPushNotification = (0, notificationMessages_1.getBookingConfirmationAcademyPush)({
                        bookingId: updatedBooking.booking_id || updatedBooking.id,
                        batchName,
                        userName,
                    });
                    (0, notification_service_1.createAndSendNotification)({
                        recipientType: 'academy',
                        recipientId: centerOwnerId,
                        title: academyPushNotification.title,
                        body: academyPushNotification.body,
                        channels: ['push'],
                        priority: 'high',
                        data: {
                            type: 'booking_confirmation_academy',
                            bookingId: updatedBooking.id || updatedBooking.booking_id,
                            batchId: booking.batch.toString(),
                            centerId: booking.center.toString(),
                        },
                    }).catch((error) => {
                        logger_1.logger.error('Failed to send push notification to academy owner', {
                            bookingId: booking.id,
                            centerOwnerId,
                            error: error instanceof Error ? error.message : error,
                        });
                    });
                }
                // Push notification to Admin (role-based)
                const adminPushNotification = (0, notificationMessages_1.getBookingConfirmationAdminPush)({
                    bookingId: updatedBooking.booking_id || updatedBooking.id,
                    batchName,
                    centerName,
                });
                (0, notification_service_1.createAndSendNotification)({
                    recipientType: 'role',
                    roles: [defaultRoles_enum_1.DefaultRoles.ADMIN, defaultRoles_enum_1.DefaultRoles.SUPER_ADMIN],
                    title: adminPushNotification.title,
                    body: adminPushNotification.body,
                    channels: ['push'],
                    priority: 'high',
                    data: {
                        type: 'booking_confirmation_admin',
                        bookingId: updatedBooking.booking_id || updatedBooking.id,
                        batchId: booking.batch.toString(),
                        centerId: booking.center.toString(),
                    },
                }).catch((error) => {
                    logger_1.logger.error('Failed to send push notification to admin', {
                        bookingId: booking.id,
                        error: error instanceof Error ? error.message : error,
                    });
                });
                logger_1.logger.info(`Booking confirmation notifications queued for booking: ${booking.id}`);
            }
            catch (notificationError) {
                // Log error but don't fail the payment verification
                logger_1.logger.error('Error sending booking confirmation notifications', {
                    bookingId: booking.id,
                    error: notificationError instanceof Error ? notificationError.message : notificationError,
                });
            }
        })().catch((error) => {
            // Catch any unhandled errors in the async function
            logger_1.logger.error('Unhandled error in background notification sending', {
                bookingId: booking.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        // Return only relevant data
        const response = {
            id: updatedBooking.id || updatedBooking._id?.toString() || '',
            booking_id: updatedBooking.booking_id || '',
            status: updatedBooking.status,
            amount: updatedBooking.amount,
            currency: updatedBooking.currency,
            payment: {
                razorpay_order_id: updatedBooking.payment.razorpay_order_id || '',
                status: updatedBooking.payment.status,
                payment_method: updatedBooking.payment.payment_method || razorpayPayment.method || null,
                paid_at: updatedBooking.payment.paid_at || new Date(),
            },
            batch: {
                id: updatedBooking.batch?._id?.toString() || updatedBooking.batch?.id || '',
                name: updatedBooking.batch?.name || '',
            },
            center: {
                id: updatedBooking.center?._id?.toString() || updatedBooking.center?.id || '',
                center_name: updatedBooking.center?.center_name || '',
            },
            sport: {
                id: updatedBooking.sport?._id?.toString() || updatedBooking.sport?.id || '',
                name: updatedBooking.sport?.name || '',
            },
            updatedAt: updatedBooking.updatedAt,
        };
        // Return immediately without waiting for notifications
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to verify payment:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, 'Failed to verify payment');
    }
};
exports.verifyPayment = verifyPayment;
/**
 * Get user bookings with enrolled batches
 */
const getUserBookings = async (userId, params = {}) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Build query - show all bookings (not just paid ones) to support new booking flow
        // Users can see bookings in SLOT_BOOKED, APPROVED, REJECTED, CONFIRMED, etc.
        const query = {
            user: userObjectId,
            is_deleted: false,
        };
        // Filter by booking status if provided
        if (params.status) {
            query.status = params.status;
        }
        // Filter by payment status if provided
        if (params.paymentStatus) {
            query['payment.status'] = params.paymentStatus;
        }
        // Pagination
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 10));
        const skip = (page - 1) * limit;
        // Get total count and bookings in parallel
        const [total, bookings] = await Promise.all([
            booking_model_1.BookingModel.countDocuments(query),
            booking_model_1.BookingModel.find(query)
                .populate('participants', 'id firstName middleName lastName dob profilePhoto')
                .populate('batch', 'id name scheduled duration')
                .populate({
                path: 'batch',
                populate: {
                    path: 'sport',
                    select: 'id name logo',
                },
            })
                .populate({
                path: 'batch',
                populate: {
                    path: 'center',
                    select: 'id center_name logo',
                },
            })
                .select('booking_id id participants batch amount currency status payment.status rejection_reason createdAt updatedAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);
        const totalPages = Math.ceil(total / limit);
        // Transform bookings to return required fields
        const transformedBookings = bookings.map((booking) => {
            const bookingStatus = booking.status || booking_model_1.BookingStatus.PENDING;
            const paymentStatus = booking.payment?.status || booking_model_1.PaymentStatus.PENDING;
            return {
                booking_id: booking.booking_id || booking.id,
                id: booking.id,
                batch: {
                    id: booking.batch?._id?.toString() || booking.batch?.id || '',
                    name: booking.batch?.name || 'N/A',
                    scheduled: booking.batch?.scheduled || {
                        start_date: new Date(),
                        start_time: '',
                        end_time: '',
                        training_days: [],
                    },
                    duration: booking.batch?.duration || {
                        count: 0,
                        type: '',
                    },
                },
                participants: (booking.participants || []).map((p) => {
                    const dob = p.dob ? new Date(p.dob) : null;
                    const age = dob ? (0, booking_helpers_utils_1.calculateAge)(dob, new Date()) : null;
                    return {
                        id: p._id?.toString() || p.id || '',
                        firstName: p.firstName || '',
                        middleName: p.middleName || '',
                        lastName: p.lastName || '',
                        age,
                        profilePhoto: p.profilePhoto || null,
                    };
                }),
                center: {
                    id: booking.batch?.center?._id?.toString() || booking.batch?.center?.id || '',
                    center_name: booking.batch?.center?.center_name || 'N/A',
                    logo: booking.batch?.center?.logo || null,
                },
                sport: {
                    id: booking.batch?.sport?._id?.toString() || booking.batch?.sport?.id || '',
                    name: booking.batch?.sport?.name || 'N/A',
                    logo: booking.batch?.sport?.logo || null,
                },
                amount: booking.amount || 0,
                currency: booking.currency || 'INR',
                status: bookingStatus,
                status_message: (0, booking_helpers_utils_1.getBookingStatusMessage)(bookingStatus, paymentStatus),
                payment_status: paymentStatus === booking_model_1.PaymentStatus.SUCCESS ? 'paid' : paymentStatus,
                payment_enabled: (0, booking_helpers_utils_1.isPaymentLinkEnabled)(bookingStatus, paymentStatus),
                can_download_invoice: (0, booking_helpers_utils_1.canDownloadInvoice)(bookingStatus, paymentStatus),
                rejection_reason: bookingStatus === booking_model_1.BookingStatus.REJECTED ? booking.rejection_reason || null : null,
                created_at: booking.createdAt,
            };
        });
        return {
            data: transformedBookings,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get user bookings:', {
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get user bookings');
    }
};
exports.getUserBookings = getUserBookings;
/**
 * Get booking details by ID
 */
const getBookingDetails = async (bookingId, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Fetch booking with all related data (using custom id field, not MongoDB _id)
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            user: userObjectId,
            is_deleted: false,
        })
            .populate('participants', 'id firstName middleName lastName dob profilePhoto')
            .populate({
            path: 'batch',
            select: 'id name scheduled duration',
            populate: [
                {
                    path: 'sport',
                    select: 'id name logo',
                },
                {
                    path: 'center',
                    select: 'id center_name logo location',
                },
            ],
        })
            .select('id booking_id status amount currency payment participants batch notes rejection_reason cancellation_reason createdAt')
            .lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const bookingStatus = booking.status || booking_model_1.BookingStatus.PENDING;
        const paymentStatus = booking.payment?.status || booking_model_1.PaymentStatus.PENDING;
        // Calculate participant ages
        const participants = (booking.participants || []).map((p) => {
            const dob = p.dob ? new Date(p.dob) : null;
            const age = dob ? (0, booking_helpers_utils_1.calculateAge)(dob, new Date()) : null;
            return {
                id: p._id?.toString() || p.id || '',
                firstName: p.firstName || null,
                middleName: p.middleName || null,
                lastName: p.lastName || null,
                age,
                profilePhoto: p.profilePhoto || null,
            };
        });
        // Transform batch data
        const batchData = booking.batch;
        const centerData = batchData?.center;
        const sportData = batchData?.sport;
        const response = {
            id: booking._id?.toString() || booking.id || '',
            booking_id: booking.booking_id || '',
            status: bookingStatus,
            amount: booking.amount || 0,
            currency: booking.currency || 'INR',
            payment: {
                razorpay_order_id: booking.payment?.razorpay_order_id || null,
                status: paymentStatus === booking_model_1.PaymentStatus.SUCCESS ? 'paid' : paymentStatus,
                payment_method: booking.payment?.payment_method || null,
                paid_at: booking.payment?.paid_at || null,
                failure_reason: booking.payment?.failure_reason || null,
            },
            payment_enabled: (0, booking_helpers_utils_1.isPaymentLinkEnabled)(bookingStatus, paymentStatus),
            can_cancel: (0, booking_helpers_utils_1.canCancelBooking)(bookingStatus, paymentStatus),
            can_download_invoice: (0, booking_helpers_utils_1.canDownloadInvoice)(bookingStatus, paymentStatus),
            rejection_reason: bookingStatus === booking_model_1.BookingStatus.REJECTED ? booking.rejection_reason || null : null,
            cancellation_reason: bookingStatus === booking_model_1.BookingStatus.CANCELLED ? booking.cancellation_reason || null : null,
            batch: {
                id: batchData?._id?.toString() || batchData?.id || '',
                name: batchData?.name || 'N/A',
                scheduled: batchData?.scheduled || {
                    start_date: new Date(),
                    start_time: '',
                    end_time: '',
                    training_days: [],
                },
                duration: batchData?.duration || {
                    count: 0,
                    type: '',
                },
            },
            center: {
                id: centerData?._id?.toString() || centerData?.id || '',
                center_name: centerData?.center_name || 'N/A',
                logo: centerData?.logo || null,
                address: centerData?.location?.address
                    ? {
                        ...centerData.location.address,
                        lat: centerData.location.latitude || centerData.location.lat || null,
                        long: centerData.location.longitude || centerData.location.long || null,
                    }
                    : null,
            },
            sport: {
                id: sportData?._id?.toString() || sportData?.id || '',
                name: sportData?.name || 'N/A',
                logo: sportData?.logo || null,
            },
            participants,
            notes: booking.notes || null,
            status_message: (0, booking_helpers_utils_1.getBookingStatusMessage)(bookingStatus, paymentStatus),
            created_at: booking.createdAt,
        };
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get booking details:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            bookingId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get booking details');
    }
};
exports.getBookingDetails = getBookingDetails;
/**
 * Download booking invoice as PDF (user-side)
 */
const downloadBookingInvoice = async (bookingId, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Find booking and verify ownership
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            user: userObjectId,
            is_deleted: false,
        }).lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        // Check if invoice can be downloaded (payment must be successful)
        if (booking.payment?.status !== booking_model_1.PaymentStatus.SUCCESS) {
            throw new ApiError_1.ApiError(400, 'Invoice can only be downloaded for successful payments');
        }
        // Import and use admin invoice service (reuse existing logic)
        const { generateBookingInvoice } = await Promise.resolve().then(() => __importStar(require('../admin/invoice.service')));
        return await generateBookingInvoice(bookingId);
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to download booking invoice:', {
            error: error instanceof Error ? error.message : error,
            bookingId,
            userId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to download invoice');
    }
};
exports.downloadBookingInvoice = downloadBookingInvoice;
/**
 * Cancel payment order (only updates payment status, does not cancel booking)
 * Used when user initiates payment but cancels it before completing
 */
const deleteOrder = async (data, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Find booking by razorpay_order_id (no populate needed for validation)
        const booking = await booking_model_1.BookingModel.findOne({
            'payment.razorpay_order_id': data.razorpay_order_id,
            user: userObjectId,
            is_deleted: false,
        })
            .select('_id id booking_id status payment batch center sport amount currency')
            .lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        // Check if payment is already verified/successful
        if (booking.payment.status === booking_model_1.PaymentStatus.SUCCESS) {
            throw new ApiError_1.ApiError(400, 'Cannot cancel order with successful payment. Please request a refund instead.');
        }
        // Check if payment is already cancelled
        if (booking.payment.status === booking_model_1.PaymentStatus.CANCELLED) {
            throw new ApiError_1.ApiError(400, 'Order is already cancelled');
        }
        // Only update payment status to CANCELLED, don't cancel the booking
        // Increment payment_cancelled_count each time payment is cancelled
        const currentCancelledCount = booking.payment?.payment_cancelled_count || 0;
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                'payment.status': booking_model_1.PaymentStatus.CANCELLED,
                'payment.failure_reason': 'Payment order cancelled by user',
                'payment.payment_cancelled_count': currentCancelledCount + 1,
            },
        }, { new: true })
            .select('id booking_id status amount currency payment batch center sport')
            .populate('batch', '_id id name')
            .populate('center', '_id id center_name')
            .populate('sport', '_id id name')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to cancel order');
        }
        // Update transaction record if exists
        await transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_order_id: data.razorpay_order_id,
        }, {
            $set: {
                status: transaction_model_1.TransactionStatus.CANCELLED,
                source: transaction_model_1.TransactionSource.USER_VERIFICATION,
                failure_reason: 'Payment order cancelled by user',
            },
        }, { upsert: false } // Don't create if doesn't exist
        );
        // Create audit trail for payment order cancellation
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.PAYMENT_FAILED, auditTrail_model_1.ActionScale.MEDIUM, `Payment order cancelled by user for booking ${booking.booking_id || booking.id}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                razorpay_order_id: data.razorpay_order_id,
                previousPaymentStatus: booking.payment.status,
                bookingStatus: booking.status,
                reason: 'Payment order cancelled by user',
                payment_cancelled_count: currentCancelledCount + 1,
                cancelledAt: new Date().toISOString(),
            },
        });
        logger_1.logger.info(`Payment order cancelled: ${booking.id} for user ${userId}, Razorpay Order ID: ${data.razorpay_order_id}`);
        // Return limited data (booking status remains unchanged, only payment status changed)
        const cancelledBooking = {
            id: updatedBooking.id || updatedBooking._id?.toString() || '',
            booking_id: updatedBooking.booking_id || '',
            status: updatedBooking.status || booking.status, // Keep original booking status
            amount: updatedBooking.amount || 0,
            currency: updatedBooking.currency || 'INR',
            payment: {
                razorpay_order_id: updatedBooking.payment?.razorpay_order_id || data.razorpay_order_id,
                status: updatedBooking.payment?.status || booking_model_1.PaymentStatus.CANCELLED,
                failure_reason: updatedBooking.payment?.failure_reason || 'Payment order cancelled by user',
            },
            batch: {
                id: updatedBooking.batch?._id?.toString() || updatedBooking.batch?.id || '',
                name: updatedBooking.batch?.name || '',
            },
            center: {
                id: updatedBooking.center?._id?.toString() || updatedBooking.center?.id || '',
                name: updatedBooking.center?.center_name || '',
            },
            sport: {
                id: updatedBooking.sport?._id?.toString() || updatedBooking.sport?.id || '',
                name: updatedBooking.sport?.name || '',
            },
        };
        return cancelledBooking;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to cancel order:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, 'Failed to cancel order');
    }
};
exports.deleteOrder = deleteOrder;
/**
 * Cancel booking by user with reason
 * Prevents cancellation after payment success
 */
const cancelBooking = async (bookingId, reason, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Find booking by ID
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            user: userObjectId,
            is_deleted: false,
        })
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        // Check if booking is already cancelled
        if (booking.status === booking_model_1.BookingStatus.CANCELLED) {
            throw new ApiError_1.ApiError(400, 'Booking is already cancelled');
        }
        // Check if booking is completed
        if (booking.status === booking_model_1.BookingStatus.COMPLETED) {
            throw new ApiError_1.ApiError(400, 'Cannot cancel a completed booking');
        }
        // Check if booking is confirmed (payment successful)
        if (booking.status === booking_model_1.BookingStatus.CONFIRMED) {
            throw new ApiError_1.ApiError(400, 'Cannot cancel a confirmed booking. Please request a refund instead.');
        }
        // Prevent cancellation after payment success
        if (booking.payment.status === booking_model_1.PaymentStatus.SUCCESS) {
            throw new ApiError_1.ApiError(400, 'Cannot cancel booking after payment is successful. Please request a refund instead.');
        }
        // Update booking status to CANCELLED
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.CANCELLED,
                'payment.status': booking.payment.status === booking_model_1.PaymentStatus.INITIATED || booking.payment.status === booking_model_1.PaymentStatus.PENDING
                    ? booking_model_1.PaymentStatus.CANCELLED
                    : booking.payment.status, // Only update payment status if it's INITIATED or PENDING
                'payment.failure_reason': reason,
                cancellation_reason: reason, // Store cancellation reason in separate field
                cancelled_by: 'user', // User cancelled the booking
            },
        }, { new: true })
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .select('id booking_id status amount currency payment cancellation_reason cancelled_by batch center sport')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to cancel booking');
        }
        // Update transaction record if exists
        if (booking.payment.razorpay_order_id) {
            await transaction_model_1.TransactionModel.findOneAndUpdate({
                booking: booking._id,
                razorpay_order_id: booking.payment.razorpay_order_id,
            }, {
                $set: {
                    status: transaction_model_1.TransactionStatus.CANCELLED,
                    source: transaction_model_1.TransactionSource.USER_VERIFICATION,
                    failure_reason: reason,
                },
            }, { upsert: false } // Don't create if doesn't exist
            );
        }
        // Create audit trail
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.BOOKING_CANCELLED, auditTrail_model_1.ActionScale.MEDIUM, `Booking cancelled by user: ${reason}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                reason: reason,
                cancelledBy: 'user',
                cancelledAt: new Date().toISOString(),
                previousStatus: booking.status,
                previousPaymentStatus: booking.payment.status,
            },
        });
        // Send notifications for cancellation (async, non-blocking)
        (async () => {
            try {
                // Fetch required data for notifications
                const [userDetails, centerDetails, batchDetails] = await Promise.all([
                    user_model_1.UserModel.findById(booking.user).select('id firstName lastName email mobile').lean(),
                    coachingCenter_model_1.CoachingCenterModel.findById(booking.center).select('id center_name user email mobile_number').lean(),
                    batch_model_1.BatchModel.findById(booking.batch).select('id name').lean(),
                ]);
                const batchName = batchDetails?.name || 'batch';
                const centerName = centerDetails?.center_name || 'Academy';
                const user = userDetails;
                const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
                const centerOwnerId = centerDetails?.user?.toString();
                // Notification to User (Push + Email + SMS + WhatsApp)
                if (user?.id) {
                    // Push notification
                    const userPushNotification = (0, notificationMessages_1.getBookingCancelledUserPush)({
                        batchName,
                        reason: reason || null,
                    });
                    await (0, notification_service_1.createAndSendNotification)({
                        recipientType: 'user',
                        recipientId: user.id,
                        title: userPushNotification.title,
                        body: userPushNotification.body,
                        channels: ['push'],
                        priority: 'medium',
                        data: {
                            type: 'booking_cancelled',
                            bookingId: booking.id,
                            batchId: booking.batch.toString(),
                            reason: reason || null,
                        },
                    });
                    // Email notification (async)
                    if (user.email) {
                        (0, notificationQueue_service_1.queueEmail)(user.email, notificationMessages_1.EmailSubjects.BOOKING_CANCELLED_USER, {
                            template: notificationMessages_1.EmailTemplates.BOOKING_CANCELLED_USER,
                            text: (0, notificationMessages_1.getBookingCancelledUserEmailText)({
                                batchName,
                                centerName,
                                reason: reason || null,
                            }),
                            templateVariables: {
                                userName,
                                batchName,
                                centerName,
                                bookingId: booking.booking_id ?? booking.id,
                                reason: reason || null,
                                year: new Date().getFullYear(),
                            },
                            priority: 'medium',
                            metadata: {
                                type: 'booking_cancelled',
                                bookingId: booking.id,
                                recipient: 'user',
                            },
                        });
                    }
                    // SMS notification (async)
                    if (user.mobile) {
                        const smsMessage = (0, notificationMessages_1.getBookingCancelledUserSms)({
                            batchName,
                            centerName,
                            bookingId: booking.booking_id ?? undefined,
                            reason: reason || null,
                        });
                        (0, notificationQueue_service_1.queueSms)(user.mobile, smsMessage, 'medium', {
                            type: 'booking_cancelled',
                            bookingId: booking.id,
                            recipient: 'user',
                        });
                    }
                    if (user.mobile) {
                        const cancelReasonForUser = reason
                            ? `You cancelled booking due to reason: ${reason}`
                            : 'You cancelled your booking yourself';
                        (0, notificationQueue_service_1.queueWhatsAppTemplate)(user.mobile, 'booking_cancelled', {
                            batchName,
                            academyName: centerName,
                            bookingId: booking.booking_id ?? String(booking.id),
                            cancelReason: cancelReasonForUser,
                        }, 'medium', { type: 'booking_cancelled', bookingId: booking.id, recipient: 'user' });
                    }
                }
                // Notification to Academy Owner (Push + Email + SMS + WhatsApp)
                if (centerOwnerId) {
                    const academyOwner = await user_model_1.UserModel.findById(centerOwnerId).select('id email mobile').lean();
                    if (academyOwner) {
                        // Push notification
                        const academyPushNotification = (0, notificationMessages_1.getBookingCancelledAcademyPush)({
                            bookingId: booking.booking_id || booking.id,
                            batchName,
                            userName,
                            reason: reason || null,
                        });
                        await (0, notification_service_1.createAndSendNotification)({
                            recipientType: 'academy',
                            recipientId: academyOwner.id,
                            title: academyPushNotification.title,
                            body: academyPushNotification.body,
                            channels: ['push'],
                            priority: 'medium',
                            data: {
                                type: 'booking_cancelled_academy',
                                bookingId: booking.id || booking.booking_id,
                                batchId: booking.batch.toString(),
                                reason: reason || null,
                            },
                        });
                        // Email notification (async)
                        const academyEmail = centerDetails?.email || academyOwner.email;
                        if (academyEmail) {
                            (0, notificationQueue_service_1.queueEmail)(academyEmail, notificationMessages_1.EmailSubjects.BOOKING_CANCELLED_ACADEMY, {
                                template: notificationMessages_1.EmailTemplates.BOOKING_CANCELLED_ACADEMY,
                                text: (0, notificationMessages_1.getBookingCancelledAcademyEmailText)({
                                    bookingId: booking.booking_id ?? undefined,
                                    batchName,
                                    userName,
                                    reason: reason || null,
                                }),
                                templateVariables: {
                                    centerName,
                                    batchName,
                                    userName,
                                    userEmail: user?.email || 'N/A',
                                    bookingId: booking.booking_id ?? undefined,
                                    reason: reason || null,
                                    year: new Date().getFullYear(),
                                },
                                priority: 'medium',
                                metadata: {
                                    type: 'booking_cancelled',
                                    bookingId: booking.booking_id ?? undefined,
                                    recipient: 'academy',
                                },
                            });
                        }
                        // SMS notification (async)
                        const academyMobile = centerDetails?.mobile_number || academyOwner.mobile;
                        if (academyMobile) {
                            const smsMessage = (0, notificationMessages_1.getBookingCancelledAcademySms)({
                                bookingId: booking.booking_id ?? undefined,
                                batchName,
                                userName,
                                reason: reason || null,
                            });
                            (0, notificationQueue_service_1.queueSms)(academyMobile, smsMessage, 'medium', {
                                type: 'booking_cancelled',
                                bookingId: booking.booking_id ?? undefined,
                                recipient: 'academy',
                            });
                        }
                        // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
                        // if (academyMobile) {
                        //   const whatsappMessage = getBookingCancelledAcademyWhatsApp({
                        //     bookingId: booking.booking_id ?? undefined,
                        //     batchName,
                        //     userName,
                        //     reason: reason || null,
                        //   });
                        //   queueWhatsApp(academyMobile, whatsappMessage, 'medium', {
                        //     type: 'booking_cancelled',
                        //     bookingId: booking.booking_id ?? undefined,
                        //     recipient: 'academy',
                        //   });
                        // }
                    }
                }
                // Notification to Admin (Email only, async)
                if (env_1.config.admin.email) {
                    (0, notificationQueue_service_1.queueEmail)(env_1.config.admin.email, notificationMessages_1.EmailSubjects.BOOKING_CANCELLED_ADMIN, {
                        template: notificationMessages_1.EmailTemplates.BOOKING_CANCELLED_ADMIN,
                        text: (0, notificationMessages_1.getBookingCancelledAdminEmailText)({
                            bookingId: booking.booking_id ?? undefined,
                            batchName,
                            centerName,
                            userName,
                            reason: reason || null,
                        }),
                        templateVariables: {
                            userName,
                            userEmail: user?.email || 'N/A',
                            batchName,
                            centerName,
                            bookingId: booking.booking_id ?? undefined,
                            reason: reason || null,
                            year: new Date().getFullYear(),
                        },
                        priority: 'medium',
                        metadata: {
                            type: 'booking_cancelled',
                            bookingId: booking.booking_id ?? undefined,
                            recipient: 'admin',
                        },
                    });
                }
                logger_1.logger.info(`Booking cancellation notifications queued for booking: ${booking.booking_id}`);
            }
            catch (notificationError) {
                // Log error but don't fail the cancellation
                logger_1.logger.error('Error sending booking cancellation notifications', {
                    bookingId: booking.id,
                    error: notificationError instanceof Error ? notificationError.message : notificationError,
                });
            }
        })().catch((error) => {
            // Catch any unhandled errors in the async function
            logger_1.logger.error('Unhandled error in background notification sending for cancellation', {
                bookingId: booking.id,
                error: error instanceof Error ? error.message : error,
            });
        });
        logger_1.logger.info(`Booking cancelled: ${booking.id} by user ${userId}, Reason: ${reason}`);
        // Return only relevant data
        const response = {
            id: updatedBooking.id || updatedBooking._id?.toString() || '',
            booking_id: updatedBooking.booking_id || '',
            status: updatedBooking.status,
            amount: updatedBooking.amount,
            currency: updatedBooking.currency,
            payment: {
                status: updatedBooking.payment.status,
                failure_reason: updatedBooking.payment.failure_reason || reason,
            },
            cancellation_reason: updatedBooking.cancellation_reason || reason,
            cancelled_by: updatedBooking.cancelled_by || 'user',
            batch: {
                id: updatedBooking.batch?._id?.toString() || updatedBooking.batch?.id || '',
                name: updatedBooking.batch?.name || '',
            },
            center: {
                id: updatedBooking.center?._id?.toString() || updatedBooking.center?.id || '',
                center_name: updatedBooking.center?.center_name || '',
            },
            sport: {
                id: updatedBooking.sport?._id?.toString() || updatedBooking.sport?.id || '',
                name: updatedBooking.sport?.name || '',
            },
        };
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to cancel booking:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            bookingId,
            userId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to cancel booking');
    }
};
exports.cancelBooking = cancelBooking;
/** Default reason when system auto-cancels due to payment not completed in time */
exports.PAYMENT_EXPIRED_CANCELLATION_REASON = 'Payment not completed within the allowed time. Your booking has been automatically cancelled.';
/**
 * Cancel an approved booking by system (e.g. payment link expired). Sends same notifications as user cancellation.
 * Used by the booking payment expiry cron job.
 */
const cancelBookingBySystem = async (bookingId, reason = exports.PAYMENT_EXPIRED_CANCELLATION_REASON) => {
    const booking = await booking_model_1.BookingModel.findOne({
        id: bookingId,
        status: booking_model_1.BookingStatus.APPROVED,
        is_deleted: false,
    })
        .populate('batch', 'id name')
        .populate('center', 'id center_name')
        .populate('sport', 'id name')
        .lean();
    if (!booking) {
        logger_1.logger.warn('cancelBookingBySystem: booking not found or not eligible', { bookingId });
        return;
    }
    if (booking.payment?.status === booking_model_1.PaymentStatus.SUCCESS) {
        logger_1.logger.warn('cancelBookingBySystem: booking already paid', { bookingId });
        return;
    }
    await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
        $set: {
            status: booking_model_1.BookingStatus.CANCELLED,
            'payment.status': [booking_model_1.PaymentStatus.INITIATED, booking_model_1.PaymentStatus.PENDING].includes(booking.payment?.status)
                ? booking_model_1.PaymentStatus.CANCELLED
                : booking.payment?.status,
            'payment.failure_reason': reason,
            cancellation_reason: reason,
            cancelled_by: 'system',
        },
    });
    if (booking.payment?.razorpay_order_id) {
        await transaction_model_1.TransactionModel.findOneAndUpdate({ booking: booking._id, razorpay_order_id: booking.payment.razorpay_order_id }, { $set: { status: transaction_model_1.TransactionStatus.CANCELLED, failure_reason: reason } }, { upsert: false });
    }
    await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.BOOKING_CANCELLED, auditTrail_model_1.ActionScale.MEDIUM, `Booking auto-cancelled by system (payment not completed in time): ${reason}`, 'Booking', booking._id, {
        userId: booking.user,
        academyId: booking.center,
        bookingId: booking._id,
        metadata: { reason, cancelledBy: 'system' },
    });
    (async () => {
        try {
            const [userDetails, centerDetails, batchDetails] = await Promise.all([
                user_model_1.UserModel.findById(booking.user).select('id firstName lastName email mobile').lean(),
                coachingCenter_model_1.CoachingCenterModel.findById(booking.center).select('id center_name user email mobile_number').lean(),
                batch_model_1.BatchModel.findById(booking.batch).select('id name').lean(),
            ]);
            const batchName = batchDetails?.name || 'batch';
            const centerName = centerDetails?.center_name || 'Academy';
            const user = userDetails;
            const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
            const centerOwnerId = centerDetails?.user?.toString();
            if (user?.id) {
                const userPushNotification = (0, notificationMessages_1.getBookingCancelledUserPush)({ batchName, reason: reason || null });
                await (0, notification_service_1.createAndSendNotification)({
                    recipientType: 'user',
                    recipientId: user.id,
                    title: userPushNotification.title,
                    body: userPushNotification.body,
                    channels: ['push'],
                    priority: 'medium',
                    data: { type: 'booking_cancelled', bookingId: booking.id, batchId: booking.batch.toString(), reason: reason || null },
                });
                if (user.email) {
                    (0, notificationQueue_service_1.queueEmail)(user.email, notificationMessages_1.EmailSubjects.BOOKING_CANCELLED_USER, {
                        template: notificationMessages_1.EmailTemplates.BOOKING_CANCELLED_USER,
                        text: (0, notificationMessages_1.getBookingCancelledUserEmailText)({ batchName, centerName, reason: reason || null }),
                        templateVariables: {
                            userName,
                            batchName,
                            centerName,
                            bookingId: booking.booking_id ?? booking.id,
                            reason: reason || null,
                            year: new Date().getFullYear(),
                        },
                        priority: 'medium',
                        metadata: { type: 'booking_cancelled', bookingId: booking.id, recipient: 'user' },
                    });
                }
                if (user.mobile) {
                    (0, notificationQueue_service_1.queueSms)(user.mobile, (0, notificationMessages_1.getBookingCancelledUserSms)({
                        batchName,
                        centerName,
                        bookingId: booking.booking_id ?? undefined,
                        reason: reason || null,
                    }), 'medium', { type: 'booking_cancelled', bookingId: booking.id, recipient: 'user' });
                    (0, notificationQueue_service_1.queueWhatsAppTemplate)(user.mobile, 'booking_cancelled', {
                        batchName,
                        academyName: centerName,
                        bookingId: booking.booking_id ?? String(booking.id),
                        cancelReason: reason || '—',
                    }, 'medium', { type: 'booking_cancelled', bookingId: booking.id, recipient: 'user' });
                }
            }
            if (centerOwnerId) {
                const academyOwner = await user_model_1.UserModel.findById(centerOwnerId).select('id email mobile').lean();
                if (academyOwner) {
                    const academyPushNotification = (0, notificationMessages_1.getBookingCancelledAcademyPush)({
                        bookingId: booking.booking_id || booking.id,
                        batchName,
                        userName,
                        reason: reason || null,
                    });
                    await (0, notification_service_1.createAndSendNotification)({
                        recipientType: 'academy',
                        recipientId: academyOwner.id,
                        title: academyPushNotification.title,
                        body: academyPushNotification.body,
                        channels: ['push'],
                        priority: 'medium',
                        data: { type: 'booking_cancelled_academy', bookingId: booking.id, batchId: booking.batch.toString(), reason: reason || null },
                    });
                    const academyEmail = centerDetails?.email || academyOwner.email;
                    if (academyEmail) {
                        (0, notificationQueue_service_1.queueEmail)(academyEmail, notificationMessages_1.EmailSubjects.BOOKING_CANCELLED_ACADEMY, {
                            template: notificationMessages_1.EmailTemplates.BOOKING_CANCELLED_ACADEMY,
                            text: (0, notificationMessages_1.getBookingCancelledAcademyEmailText)({
                                bookingId: booking.booking_id ?? undefined,
                                batchName,
                                userName,
                                reason: reason || null,
                            }),
                            templateVariables: {
                                centerName,
                                batchName,
                                userName,
                                userEmail: user?.email || 'N/A',
                                bookingId: booking.booking_id ?? undefined,
                                reason: reason || null,
                                year: new Date().getFullYear(),
                            },
                            priority: 'medium',
                            metadata: { type: 'booking_cancelled', bookingId: booking.booking_id ?? undefined, recipient: 'academy' },
                        });
                    }
                    const academyMobile = centerDetails?.mobile_number || academyOwner.mobile;
                    if (academyMobile) {
                        (0, notificationQueue_service_1.queueSms)(academyMobile, (0, notificationMessages_1.getBookingCancelledAcademySms)({
                            bookingId: booking.booking_id ?? undefined,
                            batchName,
                            userName,
                            reason: reason || null,
                        }), 'medium', { type: 'booking_cancelled', bookingId: booking.booking_id ?? undefined, recipient: 'academy' });
                        // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
                        // queueWhatsApp(academyMobile, getBookingCancelledAcademyWhatsApp({
                        //   bookingId: booking.booking_id ?? undefined,
                        //   batchName,
                        //   userName,
                        //   reason: reason || null,
                        // }), 'medium', { type: 'booking_cancelled', bookingId: booking.booking_id ?? undefined, recipient: 'academy' });
                    }
                }
            }
            if (env_1.config.admin.email) {
                (0, notificationQueue_service_1.queueEmail)(env_1.config.admin.email, notificationMessages_1.EmailSubjects.BOOKING_CANCELLED_ADMIN, {
                    template: notificationMessages_1.EmailTemplates.BOOKING_CANCELLED_ADMIN,
                    text: (0, notificationMessages_1.getBookingCancelledAdminEmailText)({
                        bookingId: booking.booking_id ?? undefined,
                        batchName,
                        centerName,
                        userName,
                        reason: reason || null,
                    }),
                    templateVariables: {
                        userName,
                        userEmail: user?.email || 'N/A',
                        batchName,
                        centerName,
                        bookingId: booking.booking_id ?? undefined,
                        reason: reason || null,
                        year: new Date().getFullYear(),
                    },
                    priority: 'medium',
                    metadata: { type: 'booking_cancelled', bookingId: booking.booking_id ?? undefined, recipient: 'admin' },
                });
            }
            logger_1.logger.info('Booking cancellation (system) notifications queued', { bookingId: booking.id });
        }
        catch (err) {
            logger_1.logger.error('Error sending system cancellation notifications', { bookingId: booking.id, error: err });
        }
    })().catch(() => { });
};
exports.cancelBookingBySystem = cancelBookingBySystem;
//# sourceMappingURL=booking.service.js.map