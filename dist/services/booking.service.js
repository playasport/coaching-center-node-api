"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.getUserBookings = exports.verifyPayment = exports.createOrder = exports.getBookingSummary = exports.calculateAge = exports.generateBookingId = void 0;
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../models/booking.model");
const transaction_model_1 = require("../models/transaction.model");
const batch_model_1 = require("../models/batch.model");
const participant_model_1 = require("../models/participant.model");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const batchStatus_enum_1 = require("../enums/batchStatus.enum");
const gender_enum_1 = require("../enums/gender.enum");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const userCache_1 = require("../utils/userCache");
const PaymentService_1 = require("./payment/PaymentService");
const env_1 = require("../config/env");
const email_service_1 = require("./email.service");
const sms_service_1 = require("./sms.service");
// Get payment service instance
const paymentService = (0, PaymentService_1.getPaymentService)();
/**
 * Generate unique booking ID (format: BK-YYYY-NNNN)
 * Example: BK-2024-0001, BK-2024-0002, etc.
 */
const generateBookingId = async () => {
    const year = new Date().getFullYear();
    const prefix = `BK-${year}-`;
    // Find the highest booking_id for this year
    const lastBooking = await booking_model_1.BookingModel.findOne({
        booking_id: { $regex: `^${prefix}` },
    })
        .sort({ booking_id: -1 })
        .select('booking_id')
        .lean();
    let sequence = 1;
    if (lastBooking && lastBooking.booking_id) {
        // Extract sequence number from last booking_id (e.g., BK-2024-0123 -> 123)
        const lastSequence = parseInt(lastBooking.booking_id.replace(prefix, ''), 10);
        if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
        }
    }
    // Format sequence with leading zeros (4 digits)
    const formattedSequence = sequence.toString().padStart(4, '0');
    return `${prefix}${formattedSequence}`;
};
exports.generateBookingId = generateBookingId;
/**
 * Round number to 2 decimal places
 */
const roundToTwoDecimals = (value) => {
    return Math.round(value * 100) / 100;
};
/**
 * Calculate age from date of birth
 * Exported for use in other services
 */
const calculateAge = (dob, currentDate) => {
    const birthDate = new Date(dob);
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = currentDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};
exports.calculateAge = calculateAge;
/**
 * Map participant gender to Gender enum (now gender is already a string, so just return it)
 * Participant gender is now stored as string: 'male', 'female', 'other'
 */
const mapParticipantGenderToEnum = (gender) => {
    if (!gender)
        return null;
    // Gender is already a string enum value, just validate and return
    if (Object.values(gender_enum_1.Gender).includes(gender)) {
        return gender;
    }
    return null;
};
/**
 * Common validation: Validate and fetch participants
 */
const validateAndFetchParticipants = async (participantIds, userObjectId) => {
    if (participantIds.length === 0) {
        throw new ApiError_1.ApiError(400, 'At least one participant ID is required');
    }
    // Validate all participant IDs
    for (const participantId of participantIds) {
        if (!mongoose_1.Types.ObjectId.isValid(participantId)) {
            throw new ApiError_1.ApiError(400, `Invalid participant ID: ${participantId}`);
        }
    }
    // Check for duplicate participant IDs
    const uniqueParticipantIds = [...new Set(participantIds)];
    if (uniqueParticipantIds.length !== participantIds.length) {
        throw new ApiError_1.ApiError(400, 'Duplicate participant IDs are not allowed');
    }
    // Fetch all participants
    const participants = await participant_model_1.ParticipantModel.find({
        _id: { $in: participantIds.map(id => new mongoose_1.Types.ObjectId(id)) },
        is_deleted: false,
        is_active: true,
    }).lean();
    if (participants.length !== participantIds.length) {
        throw new ApiError_1.ApiError(404, 'One or more participants not found or inactive');
    }
    // Verify all participants belong to user
    for (const participant of participants) {
        if (participant.userId.toString() !== userObjectId.toString()) {
            throw new ApiError_1.ApiError(403, `Participant ${participant._id} does not belong to you`);
        }
    }
    return participants;
};
/**
 * Common validation: Validate batch and fetch coaching center
 */
