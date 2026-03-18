"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectBookingRequest = exports.approveBookingRequest = exports.getAcademyBookingById = exports.getAcademyBookings = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../../models/booking.model");
const env_1 = require("../../config/env");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const logger_1 = require("../../utils/logger");
const ApiError_1 = require("../../utils/ApiError");
const i18n_1 = require("../../utils/i18n");
const userCache_1 = require("../../utils/userCache");
const notification_service_1 = require("../common/notification.service");
const notificationQueue_service_1 = require("../common/notificationQueue.service");
const auditTrail_service_1 = require("../common/auditTrail.service");
const auditTrail_model_1 = require("../../models/auditTrail.model");
const settings_service_1 = require("../common/settings.service");
const notificationMessages_1 = require("../common/notificationMessages");
/**
 * Get academy-friendly status message based on booking status and payment status
 */
const getAcademyBookingStatusMessage = (bookingStatus, paymentStatus) => {
    // Handle cancelled bookings
    if (bookingStatus === booking_model_1.BookingStatus.CANCELLED) {
        return 'Booking has been cancelled.';
    }
    // Handle completed bookings
    if (bookingStatus === booking_model_1.BookingStatus.COMPLETED) {
        return 'Booking completed successfully.';
    }
    // Handle rejected bookings
    if (bookingStatus === booking_model_1.BookingStatus.REJECTED) {
        return 'Booking request has been rejected.';
    }
    // Handle confirmed bookings with successful payment
    if (bookingStatus === booking_model_1.BookingStatus.CONFIRMED && paymentStatus === booking_model_1.PaymentStatus.SUCCESS) {
        return 'Booking confirmed! Payment received successfully.';
    }
    // Handle approved bookings
    if (bookingStatus === booking_model_1.BookingStatus.APPROVED) {
        if (paymentStatus === booking_model_1.PaymentStatus.NOT_INITIATED) {
            return 'Booking approved. Waiting for customer payment.';
        }
        if (paymentStatus === booking_model_1.PaymentStatus.INITIATED) {
            return 'Payment initiated by customer. Waiting for payment completion.';
        }
        if (paymentStatus === booking_model_1.PaymentStatus.PENDING || paymentStatus === booking_model_1.PaymentStatus.PROCESSING) {
            return 'Payment is being processed.';
        }
        if (paymentStatus === booking_model_1.PaymentStatus.FAILED) {
            return 'Payment failed. Customer needs to retry payment.';
        }
        if (paymentStatus === booking_model_1.PaymentStatus.SUCCESS) {
            return 'Booking confirmed! Payment received.';
        }
    }
    // Handle slot booked status (waiting for academy approval)
    if (bookingStatus === booking_model_1.BookingStatus.SLOT_BOOKED || bookingStatus === booking_model_1.BookingStatus.REQUESTED) {
        return 'New booking request. Waiting for your approval.';
    }
    // Handle payment pending (legacy status)
    if (bookingStatus === booking_model_1.BookingStatus.PAYMENT_PENDING || bookingStatus === booking_model_1.BookingStatus.PENDING) {
        if (paymentStatus === booking_model_1.PaymentStatus.INITIATED) {
            return 'Payment initiated. Waiting for completion.';
        }
        if (paymentStatus === booking_model_1.PaymentStatus.PENDING || paymentStatus === booking_model_1.PaymentStatus.PROCESSING) {
            return 'Payment is being processed.';
        }
        if (paymentStatus === booking_model_1.PaymentStatus.FAILED) {
            return 'Payment failed.';
        }
        return 'Payment pending.';
    }
    // Default message
    return bookingStatus;
};
/**
 * Get bookings for academy (coaching centers owned by user)
 */
