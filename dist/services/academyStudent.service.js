"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAcademyEnrolledStudentDetail = exports.getAcademyEnrolledStudents = void 0;
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../models/booking.model");
const coachingCenter_model_1 = require("../models/coachingCenter.model");
const logger_1 = require("../utils/logger");
const ApiError_1 = require("../utils/ApiError");
const i18n_1 = require("../utils/i18n");
const userCache_1 = require("../utils/userCache");
const booking_service_1 = require("./booking.service");
/**
 * Calculate age from date of birth (helper wrapper)
 */
const calculateAgeFromDob = (dob) => {
    if (!dob)
        return null;
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(birthDate.getTime()))
        return null;
    const today = new Date();
    return (0, booking_service_1.calculateAge)(birthDate, today);
};
/**
 * Get all enrolled students for academy (grouped by participant, no duplicates)
 */
const getAcademyEnrolledStudents = async (userId, params = {}) => {
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
        // Build query for bookings
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
        // Get all bookings matching the query
        const bookings = await booking_model_1.BookingModel.find(query)
            .populate('user', 'id firstName lastName email mobile')
            .populate('participants', 'id firstName lastName gender dob schoolName contactNumber profilePhoto')
            .populate('batch', 'id name sport center scheduled')
            .populate('center', 'id center_name')
            .populate('sport', 'id name')
            .sort({ createdAt: -1 })
            .lean();
        // Group by participant (avoid duplicates)
        const participantMap = new Map();
        for (const booking of bookings) {
            const bookingData = booking;
            // Process each participant in the booking
            const participants = Array.isArray(bookingData.participants)
                ? bookingData.participants
                : [bookingData.participants];
            for (const participant of participants) {
                if (!participant)
                    continue;
                const participantId = (participant.id || participant._id?.toString() || '').toString();
                if (!participantId)
                    continue;
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
                const student = participantMap.get(participantId);
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
                    bookingStatus: bookingData.status,
                    paymentStatus: bookingData.payment?.status,
                    enrolledDate: bookingData.createdAt || new Date(),
                    amount: bookingData.amount || 0,
                };
                // Check if this batch is already added (avoid duplicates)
                const batchExists = student.batches.some(b => b.batchId === batchInfo.batchId && b.bookingId === batchInfo.bookingId);
                if (!batchExists) {
                    student.batches.push(batchInfo);
                    student.totalEnrollments++;
                    if (batchInfo.bookingStatus === booking_model_1.BookingStatus.CONFIRMED) {
                        student.activeEnrollments++;
                    }
                }
            }
        }
        // Convert map to array and calculate overall status
        let students = Array.from(participantMap.values()).map(student => {
            // Determine overall status based on batch statuses
            const hasActive = student.batches.some(b => b.bookingStatus === booking_model_1.BookingStatus.CONFIRMED);
            const hasCompleted = student.batches.some(b => b.bookingStatus === booking_model_1.BookingStatus.COMPLETED);
            const hasCancelled = student.batches.some(b => b.bookingStatus === booking_model_1.BookingStatus.CANCELLED);
            if (hasActive) {
                student.overallStatus = 'active';
            }
            else if (hasCompleted) {
                student.overallStatus = 'completed';
            }
            else if (hasCancelled) {
                student.overallStatus = 'left';
            }
            else {
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
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get enrolled students:', {
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get enrolled students');
    }
};
exports.getAcademyEnrolledStudents = getAcademyEnrolledStudents;
/**
 * Get detailed information about a specific enrolled student
 */
const getAcademyEnrolledStudentDetail = async (participantId, userId) => {
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
            throw new ApiError_1.ApiError(404, 'Student not found');
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Validate participant ID
        if (!mongoose_1.Types.ObjectId.isValid(participantId)) {
            throw new ApiError_1.ApiError(400, 'Invalid participant ID');
        }
        const participantObjectId = new mongoose_1.Types.ObjectId(participantId);
        // Get all bookings for this participant
        const bookings = await booking_model_1.BookingModel.find({
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
            throw new ApiError_1.ApiError(404, 'Student not found or does not belong to your coaching centers');
        }
        // Get participant details from first booking
        const firstBooking = bookings[0];
        const participant = Array.isArray(firstBooking.participants)
            ? firstBooking.participants.find((p) => (p.id || p._id?.toString()) === participantId)
            : firstBooking.participants;
        if (!participant) {
            throw new ApiError_1.ApiError(404, 'Participant not found');
        }
        const dob = participant.dob ? (typeof participant.dob === 'string' ? new Date(participant.dob) : participant.dob) : null;
        // Build detailed batches array
        const detailedBatches = bookings.map((booking) => {
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
                    status: booking.status,
                    payment: {
                        status: booking.payment?.status,
                        amount: booking.payment?.amount || 0,
                        currency: booking.payment?.currency || 'INR',
                        payment_method: booking.payment?.payment_method || null,
                        paid_at: booking.payment?.paid_at || null,
                    },
                    amount: booking.amount || 0,
                    currency: booking.currency || 'INR',
                    notes: booking.notes || null,
                    createdAt: booking.createdAt || new Date(),
                    updatedAt: booking.updatedAt || new Date(),
                },
                enrolledDate: booking.createdAt || new Date(),
            };
        });
        // Calculate overall status
        const hasActive = detailedBatches.some(b => b.booking.status === booking_model_1.BookingStatus.CONFIRMED);
        const hasCompleted = detailedBatches.some(b => b.booking.status === booking_model_1.BookingStatus.COMPLETED);
        const hasCancelled = detailedBatches.some(b => b.booking.status === booking_model_1.BookingStatus.CANCELLED);
        let overallStatus = 'pending';
        if (hasActive) {
            overallStatus = 'active';
        }
        else if (hasCompleted) {
            overallStatus = 'completed';
        }
        else if (hasCancelled) {
            overallStatus = 'left';
        }
        const activeEnrollments = detailedBatches.filter(b => b.booking.status === booking_model_1.BookingStatus.CONFIRMED).length;
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
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        logger_1.logger.error('Failed to get enrolled student detail:', {
            error: error instanceof Error ? error.message : error,
        });
        throw new ApiError_1.ApiError(500, 'Failed to get enrolled student detail');
    }
};
exports.getAcademyEnrolledStudentDetail = getAcademyEnrolledStudentDetail;
//# sourceMappingURL=academyStudent.service.js.map