const validateBatchAndCenter = async (batchId) => {
    if (!mongoose_1.Types.ObjectId.isValid(batchId)) {
        throw new ApiError_1.ApiError(400, 'Invalid batch ID');
    }
    const batch = await batch_model_1.BatchModel.findById(batchId)
        .populate('sport', 'id name')
        .populate('center', 'id center_name logo')
        .lean();
    if (!batch || batch.is_deleted || !batch.is_active) {
        throw new ApiError_1.ApiError(404, 'Batch not found or inactive');
    }
    // Check if batch is published
    if (batch.status !== batchStatus_enum_1.BatchStatus.PUBLISHED) {
        throw new ApiError_1.ApiError(400, 'Batch is not available for booking');
    }
    // Fetch coaching center details for validation
    const centerId = batch.center._id || batch.center.id;
    const coachingCenter = await coachingCenter_model_1.CoachingCenterModel.findById(centerId).lean();
    if (!coachingCenter || coachingCenter.is_deleted || !coachingCenter.is_active) {
        throw new ApiError_1.ApiError(404, 'Coaching center not found or inactive');
    }
    return { batch, coachingCenter };
};
/**
 * Common validation: Check if participants are already enrolled in the batch
 */
const validateParticipantEnrollment = async (participantIds, batchId) => {
    // Check if any participant is already enrolled in this batch
    const existingBookings = await booking_model_1.BookingModel.find({
        batch: batchId,
        participants: { $in: participantIds },
        status: { $in: [booking_model_1.BookingStatus.PENDING, booking_model_1.BookingStatus.CONFIRMED] },
        is_deleted: false,
    })
        .populate('participants', 'firstName lastName')
        .lean();
    if (existingBookings.length > 0) {
        // Find which participants are already enrolled
        const enrolledParticipantIds = new Set();
        const participantNames = [];
        for (const booking of existingBookings) {
            for (const bookingParticipantId of booking.participants) {
                const participantIdStr = bookingParticipantId._id?.toString() || bookingParticipantId.toString();
                if (participantIds.some(id => id.toString() === participantIdStr)) {
                    enrolledParticipantIds.add(participantIdStr);
                    const participant = booking.participants.find((p) => {
                        const pId = p._id?.toString() || p.toString();
                        return pId === participantIdStr;
                    });
                    if (participant) {
                        const name = participant.firstName || participant.lastName
                            ? `${participant.firstName || ''} ${participant.lastName || ''}`.trim()
                            : participantIdStr;
                        participantNames.push(name);
                    }
                }
            }
        }
        if (enrolledParticipantIds.size > 0) {
            const namesStr = participantNames.length > 0
                ? participantNames.join(', ')
                : 'one or more participants';
            throw new ApiError_1.ApiError(400, `${namesStr} ${participantNames.length === 1 ? 'is' : 'are'} already enrolled in this batch`);
        }
    }
};
/**
 * Common validation: Validate slot availabilityo
 */
const validateSlotAvailability = async (batch, requestedSlots) => {
    const existingBookings = await booking_model_1.BookingModel.find({
        batch: batch._id,
        status: { $in: [booking_model_1.BookingStatus.PENDING, booking_model_1.BookingStatus.CONFIRMED] },
        is_deleted: false,
    }).lean();
    // Count total participants in existing bookings
    let totalBookedParticipants = 0;
    for (const booking of existingBookings) {
        totalBookedParticipants += booking.participants.length;
    }
    // Check if adding new participants would exceed capacity
    const totalAfterBooking = totalBookedParticipants + requestedSlots;
    if (batch.capacity.max !== null && batch.capacity.max !== undefined && totalAfterBooking > batch.capacity.max) {
        const availableSlots = batch.capacity.max - totalBookedParticipants;
        throw new ApiError_1.ApiError(400, `Insufficient slots available. Only ${availableSlots} slot(s) remaining. Requested: ${requestedSlots}`);
    }
};
/**
 * Common validation: Validate participant eligibility (age, gender, disability)
 */