const getAcademyBookings = async (userId, params = {}) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
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
        // Build query
        const query = {
            center: { $in: centerIds },
            is_deleted: false,
        };
        // Filter by center if provided
        if (params.centerId) {
            if (!mongoose_1.Types.ObjectId.isValid(params.centerId)) {
                throw new ApiError_1.ApiError(400, 'Invalid center ID');
            }
            const centerObjectId = new mongoose_1.Types.ObjectId(params.centerId);
            // Verify center belongs to user
            if (!centerIds.some(id => id.toString() === centerObjectId.toString())) {
                throw new ApiError_1.ApiError(403, 'Center does not belong to you');
            }
            query.center = centerObjectId;
        }
        // Filter by batch if provided
        if (params.batchId) {
            if (!mongoose_1.Types.ObjectId.isValid(params.batchId)) {
                throw new ApiError_1.ApiError(400, 'Invalid batch ID');
            }
            query.batch = new mongoose_1.Types.ObjectId(params.batchId);
        }
        // Filter by status if provided
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
        // Get total count
        const total = await booking_model_1.BookingModel.countDocuments(query);
        // Get bookings with minimal population for listing
        const bookings = await booking_model_1.BookingModel.find(query)
            .populate('user', 'firstName lastName')
            .populate('participants', 'firstName middleName lastName')
            .populate('batch', 'name')
            .populate('center', 'center_name')
            .select('booking_id id status amount priceBreakdown payment payout_status rejection_reason cancellation_reason user participants batch center createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalPages = Math.ceil(total / limit);
        // Transform bookings to return only required fields
        const transformedBookings = bookings.map((booking) => {
            // Format participant names (student names)
            let studentName = 'N/A';
            const studentCount = booking.participants && Array.isArray(booking.participants) ? booking.participants.length : 0;
            if (booking.participants && Array.isArray(booking.participants) && booking.participants.length > 0) {
                const participantNames = booking.participants
                    .map((p) => {
                    const firstName = p?.firstName || '';
                    const middleName = p?.middleName || '';
                    const lastName = p?.lastName || '';
                    return `${firstName} ${middleName} ${lastName}`.trim();
                })
                    .filter((name) => name.length > 0);
                studentName = participantNames.join(', ') || 'N/A';
            }
            // For academy, show only batch_amount (what they earn), not total amount with platform fee and GST
            const batchAmount = booking.priceBreakdown?.batch_amount || booking.amount || 0;
            // Determine if accept/reject actions should be shown
            // Actions are available when booking is in SLOT_BOOKED or REQUESTED status (waiting for academy approval)
            const bookingStatus = booking.status || booking_model_1.BookingStatus.PENDING;
            const paymentStatus = booking.payment?.status || booking_model_1.PaymentStatus.NOT_INITIATED;
            const canAcceptReject = bookingStatus === booking_model_1.BookingStatus.SLOT_BOOKED || bookingStatus === booking_model_1.BookingStatus.REQUESTED;
            const statusMessage = getAcademyBookingStatusMessage(bookingStatus, paymentStatus);
            return {
                id: booking.id,
                booking_id: booking.booking_id || booking.id, // Use booking_id if available, fallback to id
                user_name: booking.user
                    ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim()
                    : 'N/A',
                student_name: studentName,
                student_count: studentCount,
                batch_name: booking.batch?.name || 'N/A',
                center_name: booking.center?.center_name || 'N/A',
                amount: batchAmount, // Show only batch amount (admission fee + base fee), hide platform fee and GST
                status: bookingStatus,
                status_message: statusMessage,
                payment_status: paymentStatus === booking_model_1.PaymentStatus.SUCCESS ? 'paid' : (paymentStatus || 'pending'),
                payout_status: booking.payout_status || 'not_initiated',
                can_accept_reject: canAcceptReject,
                rejection_reason: bookingStatus === booking_model_1.BookingStatus.REJECTED ? booking.rejection_reason || null : null,
                cancellation_reason: bookingStatus === booking_model_1.BookingStatus.CANCELLED ? booking.cancellation_reason || null : null,
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
        logger_1.logger.error('Failed to get academy bookings:', {
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get academy bookings');
    }
};
exports.getAcademyBookings = getAcademyBookings;
/**
 * Get booking by ID for academy
 */
const getAcademyBookingById = async (bookingId, userId) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            logger_1.logger.warn('No coaching centers found for academy user', { userId });
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Find booking with full details using id field (UUID string)
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            center: { $in: centerIds },
            is_deleted: false,
        })
            .populate('user', 'id firstName lastName email mobile profileImage')
            .populate('participants', 'id firstName lastName dob gender profilePhoto')
            .populate('batch', 'id name')
            .populate('center', 'id center_name email mobile_number logo')
            .populate('sport', 'id name logo')
            .select('_id id booking_id user participants batch center sport amount currency status notes cancellation_reason rejection_reason payment priceBreakdown payout_status createdAt')
            .lean();
        if (!booking) {
            logger_1.logger.warn('Booking not found', { bookingId, centerIds });
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        // Transform to match the required response structure
        const bookingData = booking;
        // Calculate age for participants
        const calculateAgeFromDob = (dob) => {
            if (!dob)
                return '';
            const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age.toString();
        };
        // Transform participants
        const participants = Array.isArray(bookingData.participants)
            ? bookingData.participants
            : bookingData.participants ? [bookingData.participants] : [];
        const transformedParticipants = participants.map((participant) => ({
            _id: participant._id?.toString() || '',
            firstName: participant.firstName || '',
            middleName: participant.middleName || '',
            lastName: participant.lastName || '',
            profilePhoto: participant.profilePhoto || '',
            gender: participant.gender || '',
            age: calculateAgeFromDob(participant.dob),
            dob: participant.dob || null,
        }));
        // Transform user
        const transformedUser = bookingData.user ? {
            _id: bookingData.user._id?.toString() || '',
            id: bookingData.user.id || '',
            firstName: bookingData.user.firstName || '',
            lastName: bookingData.user.lastName || '',
            email: bookingData.user.email || '',
            mobile: bookingData.user.mobile || '',
            profileImage: bookingData.user.profileImage || '',
        } : null;
        // Transform batch
        const transformedBatch = bookingData.batch ? {
            _id: bookingData.batch._id?.toString() || '',
            name: bookingData.batch.name || '',
        } : null;
        // Transform center
        const transformedCenter = bookingData.center ? {
            _id: bookingData.center._id?.toString() || '',
            center_name: bookingData.center.center_name || '',
            mobile_number: bookingData.center.mobile_number || '',
            logo: bookingData.center.logo || '',
            email: bookingData.center.email || '',
            id: bookingData.center.id || '',
        } : null;
        // Transform sport
        const transformedSport = bookingData.sport ? {
            _id: bookingData.sport._id?.toString() || '',
            name: bookingData.sport.name || '',
            logo: bookingData.sport.logo || '',
        } : null;
        // For academy, show only batch_amount (what they earn), not total amount with platform fee and GST
        // Same logic as listing endpoint
        const amount = bookingData.priceBreakdown?.batch_amount || bookingData.amount || 0;
        // Calculate payment_status
        const paymentStatus = bookingData.payment?.status || booking_model_1.PaymentStatus.NOT_INITIATED;
        const payment_status = paymentStatus === booking_model_1.PaymentStatus.SUCCESS ? 'paid' : (paymentStatus || 'pending');
        // Calculate can_accept_reject
        const bookingStatus = bookingData.status || booking_model_1.BookingStatus.PENDING;
        const can_accept_reject = bookingStatus === booking_model_1.BookingStatus.SLOT_BOOKED || bookingStatus === booking_model_1.BookingStatus.REQUESTED;
        // Calculate status_message using the same function as list endpoint
        const status_message = getAcademyBookingStatusMessage(bookingStatus, paymentStatus);
        // Return only the required fields
        return {
            _id: bookingData._id?.toString() || '',
            id: bookingData.id || '',
            booking_id: bookingData.booking_id || '',
            user: transformedUser,
            participants: transformedParticipants,
            batch: transformedBatch,
            center: transformedCenter,
            sport: transformedSport,
            amount: amount,
            currency: bookingData.currency || 'INR',
            status: bookingData.status || '',
            status_message: status_message,
            payment_status: payment_status,
            payout_status: bookingData.payout_status || 'not_initiated',
            can_accept_reject: can_accept_reject,
            notes: bookingData.notes || null,
            cancellation_reason: bookingData.cancellation_reason || null,
            rejection_reason: bookingData.rejection_reason || null,
            createdAt: bookingData.createdAt || null,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get academy booking:', {
            error: error instanceof Error ? error.message : error,
            bookingId,
            userId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get academy booking');
    }
};
exports.getAcademyBookingById = getAcademyBookingById;
/**
 * Approve booking request (academy confirms the booking)
 */
const approveBookingRequest = async (bookingId, userId) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Find booking - must be SLOT_BOOKED status (waiting for academy approval)
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            center: { $in: centerIds },
            status: { $in: [booking_model_1.BookingStatus.SLOT_BOOKED, booking_model_1.BookingStatus.REQUESTED] }, // Include legacy REQUESTED for backward compatibility
            is_deleted: false,
        })
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName middleName lastName')
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking request not found or already processed');
        }
        const paymentConfig = await (0, settings_service_1.getBookingPaymentConfig)();
        const expiryHours = paymentConfig.paymentLinkExpiryHours;
        const paymentToken = crypto_1.default.randomBytes(32).toString('hex');
        const paymentTokenExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
        // Update booking status to APPROVED and set payment token
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.APPROVED,
                payment_token: paymentToken,
                payment_token_expires_at: paymentTokenExpiresAt,
            },
        }, { new: true })
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .select('id booking_id status amount currency payment batch center sport updatedAt')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to update booking status');
        }
        // Create audit trail
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.BOOKING_APPROVED, auditTrail_model_1.ActionScale.HIGH, `Booking request approved for batch ${booking.batch?.name || 'Unknown'}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                batchId: booking.batch.toString(),
                participantCount: booking.participants.length,
            },
        });
        // Send notification to user (Push + Email + SMS + WhatsApp)
        const user = booking.user;
        const batchName = booking.batch?.name || 'batch';
        const centerName = booking.center?.center_name || 'Academy';
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
        if (user?.id) {
            // Push notification
            const pushNotification = (0, notificationMessages_1.getBookingApprovedUserPush)({
                batchName,
            });
            await (0, notification_service_1.createAndSendNotification)({
                recipientType: 'user',
                recipientId: user.id,
                title: pushNotification.title,
                body: pushNotification.body,
                channels: ['push'],
                priority: 'high',
                data: {
                    type: 'booking_approved',
                    bookingId: booking.id,
                    batchId: booking.batch.toString(),
                },
            });
            // Email notification (async)
            if (user.email) {
                (0, notificationQueue_service_1.queueEmail)(user.email, notificationMessages_1.EmailSubjects.BOOKING_APPROVED_USER, {
                    template: notificationMessages_1.EmailTemplates.BOOKING_APPROVED_USER,
                    text: (0, notificationMessages_1.getBookingApprovedUserEmailText)({
                        batchName,
                        centerName,
                    }),
                    templateVariables: {
                        userName,
                        batchName,
                        centerName,
                        bookingId: booking.booking_id ?? booking.id,
                        year: new Date().getFullYear(),
                        paymentUrl: env_1.config.mainSiteUrl ? `${env_1.config.mainSiteUrl}/pay/${paymentToken}` : `https://front.playasport.in/pay/${paymentToken}`,
                    },
                    priority: 'high',
                    metadata: {
                        type: 'booking_approved',
                        bookingId: booking.id,
                        recipient: 'user',
                    },
                });
            }
            // SMS notification (async)
            if (user.mobile) {
                const smsMessage = (0, notificationMessages_1.getBookingApprovedUserSms)({
                    batchName,
                    centerName,
                    bookingId: booking.booking_id ?? undefined,
                });
                (0, notificationQueue_service_1.queueSms)(user.mobile, smsMessage, 'high', {
                    type: 'booking_approved',
                    bookingId: booking.id,
                    recipient: 'user',
                });
            }
            // WhatsApp: queue payment_request template (Meta approved template)
            if (user.mobile) {
                const mainSiteUrl = env_1.config.mainSiteUrl || 'https://front.playasport.in';
                const paymentUrl = `${mainSiteUrl}/pay/${paymentToken}`;
                (0, notificationQueue_service_1.queueWhatsAppTemplate)(user.mobile, 'payment_request', {
                    userName,
                    academyName: centerName,
                    bookingId: updatedBooking.booking_id || booking.booking_id || String(booking.id),
                    paymentUrl,
                    numberOfHours: String(expiryHours),
                    buttonUrlParameter: paymentToken,
                }, 'high', { type: 'booking_approved', bookingId: booking.id, recipient: 'user' });
            }
        }
        logger_1.logger.info(`Booking request approved: ${bookingId} by academy user ${userId}`);
        // Return only relevant data
        const response = {
            id: updatedBooking.id || updatedBooking._id?.toString() || '',
            booking_id: updatedBooking.booking_id || '',
            status: updatedBooking.status,
            amount: updatedBooking.amount,
            currency: updatedBooking.currency,
            payment: {
                status: updatedBooking.payment.status,
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
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to approve booking request:', {
            error: error instanceof Error ? error.message : error,
            bookingId,
            userId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to approve booking request');
    }
};
exports.approveBookingRequest = approveBookingRequest;
/**
 * Reject booking request (academy rejects the booking)
 */