const validateParticipantEligibility = async (participants, batch, coachingCenter) => {
    const currentDate = new Date();
    for (const participant of participants) {
        // Age Validation
        if (!participant.dob) {
            throw new ApiError_1.ApiError(400, `Participant ${participant.firstName || participant._id} does not have a date of birth. Age validation is required.`);
        }
        const participantAge = (0, exports.calculateAge)(participant.dob, currentDate);
        // Check against batch age range
        if (participantAge < batch.age.min || participantAge > batch.age.max) {
            throw new ApiError_1.ApiError(400, `Participant ${participant.firstName || participant._id} age (${participantAge}) is outside the batch age range (${batch.age.min}-${batch.age.max} years)`);
        }
        // Check against coaching center age range
        if (participantAge < coachingCenter.age.min || participantAge > coachingCenter.age.max) {
            throw new ApiError_1.ApiError(400, `Participant ${participant.firstName || participant._id} age (${participantAge}) is outside the coaching center age range (${coachingCenter.age.min}-${coachingCenter.age.max} years)`);
        }
        // Gender Validation
        if (participant.gender !== null && participant.gender !== undefined) {
            const participantGender = mapParticipantGenderToEnum(participant.gender);
            if (participantGender && coachingCenter.allowed_genders && coachingCenter.allowed_genders.length > 0) {
                if (!coachingCenter.allowed_genders.includes(participantGender)) {
                    const allowedGendersStr = coachingCenter.allowed_genders.join(', ');
                    throw new ApiError_1.ApiError(400, `Participant ${participant.firstName || participant._id} gender (${participantGender}) is not allowed. Allowed genders: ${allowedGendersStr}`);
                }
            }
        }
        // Disability Validation
        const hasDisability = participant.disability === 1;
        if (coachingCenter.is_only_for_disabled) {
            // Center is only for disabled participants
            if (!hasDisability) {
                throw new ApiError_1.ApiError(400, `Participant ${participant.firstName || participant._id} does not have a disability. This coaching center is only for disabled participants.`);
            }
        }
        else {
            // Center is not only for disabled
            if (!coachingCenter.allowed_disabled && hasDisability) {
                throw new ApiError_1.ApiError(400, `Participant ${participant.firstName || participant._id} has a disability. This coaching center does not allow disabled participants.`);
            }
        }
    }
};
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
        // Validate participants using common function
        const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
        const participants = await validateAndFetchParticipants(participantIds, userObjectId);
        // Validate batch and coaching center using common function
        const { batch, coachingCenter } = await validateBatchAndCenter(data.batchId);
        // Validate slot availability using common function
        await validateSlotAvailability(batch, participants.length);
        // Validate participant eligibility (age, gender, disability) using common function
        await validateParticipantEligibility(participants, batch, coachingCenter);
        // Validate if participants are already enrolled in this batch
        const participantObjectIds = participants.map(p => p._id);
        await validateParticipantEnrollment(participantObjectIds, batch._id);
        // Calculate amount
        const admissionFeePerParticipant = batch.admission_fee || 0;
        let baseFee = 0;
        // Calculate base fee from fee_structure if available
        if (batch.fee_structure) {
            // This is a simplified calculation - you may need to adjust based on your fee structure logic
            const feeConfig = batch.fee_structure.fee_configuration;
            if (feeConfig && typeof feeConfig === 'object') {
                // Try to get base_price from fee_configuration
                if ('base_price' in feeConfig && typeof feeConfig.base_price === 'number') {
                    baseFee = feeConfig.base_price;
                }
                else if ('price' in feeConfig && typeof feeConfig.price === 'number') {
                    baseFee = feeConfig.price;
                }
            }
        }
        const perParticipantFee = baseFee;
        const participantCount = participants.length;
        // Calculate base amount: (admission fee + base fee) * participant count
        const totalAdmissionFee = roundToTwoDecimals(admissionFeePerParticipant * participantCount);
        const totalBaseFee = roundToTwoDecimals(perParticipantFee * participantCount);
        const baseAmount = roundToTwoDecimals(totalAdmissionFee + totalBaseFee);
        // Platform fee (from config, default 200)
        const platformFee = env_1.config.booking.platformFee;
        // Subtotal before GST
        const subtotal = roundToTwoDecimals(baseAmount + platformFee);
        // GST calculation (from config, default 18%)
        const gstPercentage = env_1.config.booking.gstPercentage;
        const gst = roundToTwoDecimals((subtotal * gstPercentage) / 100);
        // Total amount including GST
        const totalAmount = roundToTwoDecimals(subtotal + gst);
        if (totalAmount <= 0) {
            throw new ApiError_1.ApiError(400, 'Booking amount must be greater than zero');
        }
        return {
            batch: {
                id: batch._id.toString(),
                name: batch.name,
                sport: {
                    id: batch.sport._id?.toString() || batch.sport.id,
                    name: batch.sport.name,
                },
                center: {
                    id: batch.center._id?.toString() || batch.center.id,
                    name: batch.center.center_name,
                    logo: batch.center.logo || null,
                    address: coachingCenter.location?.address || null,
                    experience: coachingCenter.experience ?? null,
                },
                scheduled: batch.scheduled,
                duration: batch.duration,
                admission_fee: batch.admission_fee,
                fee_structure: batch.fee_structure,
            },
            participants: participants.map(p => {
                const dob = p.dob ? new Date(p.dob) : null;
                const age = dob ? (0, exports.calculateAge)(dob, new Date()) : null;
                return {
                    id: p._id.toString(),
                    firstName: p.firstName,
                    lastName: p.lastName,
                    age,
                };
            }),
            amount: totalAmount,
            currency: 'INR',
            breakdown: {
                admission_fee: totalAdmissionFee > 0 ? roundToTwoDecimals(totalAdmissionFee) : undefined,
                base_fee: baseFee > 0 ? roundToTwoDecimals(baseFee) : undefined,
                per_participant_fee: perParticipantFee > 0 ? roundToTwoDecimals(perParticipantFee) : undefined,
                platform_fee: platformFee > 0 ? roundToTwoDecimals(platformFee) : undefined,
                subtotal: subtotal > 0 ? roundToTwoDecimals(subtotal) : undefined,
                gst: gst > 0 ? roundToTwoDecimals(gst) : undefined,
                gst_percentage: gstPercentage,
                total: roundToTwoDecimals(totalAmount),
            },
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get booking summary:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get booking summary');
    }
};
exports.getBookingSummary = getBookingSummary;
/**
 * Create Razorpay order and booking record
 */
const createOrder = async (data, userId) => {
    try {
        // Validate user
        const userObjectId = await (0, userCache_1.getUserObjectId)(userId);
        if (!userObjectId) {
            throw new ApiError_1.ApiError(404, (0, i18n_1.t)('user.notFound') || 'User not found');
        }
        // Get booking summary to calculate amount
        const summary = await (0, exports.getBookingSummary)({
            batchId: data.batchId,
            participantIds: data.participantIds,
        }, userId);
        // All validations are done in getBookingSummary, but we also validate here for safety
        // Validate participants using common function
        const participantIds = Array.isArray(data.participantIds) ? data.participantIds : [data.participantIds];
        const participants = await validateAndFetchParticipants(participantIds, userObjectId);
        // Validate batch and coaching center using common function
        const { batch, coachingCenter } = await validateBatchAndCenter(data.batchId);
        // Validate slot availability using common function
        await validateSlotAvailability(batch, participants.length);
        // Validate participant eligibility (age, gender, disability) using common function
        await validateParticipantEligibility(participants, batch, coachingCenter);
        // Validate if participants are already enrolled in this batch
        const participantObjectIds = participants.map(p => p._id);
        await validateParticipantEnrollment(participantObjectIds, batch._id);
        // Create payment order using payment service
        const orderData = {
            amount: Math.round(summary.amount * 100), // Convert to paise (multiply by 100)
            currency: summary.currency,
            receipt: `booking_${Date.now()}_${userObjectId.toString().slice(-6)}`,
            notes: {
                userId: userId,
                participantIds: data.participantIds,
                batchId: data.batchId,
                centerId: batch.center._id?.toString() || batch.center.id,
                sportId: batch.sport._id?.toString() || batch.sport.id,
            },
        };
        const paymentOrder = await paymentService.createOrder(orderData);
        // Generate unique booking ID
        const bookingId = await (0, exports.generateBookingId)();
        // Create booking record
        const bookingData = {
            user: userObjectId,
            participants: participantObjectIds,
            batch: batch._id,
            center: batch.center._id,
            sport: batch.sport._id,
            amount: summary.amount,
            currency: summary.currency,
            status: booking_model_1.BookingStatus.PENDING,
            booking_id: bookingId,
            payment: {
                razorpay_order_id: paymentOrder.id,
                amount: summary.amount,
                currency: summary.currency,
                status: booking_model_1.PaymentStatus.PENDING,
            },
            notes: data.notes || null,
        };
        const booking = new booking_model_1.BookingModel(bookingData);
        await booking.save();
        // Create transaction record
        const transactionData = {
            booking: booking._id,
            user: userObjectId,
            razorpay_order_id: paymentOrder.id,
            type: transaction_model_1.TransactionType.PAYMENT,
            status: transaction_model_1.TransactionStatus.PENDING,
            source: transaction_model_1.TransactionSource.USER_VERIFICATION,
            amount: summary.amount,
            currency: summary.currency,
            metadata: {
                participantIds: data.participantIds,
                batchId: data.batchId,
                notes: data.notes,
            },
        };
        const transaction = new transaction_model_1.TransactionModel(transactionData);
        await transaction.save();
        logger_1.logger.info(`Booking created: ${booking.id} for user ${userId}, Transaction: ${transaction.id}`);
        // Populate booking before returning
        const populatedBooking = await booking_model_1.BookingModel.findById(booking._id)
            .populate('user', 'id firstName lastName email')
            .populate('participants', 'id firstName lastName')
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .lean();
        return {
            booking: populatedBooking,
            razorpayOrder: paymentOrder,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to create order:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new ApiError_1.ApiError(500, 'Failed to create order');
    }
};
exports.createOrder = createOrder;
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
        // Check if payment is already verified
        if (booking.payment.status === booking_model_1.PaymentStatus.SUCCESS) {
            throw new ApiError_1.ApiError(400, 'Payment has already been verified');
        }
        // Verify payment signature using payment service
        const isValidSignature = paymentService.verifyPaymentSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature);
        if (!isValidSignature) {
            logger_1.logger.warn('Payment signature verification failed', {
                bookingId: booking.id,
                userId,
                orderId: data.razorpay_order_id,
            });
            throw new ApiError_1.ApiError(400, 'Invalid payment signature');
        }
        // Fetch payment details using payment service
        const razorpayPayment = await paymentService.fetchPayment(data.razorpay_payment_id);
        // Verify payment status and amount
        if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
            throw new ApiError_1.ApiError(400, `Payment status is ${razorpayPayment.status}. Payment must be captured or authorized.`);
        }
        // Verify amount matches (convert from paise to rupees)
        const expectedAmount = Math.round(booking.amount * 100);
        if (razorpayPayment.amount !== expectedAmount) {
            logger_1.logger.error('Payment amount mismatch', {
                bookingId: booking.id,
                expected: expectedAmount,
                received: razorpayPayment.amount,
            });
            throw new ApiError_1.ApiError(400, 'Payment amount does not match booking amount');
        }
        // Update booking with payment details
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.CONFIRMED,
                'payment.razorpay_payment_id': data.razorpay_payment_id,
                'payment.razorpay_signature': data.razorpay_signature,
                'payment.status': booking_model_1.PaymentStatus.SUCCESS,
                'payment.payment_method': razorpayPayment.method || null,
                'payment.paid_at': new Date(),
            },
        }, { new: true })
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName lastName')
            .populate('batch', 'id name')
            .populate('center', 'id center_name email mobile_number')
            .populate('sport', 'id name')
            .lean();
        if (!updatedBooking) {
            throw new ApiError_1.ApiError(500, 'Failed to update booking');
        }
        // Update or create transaction record
        await transaction_model_1.TransactionModel.findOneAndUpdate({
            booking: booking._id,
            razorpay_order_id: data.razorpay_order_id,
        }, {
            $set: {
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                status: transaction_model_1.TransactionStatus.SUCCESS,
                source: transaction_model_1.TransactionSource.USER_VERIFICATION,
                payment_method: razorpayPayment.method || null,
                processed_at: new Date(),
            },
        }, { upsert: true, new: true });
        logger_1.logger.info(`Payment verified successfully for booking: ${booking.id}`);
        // Send confirmation emails to user, coaching center, and admin
        try {
            // Fetch batch details for scheduled information
            // Use the original booking's batch ID (ObjectId) before population
            const batchId = booking.batch;
            const batchDetails = await batch_model_1.BatchModel.findById(batchId).lean();
            if (!batchDetails) {
                logger_1.logger.warn(`Batch not found for booking ${booking.id}`);
            }
            else {
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
                const participantNames = updatedBooking.participants
                    .map((p) => {
                    const firstName = p.firstName || '';
                    const lastName = p.lastName || '';
                    return `${firstName} ${lastName}`.trim() || p.id || 'Participant';
                })
                    .join(', ');
                // Get user details
                const user = updatedBooking.user;
                const userName = user
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
                    : 'User';
                const userEmail = user?.email;
                const userMobile = user?.mobile;
                // Get center details
                const center = updatedBooking.center;
                const centerName = center?.center_name || 'Coaching Center';
                const centerEmail = center?.email;
                const centerMobile = center?.mobile_number;
                // Get sport and batch details
                const sport = updatedBooking.sport;
                const sportName = sport?.name || 'Sport';
                const batchName = batchDetails.name || 'Batch';
                // Prepare email data
                const emailData = {
                    bookingId: updatedBooking.id,
                    batchName,
                    sportName,
                    centerName,
                    userName,
                    userEmail: userEmail || undefined,
                    participants: participantNames,
                    startDate,
                    startTime,
                    endTime,
                    trainingDays,
                    amount: updatedBooking.amount,
                    currency: updatedBooking.currency,
                    paymentId: data.razorpay_payment_id,
                };
                // Send emails in parallel (don't wait for all to complete)
                const emailPromises = [];
                // Send email to user
                if (userEmail) {
                    emailPromises.push((0, email_service_1.sendBookingConfirmationUserEmail)(userEmail, emailData).catch((error) => {
                        logger_1.logger.error('Failed to send booking confirmation email to user', {
                            bookingId: booking.id,
                            userEmail,
                            error: error instanceof Error ? error.message : error,
                        });
                        return 'Failed';
                    }));
                }
                // Send email to coaching center
                if (centerEmail) {
                    emailPromises.push((0, email_service_1.sendBookingConfirmationCenterEmail)(centerEmail, emailData).catch((error) => {
                        logger_1.logger.error('Failed to send booking confirmation email to coaching center', {
                            bookingId: booking.id,
                            centerEmail,
                            error: error instanceof Error ? error.message : error,
                        });
                        return 'Failed';
                    }));
                }
                // Send email to admin
                if (env_1.config.admin.email) {
                    emailPromises.push((0, email_service_1.sendBookingConfirmationAdminEmail)(env_1.config.admin.email, emailData).catch((error) => {
                        logger_1.logger.error('Failed to send booking confirmation email to admin', {
                            bookingId: booking.id,
                            adminEmail: env_1.config.admin.email,
                            error: error instanceof Error ? error.message : error,
                        });
                        return 'Failed';
                    }));
                }
                // Wait for all emails to be sent (but don't fail if email sending fails)
                await Promise.allSettled(emailPromises);
                logger_1.logger.info(`Booking confirmation emails sent for booking: ${booking.id}`);
                // Prepare SMS data
                const smsData = {
                    bookingId: updatedBooking.id,
                    batchName,
                    sportName,
                    centerName,
                    userName,
                    participants: participantNames,
                    startDate,
                    startTime,
                    endTime,
                    amount: updatedBooking.amount,
                    currency: updatedBooking.currency,
                };
                // Send SMS notifications
                try {
                    // Send SMS to user
                    if (userMobile) {
                        (0, sms_service_1.sendBookingConfirmationUserSms)(userMobile, smsData);
                    }
                    else {
                        logger_1.logger.warn('User mobile number not available for SMS', {
                            bookingId: booking.id,
                        });
                    }
                    // Send SMS to coaching center
                    if (centerMobile) {
                        (0, sms_service_1.sendBookingConfirmationCenterSms)(centerMobile, smsData);
                    }
                    else {
                        logger_1.logger.warn('Coaching center mobile number not available for SMS', {
                            bookingId: booking.id,
                        });
                    }
                    logger_1.logger.info(`Booking confirmation SMS sent for booking: ${booking.id}`);
                }
                catch (smsError) {
                    // Log error but don't fail the payment verification
                    logger_1.logger.error('Error sending booking confirmation SMS', {
                        bookingId: booking.id,
                        error: smsError instanceof Error ? smsError.message : smsError,
                    });
                }
            }
        }
        catch (notificationError) {
            // Log error but don't fail the payment verification
            logger_1.logger.error('Error sending booking confirmation notifications', {
                bookingId: booking.id,
                error: notificationError instanceof Error ? notificationError.message : notificationError,
            });
        }
        return updatedBooking;
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
        // Build query
        const query = {
            user: userObjectId,
            is_deleted: false,
        };
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
        // Get bookings with populated data
        const bookings = await booking_model_1.BookingModel.find(query)
            .populate('participants', 'id firstName lastName')
            .populate('batch', 'id name scheduled duration')
            .populate({
            path: 'batch',
            populate: {
                path: 'sport',
                select: 'id name',
            },
        })
            .populate({
            path: 'batch',
            populate: {
                path: 'center',
                select: 'id center_name',
            },
        })
            .select('booking_id id participants batch amount currency status payment.status payment.payment_method payment.razorpay_order_id createdAt updatedAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalPages = Math.ceil(total / limit);
        // Transform bookings to return required fields
        const transformedBookings = bookings.map((booking) => ({
            booking_id: booking.booking_id || booking.id,
            id: booking.id,
            batch: {
                id: booking.batch?._id?.toString() || booking.batch?.id || '',
                name: booking.batch?.name || 'N/A',
                sport: {
                    id: booking.batch?.sport?._id?.toString() || booking.batch?.sport?.id || '',
                    name: booking.batch?.sport?.name || 'N/A',
                },
                center: {
                    id: booking.batch?.center?._id?.toString() || booking.batch?.center?.id || '',
                    center_name: booking.batch?.center?.center_name || 'N/A',
                },
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
            participants: (booking.participants || []).map((p) => ({
                id: p._id?.toString() || p.id || '',
                firstName: p.firstName || '',
                lastName: p.lastName || '',
            })),
            amount: booking.amount || 0,
            currency: booking.currency || 'INR',
            status: booking.status || booking_model_1.BookingStatus.PENDING,
            payment_status: booking.payment?.status || booking_model_1.PaymentStatus.PENDING,
            payment_method: booking.payment?.payment_method || null,
            invoice_id: booking.payment?.razorpay_order_id || null,
            created_at: booking.createdAt,
            updated_at: booking.updatedAt,
        }));
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
 * Delete/Cancel order and mark payment status as failed
 */
const deleteOrder = async (data, userId) => {
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
        // Check if payment is already verified/successful
        if (booking.payment.status === booking_model_1.PaymentStatus.SUCCESS) {
            throw new ApiError_1.ApiError(400, 'Cannot cancel order with successful payment. Please request a refund instead.');
        }
        // Check if payment is already failed or cancelled
        if (booking.payment.status === booking_model_1.PaymentStatus.FAILED || booking.payment.status === booking_model_1.PaymentStatus.CANCELLED) {
            throw new ApiError_1.ApiError(400, 'Order is already cancelled or failed');
        }
        // Update booking: mark payment status as failed and booking status as cancelled
        const updatedBooking = await booking_model_1.BookingModel.findByIdAndUpdate(booking._id, {
            $set: {
                status: booking_model_1.BookingStatus.CANCELLED,
                'payment.status': booking_model_1.PaymentStatus.FAILED,
                'payment.failure_reason': 'Order cancelled by user',
            },
        }, { new: true })
            .populate('user', 'id firstName lastName email')
            .populate('participants', 'id firstName lastName')
            .populate('batch', 'id name')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
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
                status: transaction_model_1.TransactionStatus.FAILED,
                source: transaction_model_1.TransactionSource.USER_VERIFICATION,
            },
        }, { upsert: false } // Don't create if doesn't exist
        );
        logger_1.logger.info(`Order cancelled: ${booking.id} for user ${userId}, Razorpay Order ID: ${data.razorpay_order_id}`);
        return updatedBooking;
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
//# sourceMappingURL=booking.service.js.map