const rejectBookingRequest = async (bookingId, userId, reason) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id').lean();
        if (coachingCenters.length === 0) {
            throw new ApiError_1.ApiError(404, 'Booking not found');
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Find booking - must be SLOT_BOOKED status (waiting for academy approval)
        const booking = await booking_model_1.BookingModel.findOne({
            id: bookingId,
            center: { $in: centerIds },
            status: { $in: [booking_model_1.BookingStatus.SLOT_BOOKED, booking_model_1.BookingStatus.REQUESTED] }, // Include legacy REQUESTED for backward compatibility
            is_deleted: false,
        })
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName middleName lastName')
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .lean();
        if (!booking) {
            throw new ApiError_1.ApiError(404, 'Booking request not found or already processed');
        }
        // Update booking status to REJECTED
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.REJECTED,
                rejection_reason: reason || null, // Store rejection reason in separate field
            },
        }, { new: true })
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .select('id booking_id status amount currency payment rejection_reason batch center sport updatedAt')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to update booking status');
        }
        // Create audit trail
        await (0, auditTrail_service_1.createAuditTrail)(auditTrail_model_1.ActionType.BOOKING_REJECTED, auditTrail_model_1.ActionScale.MEDIUM, `Booking request rejected for batch ${booking.batch?.name || 'Unknown'} with reason: ${reason || 'No reason provided'}`, 'Booking', booking._id, {
            userId: userObjectId,
            academyId: booking.center,
            bookingId: booking._id,
            metadata: {
                batchId: booking.batch.toString(),
                participantCount: booking.participants.length,
                reason: reason || null,
            },
        });
        // Send notification to user (Push + Email + SMS + WhatsApp)
        const user = booking.user;
        const batchName = booking.batch?.name || 'batch';
        const centerName = booking.center?.center_name || 'Academy';
        const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User' : 'User';
        if (user?.id) {
            // Push notification
            const pushNotification = (0, notificationMessages_1.getBookingRejectedUserPush)({
                batchName,
                reason: reason || null,
            });
            await (0, notification_service_1.createAndSendNotification)({
                recipientType: 'user',
                recipientId: user.id,
                title: pushNotification.title,
                body: pushNotification.body,
                channels: ['push'],
                priority: 'medium',
                data: {
                    type: 'booking_rejected',
                    bookingId: booking.id,
                    batchId: booking.batch.toString(),
                    reason: reason || null,
                },
            });
            // Email notification (async)
            if (user.email) {
                (0, notificationQueue_service_1.queueEmail)(user.email, notificationMessages_1.EmailSubjects.BOOKING_REJECTED_USER, {
                    template: notificationMessages_1.EmailTemplates.BOOKING_REJECTED_USER,
                    text: (0, notificationMessages_1.getBookingRejectedUserEmailText)({
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
                        type: 'booking_rejected',
                        bookingId: booking.id,
                        recipient: 'user',
                    },
                });
            }
            // SMS notification (async)
            if (user.mobile) {
                const smsMessage = (0, notificationMessages_1.getBookingRejectedUserSms)({
                    batchName,
                    centerName,
                    bookingId: booking.booking_id ?? undefined,
                    reason: reason || null,
                });
                (0, notificationQueue_service_1.queueSms)(user.mobile, smsMessage, 'medium', {
                    type: 'booking_rejected',
                    bookingId: booking.id,
                    recipient: 'user',
                });
            }
            // TODO(WhatsApp): Enable after Meta template approved. See docs/WHATSAPP_TEMPLATES.md
            // if (user.mobile) {
            //   const whatsappMessage = getBookingRejectedUserWhatsApp({
            //     batchName,
            //     centerName,
            //     bookingId: booking.booking_id ?? undefined,
            //     reason: reason || null,
            //   });
            //   queueWhatsApp(user.mobile, whatsappMessage, 'medium', {
            //     type: 'booking_rejected',
            //     bookingId: booking.id,
            //     recipient: 'user',
            //   });
            // }
        }
        logger_1.logger.info(`Booking request rejected: ${bookingId} by academy user ${userId}`);
        // Return only relevant data
        const response = {
            id: updatedBooking.id || updatedBooking._id?.toString() || '',
            booking_id: updatedBooking.booking_id || '',
            status: updatedBooking.status,
            amount: updatedBooking.amount,
            currency: updatedBooking.currency,
            payment: {
                status: updatedBooking.payment.status,
            },
            rejection_reason: updatedBooking.rejection_reason || reason || null,
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
        return response;
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to reject booking request:', {
            error: error instanceof Error ? error.message : error,
            bookingId,
            userId,
        });
        throw new ApiError_1.ApiError(500, 'Failed to reject booking request');
    }
};
exports.rejectBookingRequest = rejectBookingRequest;
//# sourceMappingURL=booking.service.js.map